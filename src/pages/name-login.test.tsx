// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
const mock = vi.hoisted(() => ({
  listLoginMembers: vi.fn(),
  loginAsMember: vi.fn(),
}));
vi.mock("../services/nameLogin", () => mock);
import { Login } from "./Login";
afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());
it("loads database names and logs into the selected ID without a password", async () => {
  mock.listLoginMembers.mockResolvedValue([
    { id: "one", display_name: "נועם", team_name: "אופק" },
    { id: "two", display_name: "נועם", team_name: "ניצן" },
  ]);
  mock.loginAsMember.mockResolvedValue({});
  render(<Login />);
  await screen.findByRole("option", { name: "ניצן" });
  expect((screen.getByRole("combobox", { name: "שם" }) as HTMLSelectElement).disabled).toBe(true);
  fireEvent.change(screen.getByRole("combobox", { name: "צוות" }), { target: { value: "ניצן" } });
  expect(screen.queryByLabelText("קוד גישה אישי")).toBeNull();
  expect(
    (screen.getByRole("button", { name: "כניסה לאלבום" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.change(screen.getByRole("combobox", { name: "שם" }), { target: { value: "two" } });
  fireEvent.click(screen.getByRole("button", { name: "כניסה לאלבום" }));
  await waitFor(() => expect(mock.loginAsMember).toHaveBeenCalledWith("two"));
});
it("shows a retry action when the real directory is unavailable", async () => {
  mock.listLoginMembers
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce([
      { id: "one", display_name: "תמר", team_name: "ניצן" },
    ]);
  render(<Login />);
  fireEvent.click(await screen.findByRole("button", { name: "נסה שוב" }));
  await screen.findByRole("option", { name: "ניצן" });
  fireEvent.change(screen.getByRole("combobox", { name: "צוות" }), { target: { value: "ניצן" } });
  await screen.findByRole("option", { name: "תמר" });
});


it("filters names by team and clears selection when team changes", async () => {
 mock.listLoginMembers.mockResolvedValue([{id:"one",display_name:"אורי",team_name:"אופק"},{id:"two",display_name:"תמר",team_name:"ניצן"}]);
 render(<Login />);
 await screen.findByRole("option",{name:"אופק"});
 fireEvent.change(screen.getByRole("combobox",{name:"צוות"}),{target:{value:"אופק"}});
 expect(screen.queryByRole("option",{name:"תמר"})).toBeNull();
 fireEvent.change(screen.getByRole("combobox",{name:"שם"}),{target:{value:"one"}});
 fireEvent.change(screen.getByRole("combobox",{name:"צוות"}),{target:{value:"ניצן"}});
 expect((screen.getByRole("combobox",{name:"שם"}) as HTMLSelectElement).value).toBe("");
 expect(screen.queryByRole("option",{name:"אורי"})).toBeNull();
 expect((screen.getByRole("button",{name:"כניסה לאלבום"}) as HTMLButtonElement).disabled).toBe(true);
});
