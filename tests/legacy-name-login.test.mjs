import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { readFile } from "node:fs/promises";
it("preserves the legacy directory and never re-enables disabled linked members", async () => {
  const db = new PGlite({ extensions: { pg_trgm } });
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create schema extensions;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,storage to anon,authenticated,service_role;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant select,insert,delete on storage.objects to authenticated;create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
create table public.teams(id uuid primary key,name text,created_at timestamp);create table public.members(id uuid primary key,name text,team_id uuid references public.teams(id),profile_image text,created_at timestamp);create table public.posts(id uuid primary key,user_id uuid references public.members(id),image_url text,created_at timestamp);create table public.likes(id uuid primary key,post_id uuid references public.posts(id),user_id uuid references public.members(id),created_at timestamp);
insert into public.teams values('11111111-1111-4111-8111-111111111111','צוות לדוגמה',now());insert into public.members values('22222222-2222-4222-8222-222222222222','חבר לדוגמה','11111111-1111-4111-8111-111111111111',null,now());`);
    let sql = "begin;";
    for (const path of [
      "supabase/prepare-existing-project.sql",
      "supabase/migrations/001_company.sql",
      "supabase/migrations/002_name_login_directory.sql",
      "supabase/import-existing-members.sql",
    ])
      sql += (await readFile(path, "utf8"))
        .replace(/^begin;\r?$/gm, "")
        .replace(/^commit;\r?$/gm, "");
    sql += "commit;";
    await db.exec(sql);
    expect(
      (await db.query("select count(*) as n from company_legacy.members"))
        .rows[0].n,
    ).toBe(1);
    expect(
      (await db.query("select count(*) as n from public.pending_members"))
        .rows[0].n,
    ).toBe(1);
    await db.exec("set role anon");
    await expect(
      db.query("select * from public.name_login_directory()"),
    ).rejects.toThrow();
    await db.exec("reset role;set role service_role");
    expect(
      (await db.query("select * from public.name_login_directory()")).rows
        .length,
    ).toBe(1);
    await db.exec("reset role");
    await db.exec(
      `insert into auth.users values('33333333-3333-4333-8333-333333333333');insert into public.profiles(id,member_identifier,display_name,team_id,pending_member_id) values('33333333-3333-4333-8333-333333333333','test-member','חבר לדוגמה','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');`,
    );
    expect(
      (await db.query("select * from public.name_login_directory()")).rows
        .length,
    ).toBe(1);
    expect(
      (
        await db.query(
          "select * from public.name_login_member('22222222-2222-4222-8222-222222222222')",
        )
      ).rows[0].profile_id,
    ).toBe("33333333-3333-4333-8333-333333333333");
    await db.exec("update public.profiles set is_active=false");
    expect(
      (await db.query("select * from public.name_login_directory()")).rows
        .length,
    ).toBe(0);
    expect(
      (
        await db.query(
          "select * from public.name_login_member('22222222-2222-4222-8222-222222222222')",
        )
      ).rows.length,
    ).toBe(0);
  } finally {
    await db.close();
  }
}, 30000);
