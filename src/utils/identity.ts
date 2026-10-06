export function memberEmail(identifier: string, domain: string) {
  const id = identifier.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,39}$/.test(id))
    throw new Error("יש להזין מזהה באנגלית, באורך 3–40 תווים.");
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain))
    throw new Error("הגדרת ההתחברות חסרה.");
  return `${id}@${domain}`;
}
