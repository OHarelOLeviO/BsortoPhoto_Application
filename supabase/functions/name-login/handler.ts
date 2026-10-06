export type Choice = { id: string; display_name: string; team_name: string };
export type DirectoryPage = { members: Choice[]; nextPage: number | null };
export type LoginDependencies = {
  list: (page: number) => Promise<DirectoryPage>;
  token: (id: string) => Promise<string>;
  allowedOrigins: string[];
};
export function createNameLoginHandler(deps: LoginDependencies) {
  return async (request: Request) => {
    const origin = request.headers.get("origin");
    const allowed = !origin || deps.allowedOrigins.includes(origin);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Vary: "Origin",
      "Access-Control-Allow-Headers":
        "authorization,x-client-info,apikey,content-type",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
    };
    if (origin && allowed) headers["Access-Control-Allow-Origin"] = origin;
    const result = (status: number, data: unknown) =>
      new Response(JSON.stringify(data), { status, headers });
    if (!allowed) return result(403, { error: "Origin not allowed" });
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (request.method !== "POST")
      return result(405, { error: "Method not allowed" });
    try {
      const text = await request.text();
      if (text.length > 2048)
        return result(413, { error: "Request too large" });
      const body = JSON.parse(text) as Record<string, unknown>;
      if (body.action === "list") {
        const page = body.page ?? 0;
        if (typeof page !== "number" || !Number.isSafeInteger(page) || page < 0)
          return result(400, { error: "Invalid page" });
        return result(200, await deps.list(page));
      }
      if (body.action === "login") {
        if (
          typeof body.profileId !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            body.profileId,
          )
        )
          return result(400, { error: "Invalid member" });
        return result(200, { token_hash: await deps.token(body.profileId) });
      }
      return result(400, { error: "Invalid action" });
    } catch {
      return result(400, { error: "Unable to complete request" });
    }
  };
}
