begin;
create table public.pending_members(id uuid primary key,display_name text not null check(length(display_name) between 1 and 80),team_id uuid not null references public.teams(id));
alter table public.pending_members enable row level security;
revoke all on public.pending_members from anon,authenticated;
grant all on public.pending_members to service_role;
alter table public.profiles add column pending_member_id uuid unique references public.pending_members(id);
-- An old member remains in the name picker until an Auth-linked profile is created.
create function public.name_login_directory(p_page integer default 0) returns table(id uuid,display_name text,team_name text)
language sql stable security invoker set search_path='' as $$
select q.id,q.display_name,t.name from (
select p.id,p.display_name,p.team_id from public.profiles p where p.is_active
union all select m.id,m.display_name,m.team_id from public.pending_members m where not exists(select 1 from public.profiles p where p.pending_member_id=m.id)
) q join public.teams t on t.id=q.team_id order by q.display_name,q.id limit 1000 offset greatest(0,p_page)*1000; $$;
create function public.name_login_member(p_id uuid) returns table(profile_id uuid,pending_id uuid,display_name text,team_id uuid)
language sql stable security invoker set search_path='' as $$
select p.id,p.pending_member_id,p.display_name,p.team_id from public.profiles p where (p.id=p_id or p.pending_member_id=p_id) and p.is_active
union all select null::uuid,m.id,m.display_name,m.team_id from public.pending_members m where m.id=p_id and not exists(select 1 from public.profiles p where p.pending_member_id=m.id); $$;
revoke all on function public.name_login_directory(integer),public.name_login_member(uuid) from public,anon,authenticated;
grant execute on function public.name_login_directory(integer),public.name_login_member(uuid) to service_role;
commit;
