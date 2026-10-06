import { describe, it, expect, vi } from "vitest";
import { createNameLoginHandler } from "../supabase/functions/name-login/handler";
const id = "11111111-1111-4111-8111-111111111111";
const req = (body: unknown, origin = "https://oharelolevio.github.io") =>
  new Request("https://example.test", {
    method: "POST",
    headers: { Origin: origin },
    body: JSON.stringify(body),
  });
describe("public name login bridge", () => {
  it("lists names and teams without credentials", async () => {
    const list = vi
      .fn()
      .mockResolvedValue({
        members: [{ id, display_name: "נועם", team_name: "אופק" }],
        nextPage: null,
      });
    const token = vi.fn();
    const handler = createNameLoginHandler({
      list,
      token,
      allowedOrigins: ["https://oharelolevio.github.io"],
    });
    const response = await handler(req({ action: "list" }));
    expect(response.status).toBe(200);
    expect((await response.json()).members[0].display_name).toBe("נועם");
    expect(token).not.toHaveBeenCalled();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("issues a single-use token only for a validated UUID", async () => {
    const token = vi.fn().mockResolvedValue("one-use");
    const handler = createNameLoginHandler({
      list: vi.fn(),
      token,
      allowedOrigins: ["https://oharelolevio.github.io"],
    });
    expect(
      (await handler(req({ action: "login", profileId: "invalid" }))).status,
    ).toBe(400);
    expect(token).not.toHaveBeenCalled();
    const response = await handler(req({ action: "login", profileId: id }));
    expect(await response.json()).toEqual({ token_hash: "one-use" });
    expect(token).toHaveBeenCalledWith(id);
  });
  it("does not return internal errors or secrets when member is inactive", async () => {
    const handler = createNameLoginHandler({
      list: vi.fn(),
      token: vi.fn().mockRejectedValue(new Error("secret SQL error")),
      allowedOrigins: ["https://oharelolevio.github.io"],
    });
    const response = await handler(req({ action: "login", profileId: id }));
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain("secret");
  });
  it("rejects foreign browser origins and handles preflight", async () => {
    const handler = createNameLoginHandler({
      list: vi.fn(),
      token: vi.fn(),
      allowedOrigins: ["https://oharelolevio.github.io"],
    });
    expect(
      (await handler(req({ action: "list" }, "https://other.example"))).status,
    ).toBe(403);
    const response = await handler(
      new Request("https://example.test", {
        method: "OPTIONS",
        headers: { Origin: "https://oharelolevio.github.io" },
      }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://oharelolevio.github.io",
    );
  });
});
