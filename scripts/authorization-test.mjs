import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { adminClient, checked } from "./admin-client.mjs";
const admin = adminClient();
const clients = [];
const users = [];
const paths = [];
let team;
const client = () =>
  createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const image = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/EH//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/EH//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/EH//2Q==",
  "base64",
);
async function unreadable(c) {
  for (const table of ["teams", "profiles", "posts", "likes"]) {
    const result = await c.from(table).select("*");
    assert(
      result.error || result.data.length === 0,
      `${table} must be protected`,
    );
  }
  const result = await c.rpc("photo_feed");
  assert(result.error || result.data.length === 0, "RPC must be protected");
  const url = await c.storage
    .from("company-photos")
    .createSignedUrl(paths[0], 30);
  assert(url.error, "Signing must be protected");
  const download = await c.storage.from("company-photos").download(paths[0]);
  assert(download.error, "Private download must be protected");
}
try {
  assert(process.env.SUPABASE_PUBLISHABLE_KEY, "Missing public key");
  team = await checked(
    admin
      .from("teams")
      .insert({ name: `test-${randomUUID()}` })
      .select("id")
      .single(),
  );
  for (let i = 0; i < 2; i++) {
    const password = randomBytes(24).toString("base64url");
    const email = `test-${randomUUID()}@example.invalid`;
    const account = await checked(
      admin.auth.admin.createUser({ email, password, email_confirm: true }),
    );
    users.push(account.user.id);
    await checked(
      admin.from("profiles").insert({
        id: account.user.id,
        member_identifier: `test-${randomBytes(8).toString("hex")}`,
        display_name: `חבר בדיקה ${i}`,
        team_id: team.id,
      }),
    );
    const c = client();
    await checked(c.auth.signInWithPassword({ email, password }));
    clients.push(c);
  }
  const [a, b] = clients;
  const [aId, bId] = users;
  const postId = randomUUID();
  paths.push(`${aId}/${postId}.jpg`);
  await checked(
    a.storage
      .from("company-photos")
      .upload(paths[0], image, { contentType: "image/jpeg" }),
  );
  await checked(
    a.from("posts").insert({
      id: postId,
      user_id: aId,
      image_path: paths[0],
      image_width: 1,
      image_height: 1,
    }),
  );
  await unreadable(client());
  assert(
    (
      await a.from("posts").insert({
        id: randomUUID(),
        user_id: bId,
        image_path: `${bId}/${randomUUID()}.jpg`,
        image_width: 1,
        image_height: 1,
      })
    ).error,
    "Cannot impersonate post owner",
  );
  assert(
    (await a.from("likes").insert({ post_id: postId, user_id: bId })).error,
    "Cannot impersonate liker",
  );
  await checked(b.from("likes").insert({ post_id: postId, user_id: bId }));
  await checked(
    a.from("likes").delete().eq("post_id", postId).eq("user_id", bId),
  );
  assert.equal(
    (await checked(b.from("likes").select("*").eq("post_id", postId))).length,
    1,
    "Cannot remove another like",
  );
  assert(
    (await b.from("likes").insert({ post_id: postId, user_id: bId })).error,
    "Duplicate prevented",
  );
  await checked(
    a
      .from("likes")
      .upsert({ post_id: postId, user_id: aId }, { ignoreDuplicates: true }),
  );
  await checked(
    a
      .from("likes")
      .upsert({ post_id: postId, user_id: aId }, { ignoreDuplicates: true }),
  );
  assert.equal(
    (await checked(a.from("likes").select("*").eq("post_id", postId))).length,
    2,
  );
  await checked(
    a.from("likes").delete().eq("post_id", postId).eq("user_id", aId),
  );
  const foreignPath = `${bId}/${randomUUID()}.jpg`;
  const foreign = await a.storage
    .from("company-photos")
    .upload(foreignPath, image, { contentType: "image/jpeg" });
  if (!foreign.error) paths.push(foreignPath);
  assert(foreign.error, "Foreign folder rejected");
  assert(
    (
      await a
        .from("profiles")
        .update({ team_id: team.id, is_active: false })
        .eq("id", aId)
    ).error,
    "Profile edits rejected",
  );
  assert(
    (
      await a.storage
        .from("company-photos")
        .upload(paths[0], image, { upsert: true, contentType: "image/jpeg" })
    ).error,
    "Overwrite rejected",
  );
  const orphan = `${aId}/${randomUUID()}.jpg`;
  paths.push(orphan);
  await checked(
    a.storage
      .from("company-photos")
      .upload(orphan, image, { contentType: "image/jpeg" }),
  );
  await checked(a.storage.from("company-photos").remove([orphan]));
  const rows = await checked(a.rpc("photo_feed", { p_team: team.id }));
  assert.equal(rows.length, 1);
  assert.equal(Number(rows[0].like_count), 1);
  await checked(
    admin.from("profiles").update({ is_active: false }).eq("id", aId),
  );
  await unreadable(a);
  assert(
    (await a.from("likes").insert({ post_id: postId, user_id: aId })).error,
    "Inactive write rejected",
  );
  console.log(
    "PASS: two-member database/storage authorization and persistent upload/like flow",
  );
} catch (e) {
  console.error("FAIL:", e.message);
  process.exitCode = 1;
} finally {
  if (paths.length) await admin.storage.from("company-photos").remove(paths);
  for (const id of users) await admin.auth.admin.deleteUser(id);
  if (team) await admin.from("teams").delete().eq("id", team.id);
}
