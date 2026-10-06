begin;
insert into public.teams(id,name,created_at) select id,name,coalesce(created_at at time zone 'UTC',now()) from company_legacy.teams;
insert into public.pending_members(id,display_name,team_id) select id,name,team_id from company_legacy.members;
commit;
