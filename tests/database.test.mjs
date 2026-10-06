import { beforeAll, afterAll, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
const db = new PGlite({ extensions: { pg_trgm } });
const a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222",
  p = "33333333-3333-4333-8333-333333333333",
  t = "44444444-4444-4444-8444-444444444444";
beforeAll(async () => {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create schema extensions;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,storage to anon,authenticated,service_role;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;grant select,insert,delete on storage.objects to authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;`);
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/001_company.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    `insert into auth.users values('${a}'),('${b}');insert into public.teams(id,name) values('${t}','צוות בדיקה');insert into public.profiles(id,member_identifier,display_name,team_id) values('${a}','test-aaa','נועם','${t}'),('${b}','test-bbb','תמר','${t}');`,
  );
}, 30000);
afterAll(() => db.close());
async function asMember(id) {
  await db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
  );
}
it("runs the actual migration and denies unauthenticated directory access", async () => {
  await db.exec("set role anon");
  await expect(db.query("select * from public.profiles")).rejects.toThrow();
  await expect(db.query("select * from public.photo_feed()")).rejects.toThrow();
  await db.exec("reset role");
});
it("enforces ownership, private object paths, counts and active-member checks", async () => {
  await asMember(a);
  expect((await db.query("select * from public.profiles")).rows.length).toBe(2);
  await expect(
    db.query(
      `insert into storage.objects(bucket_id,name) values('company-photos','${b}/${p}.jpg')`,
    ),
  ).rejects.toThrow();
  await db.query(
    `insert into storage.objects(bucket_id,name) values('company-photos','${a}/${p}.jpg')`,
  );
  await db.query(
    `insert into public.posts(id,user_id,image_path,image_width,image_height) values('${p}','${a}','${a}/${p}.jpg',10,20)`,
  );
  await expect(
    db.query(`insert into public.likes(post_id,user_id) values('${p}','${b}')`),
  ).rejects.toThrow();
  await expect(
    db.query(`update public.profiles set is_active=false where id='${a}'`),
  ).rejects.toThrow();
  await asMember(b);
  await db.query(
    `insert into public.likes(post_id,user_id) values('${p}','${b}')`,
  );
  await expect(
    db.query(`insert into public.likes(post_id,user_id) values('${p}','${b}')`),
  ).rejects.toThrow();
  await asMember(a);
  await db.query(`delete from public.likes where user_id='${b}'`);
  const rows = (await db.query("select * from public.photo_feed()")).rows;
  expect(Number(rows[0].like_count)).toBe(1);
  expect(rows[0].liked).toBe(false);
  expect(
    (await db.query(`select * from public.photo_feed('${t}')`)).rows.length,
  ).toBe(1);
  await db.exec(
    `reset role;update public.profiles set is_active=false where id='${a}';`,
  );
  await asMember(a);
  for (const table of ["teams", "profiles", "posts", "likes"])
    expect((await db.query(`select * from public.${table}`)).rows).toEqual([]);
  expect((await db.query("select * from storage.objects")).rows).toEqual([]);
  expect((await db.query("select * from public.photo_feed()")).rows).toEqual(
    [],
  );
  await expect(
    db.query(`insert into public.likes(post_id,user_id) values('${p}','${a}')`),
  ).rejects.toThrow();
  await db.exec("reset role");
});
it("uses deterministic cursors, server team filters and current uploader team", async () => {
  await db.exec("reset role");
  const extra = "55555555-5555-4555-8555-555555555555";
  await db.exec(
    `insert into public.teams(id,name) values('${extra}','צוות שני');update public.profiles set team_id='${extra}' where id='${b}'`,
  );
  for (let i = 1; i <= 25; i++) {
    const id = `66666666-6666-4666-8666-${String(i).padStart(12, "0")}`;
    await db.query(
      `insert into public.posts(id,user_id,image_path,image_width,image_height,created_at) values('${id}','${b}','${b}/${id}.jpg',10,10,'2026-01-01T00:00:00Z')`,
    );
  }
  await asMember(b);
  const first = (await db.query(`select * from public.photo_feed('${extra}')`))
    .rows;
  expect(first.length).toBe(20);
  expect(first.every((p) => p.user_id === b)).toBe(true);
  const cursor = first.at(-1);
  const second = (
    await db.query(`select * from public.photo_feed($1,null,$2,$3)`, [
      extra,
      cursor.created_at,
      cursor.id,
    ])
  ).rows;
  expect(second.length).toBe(5);
  expect(new Set([...first, ...second].map((p) => p.id)).size).toBe(25);
  expect(
    (
      await db.query(
        `select count(*) as n from public.posts where user_id='${b}'`,
      )
    ).rows[0].n,
  ).toBe(25);
  await db.exec(
    `reset role;update public.profiles set team_id='${t}' where id='${b}';`,
  );
  await asMember(b);
  expect(
    (await db.query(`select * from public.photo_feed('${extra}')`)).rows.length,
  ).toBe(0);
  await db.exec("reset role");
});
