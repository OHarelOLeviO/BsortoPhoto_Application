import { createClient } from "@supabase/supabase-js";
export function adminClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error("Missing local admin environment");
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function checked(promise) {
  const result = await promise;
  if (result.error)
    throw new Error(
      "Supabase operation failed; check project configuration and permissions.",
    );
  return result.data;
}
export function identifier(value) {
  const id = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,39}$/.test(id))
    throw new Error("Invalid member identifier");
  return id;
}
export function email(id) {
  const domain = process.env.AUTH_EMAIL_DOMAIN;
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain))
    throw new Error("Missing or invalid AUTH_EMAIL_DOMAIN");
  return `${identifier(id)}@${domain.toLowerCase()}`;
}
export async function allUsers(client) {
  const users = [];
  for (let page = 1; ; page++) {
    const data = await checked(
      client.auth.admin.listUsers({ page, perPage: 1000 }),
    );
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}
