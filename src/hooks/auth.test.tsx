// @vitest-environment jsdom
import { act, renderHook, waitFor, cleanup } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
const mock = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  single: vi.fn(),
  unsubscribe: vi.fn(),
}));
vi.mock("../services/client", () => ({
  supabase: {
    auth: mock,
    from: () => ({ select: () => ({ eq: () => ({ single: mock.single }) }) }),
  },
}));
import { AuthProvider, useAuth } from "./useAuth";
afterEach(cleanup);
it("restores persisted identity and clears profile on logout event", async () => {
  let callback!: (_event: string, session: Session | null) => void;
  mock.getSession.mockResolvedValue({
    data: { session: { user: { id: "member" } } },
  });
  mock.single.mockResolvedValue({
    data: { id: "member", is_active: true },
    error: null,
  });
  mock.onAuthStateChange.mockImplementation((fn) => {
    callback = fn;
    return { data: { subscription: { unsubscribe: mock.unsubscribe } } };
  });
  const hook = renderHook(() => useAuth(), {
    wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
  });
  await waitFor(() => expect(hook.result.current.profile?.id).toBe("member"));
  expect(hook.result.current.loading).toBe(false);
  act(() => callback("SIGNED_OUT", null));
  expect(hook.result.current.profile).toBe(null);
  expect(hook.result.current.session).toBe(null);
  hook.unmount();
  expect(mock.unsubscribe).toHaveBeenCalled();
});
it("blocks an inactive restored member", async () => {
  mock.getSession.mockResolvedValue({
    data: { session: { user: { id: "inactive" } } },
  });
  mock.single.mockResolvedValue({ data: null, error: { code: "PGRST116" } });
  const hook = renderHook(() => useAuth(), {
    wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
  });
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  expect(hook.result.current.profile).toBe(null);
  expect(hook.result.current.error).toContain("הגישה אינה זמינה");
});
