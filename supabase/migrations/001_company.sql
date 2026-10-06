begin;
create table public.teams(id uuid primary key default gen_random_uuid(),name text not null unique check(length(name) between 1 and 80),created_at timestamptz not null default now());
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,member_identifier text not null unique check(member_identifier ~ '^[a-z0-9][a-z0-9_-]{2,39}$'),display_name text not null check(length(display_name) between 1 and 80),team_id uuid not null references public.teams(id),avatar_path text,is_active boolean not null default true,created_at timestamptz not null default now());
create table public.posts(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,image_path text not null unique,image_width integer not null check(image_width between 1 and 2048),image_height integer not null check(image_height between 1 and 2048),created_at timestamptz not null default now(),check(image_path = user_id::text || '/' || id::text || '.jpg'));
create table public.likes(post_id uuid not null references public.posts(id) on delete cascade,user_id uuid not null references public.profiles(id) on delete cascade,created_at timestamptz not null default now(),primary key(post_id,user_id));
create index posts_feed on public.posts(created_at desc,id desc);
create index posts_user_feed on public.posts(user_id,created_at desc,id desc);
create index profiles_team on public.profiles(team_id);
create index likes_user on public.likes(user_id,post_id);
create extension if not exists pg_trgm with schema extensions;
create index profiles_search on public.profiles using gin(display_name extensions.gin_trgm_ops);

-- Only this predicate bypasses profile RLS, to avoid recursive policy evaluation.
create function public.is_active_member() returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.profiles where id=(select auth.uid()) and is_active); $$;
revoke all on function public.is_active_member() from public,anon;
grant execute on function public.is_active_member() to authenticated;
alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
revoke all on public.teams,public.profiles,public.posts,public.likes from anon,authenticated;
grant all on public.teams,public.profiles,public.posts,public.likes to service_role;
grant select on public.teams,public.profiles,public.posts,public.likes to authenticated;
grant insert on public.posts,public.likes to authenticated;
grant delete on public.likes to authenticated;
create policy teams_read on public.teams for select to authenticated using((select public.is_active_member()));
create policy profiles_read on public.profiles for select to authenticated using((select public.is_active_member()));
create policy posts_read on public.posts for select to authenticated using((select public.is_active_member()));
create policy likes_read on public.likes for select to authenticated using((select public.is_active_member()));
create policy posts_insert on public.posts for insert to authenticated with check((select public.is_active_member()) and user_id=(select auth.uid()) and exists(select 1 from storage.objects where bucket_id='company-photos' and name=image_path));
create policy likes_insert on public.likes for insert to authenticated with check((select public.is_active_member()) and user_id=(select auth.uid()));
create policy likes_delete on public.likes for delete to authenticated using((select public.is_active_member()) and user_id=(select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('company-photos','company-photos',false,15728640,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy photos_read on storage.objects for select to authenticated using(bucket_id='company-photos' and (select public.is_active_member()));
create policy photos_insert on storage.objects for insert to authenticated with check(bucket_id='company-photos' and (select public.is_active_member()) and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f-]{36}\.jpg$'));
-- Cleanup is permitted only before the object is linked to a post.
create policy photos_cleanup on storage.objects for delete to authenticated using(bucket_id='company-photos' and (select public.is_active_member()) and (storage.foldername(name))[1]=(select auth.uid())::text and not exists(select 1 from public.posts where image_path=name));

create function public.photo_feed(p_team uuid default null,p_user uuid default null,p_before_time timestamptz default null,p_before_id uuid default null,p_limit integer default 20)
returns table(id uuid,user_id uuid,image_path text,image_width integer,image_height integer,created_at timestamptz,display_name text,team_name text,avatar_path text,like_count bigint,liked boolean)
language sql stable security invoker set search_path='' as $$
select p.id,p.user_id,p.image_path,p.image_width,p.image_height,p.created_at,u.display_name,t.name,u.avatar_path,
(select count(*) from public.likes l where l.post_id=p.id),exists(select 1 from public.likes l where l.post_id=p.id and l.user_id=(select auth.uid()))
from public.posts p join public.profiles u on u.id=p.user_id join public.teams t on t.id=u.team_id
where (p_team is null or u.team_id=p_team) and (p_user is null or p.user_id=p_user) and (p_before_time is null or (p.created_at,p.id)<(p_before_time,p_before_id))
order by p.created_at desc,p.id desc limit greatest(1,least(p_limit,20)); $$;
revoke all on function public.photo_feed(uuid,uuid,timestamptz,uuid,integer) from public,anon;
grant execute on function public.photo_feed(uuid,uuid,timestamptz,uuid,integer) to authenticated;
commit;
