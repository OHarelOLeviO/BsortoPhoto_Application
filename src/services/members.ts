import { supabase } from "./client";
export type DirectoryMember = {
  id: string;
  pending_member_id: string | null;
  display_name: string;
  team_name: string;
  team_id: string;
  avatar_path: string | null;
};
export async function listMembers() {
  const result: DirectoryMember[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .rpc("member_directory")
      .range(offset, offset + 999);
    if (error) throw error;
    result.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const c = new Intl.Collator("he", { numeric: true });
  return result.sort(
    (a, b) =>
      c.compare(a.team_name, b.team_name) ||
      c.compare(a.display_name, b.display_name) ||
      a.id.localeCompare(b.id),
  );
}
export async function getMember(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid member");
  const { data, error } = await supabase
    .rpc("member_directory")
    .or(`id.eq.${id},pending_member_id.eq.${id}`)
    .single();
  if (error) throw error;
  return data as DirectoryMember;
}
