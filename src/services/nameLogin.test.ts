import { beforeEach, it, expect, vi } from "vitest";
const mock = vi.hoisted(() => ({ invoke: vi.fn(), verifyOtp: vi.fn() }));
vi.mock("./client", () => ({
  supabase: {
    functions: { invoke: mock.invoke },
    auth: { verifyOtp: mock.verifyOtp },
  },
}));
import { listLoginMembers, loginAsMember } from "./nameLogin";
beforeEach(() => vi.resetAllMocks());
it("fetches every directory page", async () => {
  mock.invoke
    .mockResolvedValueOnce({
      data: { members: [{ id: "one", display_name: "אורי", team_name: "א" }], nextPage: 1 },
      error: null,
    })
    .mockResolvedValueOnce({
      data: { members: [{ id: "two", display_name: "בני", team_name: "ב" }], nextPage: null },
      error: null,
    });
  expect((await listLoginMembers()).map((p) => p.id)).toEqual(["one", "two"]);
  expect(mock.invoke.mock.calls[1][1].body.page).toBe(1);
});
it("uses Supabase token verification to establish the member session", async () => {
  mock.invoke.mockResolvedValue({
    data: { token_hash: "single-use" },
    error: null,
  });
  mock.verifyOtp.mockResolvedValue({
    data: { session: { user: { id: "member" } } },
    error: null,
  });
  const session = await loginAsMember("member");
  expect(mock.verifyOtp).toHaveBeenCalledWith({
    token_hash: "single-use",
    type: "magiclink",
  });
  expect(session.user.id).toBe("member");
});
it("never authenticates after the bridge rejects the member", async () => {
  mock.invoke.mockResolvedValue({ data: null, error: {} });
  await expect(loginAsMember("inactive")).rejects.toThrow("הכניסה נכשלה");
  expect(mock.verifyOtp).not.toHaveBeenCalled();
});

it("sorts all pages by team, then member name", async () => {
 mock.invoke.mockResolvedValueOnce({data:{members:[{id:"1",team_name:"ב",display_name:"אורי"},{id:"2",team_name:"א",display_name:"תמר"}],nextPage:1},error:null}).mockResolvedValueOnce({data:{members:[{id:"3",team_name:"א",display_name:"אורי"}],nextPage:null},error:null});
 expect((await listLoginMembers()).map(p=>p.id)).toEqual(["3","2","1"]);
});
