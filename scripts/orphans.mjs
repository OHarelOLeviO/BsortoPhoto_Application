import { adminClient, checked } from "./admin-client.mjs";
const client = adminClient();
const remove = process.argv.includes("--delete");
try {
  const posts = new Set();
  const candidates = [];
  for (let offset = 0; ; offset += 1000) {
    const data = await checked(
      client
        .from("posts")
        .select("image_path")
        .range(offset, offset + 999),
    );
    for (const p of data) posts.add(p.image_path);
    if (data.length < 1000) break;
  }
  for (let offset = 0; ; offset += 1000) {
    const profiles = await checked(
      client
        .from("profiles")
        .select("avatar_path")
        .order("id")
        .range(offset, offset + 999),
    );
    for (const p of profiles) if (p.avatar_path) posts.add(p.avatar_path);
    if (profiles.length < 1000) break;
  }
  const bucket = client.storage.from("company-photos");
  for (let offset = 0; ; offset += 1000) {
    const folders = await checked(bucket.list("", { limit: 1000, offset }));
    for (const folder of folders) {
      if (folder.id) continue;
      for (let inner = 0; ; inner += 1000) {
        const files = await checked(
          bucket.list(folder.name, { limit: 1000, offset: inner }),
        );
        for (const file of files) {
          const path = `${folder.name}/${file.name}`;
          if (
            file.id &&
            !posts.has(path) &&
            Date.parse(file.created_at) < Date.now() - 86400000
          ) {
            candidates.push(path);
          }
        }
        if (files.length < 1000) break;
      }
    }
    if (folders.length < 1000) break;
  }
  for (const path of candidates) {
    console.log(
      remove ? "Checking orphan for removal" : "Orphan candidate",
      path,
    );
    if (remove) {
      const linked = await checked(
        client.from("posts").select("id").eq("image_path", path).maybeSingle(),
      );
      const avatar = await checked(
        client.from("profiles").select("id").eq("avatar_path", path).limit(1),
      );
      if (!linked && !avatar.length) await checked(bucket.remove([path]));
    }
  }
} catch {
  console.error("Orphan scan failed. Check configuration.");
  process.exitCode = 1;
}
