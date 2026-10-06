-- For the inspected legacy schema ONLY. Preserves every old table and record.
begin;
do $$ begin
if exists(select 1 from public.posts) or exists(select 1 from public.likes) then raise exception 'Legacy photos or likes exist; migrate them before proceeding'; end if;
end $$;
create schema company_legacy;
revoke all on schema company_legacy from public,anon,authenticated;
alter table public.teams set schema company_legacy;
alter table public.members set schema company_legacy;
alter table public.posts set schema company_legacy;
alter table public.likes set schema company_legacy;
revoke all on all tables in schema company_legacy from anon,authenticated;
commit;
