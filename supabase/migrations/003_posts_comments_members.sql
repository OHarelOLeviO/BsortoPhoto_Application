begin;
-- Existing posts receive an empty description; comments start as an empty table.
alter table public.posts add column description text not null default '' check (length(description)<=2000);
grant delete on public.posts to authenticated;
create policy posts_delete on public.posts for delete to authenticated using ((select public.is_active_member()) and user_id=(select auth.uid()));
create table public.comments (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.posts(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(length(btrim(body)) between 1 and 1000),
 created_at timestamptz not null default now()
);
create index comments_post on public.comments(post_id,created_at,id);
alter table public.comments enable row level security;
revoke all on public.comments from public,anon,authenticated;
grant all on public.comments to service_role;
grant select,insert on public.comments to authenticated;
create policy comments_read on public.comments for select to authenticated using ((select public.is_active_member()));
create policy comments_insert on public.comments for insert to authenticated with check ((select public.is_active_member()) and user_id=(select auth.uid()));
drop function public.photo_feed(uuid,uuid,timestamptz,uuid,integer);
create function public.photo_feed(p_team uuid default null,p_user uuid default null,p_before_time timestamptz default null,p_before_id uuid default null,p_limit integer default 20)
returns table(id uuid,user_id uuid,image_path text,image_width integer,image_height integer,created_at timestamptz,display_name text,team_name text,avatar_path text,like_count bigint,liked boolean,description text,comment_count bigint)
language sql stable security invoker set search_path='' as $$
select p.id,p.user_id,p.image_path,p.image_width,p.image_height,p.created_at,u.display_name,t.name,u.avatar_path,
(select count(*) from public.likes l where l.post_id=p.id),exists(select 1 from public.likes l where l.post_id=p.id and l.user_id=(select auth.uid())),p.description,(select count(*) from public.comments c where c.post_id=p.id)
from public.posts p join public.profiles u on u.id=p.user_id join public.teams t on t.id=u.team_id
where (p_team is null or u.team_id=p_team) and (p_user is null or p.user_id=p_user) and (p_before_time is null or (p.created_at,p.id)<(p_before_time,p_before_id))
order by p.created_at desc,p.id desc limit greatest(1,least(p_limit,20)); $$;
revoke all on function public.photo_feed(uuid,uuid,timestamptz,uuid,integer) from public,anon;
grant execute on function public.photo_feed(uuid,uuid,timestamptz,uuid,integer) to authenticated;
-- Include imported members without creating Auth accounts just to view a profile.
create function public.member_directory() returns table(id uuid,pending_member_id uuid,display_name text,team_name text,team_id uuid,avatar_path text)
language sql stable security definer set search_path='' as $$
select q.id,q.pending_member_id,q.display_name,t.name,q.team_id,q.avatar_path from (
select p.id,p.pending_member_id,p.display_name,p.team_id,p.avatar_path from public.profiles p where p.is_active
union all select m.id,m.id,m.display_name,m.team_id,null::text from public.pending_members m where not exists(select 1 from public.profiles p where p.pending_member_id=m.id)
) q join public.teams t on t.id=q.team_id where (select public.is_active_member()) order by t.name,q.display_name,q.id; $$;
revoke all on function public.member_directory() from public,anon;
grant execute on function public.member_directory() to authenticated;
commit;
