import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { createNameLoginHandler } from "./handler.ts";
const url = Deno.env.get("SUPABASE_URL")!;
const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const handler = createNameLoginHandler({
  allowedOrigins: (
    Deno.env.get("ALLOWED_ORIGINS") ||
    "https://oharelolevio.github.io,http://localhost:5173,http://127.0.0.1:5173"
  )
    .split(",")
    .map((x) => x.trim()),
  list: async (page) => {
    const size = 1000;
    const { data, error } = await admin.rpc("name_login_directory", {
      p_page: page,
    });
    if (error) throw error;
    const members = data || [];
    return { members, nextPage: members.length === size ? page + 1 : null };
  },
  token: async (id) => {
    const { data: profile, error } = await admin
      .rpc("name_login_member", { p_id: id })
      .single();
    if (error || !profile) throw new Error("Member unavailable");
    let profileId = profile.profile_id as string | null;
    if (!profileId) {
      const identifier = "m" + String(profile.pending_id).replaceAll("-", "");
      const email =
        identifier +
        "@" +
        (Deno.env.get("AUTH_EMAIL_DOMAIN") || "members.example.invalid");
      const findAccount = async () => {
        for (let page = 1; ; page++) {
          const { data, error } = await admin.auth.admin.listUsers({
            page,
            perPage: 1000,
          });
          if (error) throw error;
          const found = data.users.find((u) => u.email === email);
          if (found) return found;
          if (data.users.length < 1000) return null;
        }
      };
      let account = await findAccount();
      if (!account) {
        const bytes = crypto.getRandomValues(new Uint8Array(32));
        const password = Array.from(bytes, (b) =>
          b.toString(16).padStart(2, "0"),
        ).join("");
        const created = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (created.error) {
          account = await findAccount();
          if (!account) throw created.error;
        } else account = created.data.user;
      }
      const inserted = await admin
        .from("profiles")
        .upsert(
          {
            id: account.id,
            member_identifier: identifier,
            display_name: profile.display_name,
            team_id: profile.team_id,
            pending_member_id: profile.pending_id,
          },
          { onConflict: "pending_member_id", ignoreDuplicates: true },
        );
      if (inserted.error) throw inserted.error;
      const resolved = await admin
        .rpc("name_login_member", { p_id: id })
        .single();
      if (resolved.error || !resolved.data?.profile_id)
        throw new Error("Member unavailable");
      profileId = resolved.data.profile_id;
    }
    const { data: account, error: accountError } =
      await admin.auth.admin.getUserById(profileId!);
    if (accountError || !account.user.email)
      throw new Error("Account unavailable");
    const { data: link, error: linkError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email: account.user.email,
      });
    if (
      linkError ||
      !link.properties.hashed_token ||
      link.user.id !== profileId
    )
      throw new Error("Sign-in unavailable");
    return link.properties.hashed_token;
  },
});
Deno.serve(handler);
