import { supabase } from "./client";
export type MemberChoice = {
  id: string;
  display_name: string;
  team_name: string;
};
export async function listLoginMembers(signal?: AbortSignal) {
  const members: MemberChoice[] = [];
  for (let page = 0; ; page++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const { data, error } = await supabase.functions.invoke("name-login", {
      body: { action: "list", page },
      signal,
    });
    if (error || !data || !Array.isArray(data.members))
      throw new Error("לא ניתן לטעון את השמות. נסה שוב.");
    members.push(...data.members);
    if (data.nextPage === null) {
      const collator = new Intl.Collator("he", { numeric: true });
      return members.sort((a, b) =>
        collator.compare(a.team_name, b.team_name) ||
        collator.compare(a.display_name, b.display_name) ||
        a.id.localeCompare(b.id),
      );
    }
  }
}
export async function loginAsMember(profileId: string) {
  const { data, error } = await supabase.functions.invoke("name-login", {
    body: { action: "login", profileId },
  });
  if (error || !data?.token_hash)
    throw new Error("הכניסה נכשלה. נסה שוב או פנה למנהל האתר.");
  const verified = await supabase.auth.verifyOtp({
    token_hash: data.token_hash,
    type: "magiclink",
  });
  if (verified.error || !verified.data.session)
    throw new Error("הכניסה נכשלה. נסה שוב.");
  return verified.data.session;
}
