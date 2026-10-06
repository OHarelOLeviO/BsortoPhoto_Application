// @vitest-environment jsdom
import { act, renderHook, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import type { Post } from "../types";
const mocks = vi.hoisted(() => ({
  feed: vi.fn(),
  setLike: vi.fn(),
  readLike: vi.fn(),
}));
vi.mock("../services/photos", () => mocks);
vi.mock("./useAuth", () => ({
  useAuth: () => ({ profile: { id: "member" } }),
}));
import { usePhotos } from "./usePhotos";
import { LikesProvider, useLikes } from "./useLikes";
const post = (id: string): Post => ({
  id,
  user_id: "member",
  image_path: `member/${id}.jpg`,
  image_width: 20,
  image_height: 10,
  created_at: "2026-01-01T00:00:00Z",
  display_name: "נועם",
  team_name: "אופק",
  avatar_path: null,
  liked: false,
  like_count: 0,
});
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.readLike.mockRejectedValue(new Error("offline"));
});
describe("pagination and shared likes", () => {
  it("reconciles an uncertain write with the persisted like state", async () => {
    mocks.setLike.mockRejectedValue(new Error("response lost"));
    mocks.readLike.mockResolvedValue({ liked: true, like_count: 4 });
    const hook = renderHook(() => useLikes(), {
      wrapper: ({ children }) => <LikesProvider>{children}</LikesProvider>,
    });
    await act(async () => {
      await expect(hook.result.current.toggle(post("one"))).rejects.toThrow();
    });
    expect(hook.result.current.values.one).toEqual({
      liked: true,
      like_count: 4,
      busy: false,
    });
  });
  it("deduplicates subsequent pages and resets on team change", async () => {
    const first = Array.from({ length: 20 }, (_, i) => post(String(i)));
    mocks.feed
      .mockResolvedValueOnce(first)
      .mockResolvedValueOnce([post("19"), post("20")])
      .mockResolvedValueOnce([post("new")]);
    const hook = renderHook(({ team }) => usePhotos(team), {
      initialProps: { team: "one" },
    });
    await waitFor(() => expect(hook.result.current.posts.length).toBe(20));
    await act(() => hook.result.current.load());
    expect(hook.result.current.posts.length).toBe(21);
    expect(mocks.feed.mock.calls[1][2].id).toBe("19");
    hook.rerender({ team: "two" });
    await waitFor(() =>
      expect(hook.result.current.posts.map((p) => p.id)).toEqual(["new"]),
    );
    expect(mocks.feed.mock.calls[2][2]).toBeUndefined();
  });
  it("discards a stale feed response after filter changes", async () => {
    let resolve!: (rows: Post[]) => void;
    mocks.feed
      .mockImplementationOnce(
        () =>
          new Promise<Post[]>((r) => {
            resolve = r;
          }),
      )
      .mockResolvedValueOnce([post("new")]);
    const hook = renderHook(({ team }) => usePhotos(team), {
      initialProps: { team: "one" },
    });
    hook.rerender({ team: "two" });
    await waitFor(() => expect(hook.result.current.posts[0]?.id).toBe("new"));
    await act(async () => resolve([post("old")]));
    expect(hook.result.current.posts[0].id).toBe("new");
  });
  it("shares optimistic likes, prevents overlaps and reconciles count", async () => {
    let resolve!: (count: number) => void;
    mocks.setLike.mockImplementation(
      () =>
        new Promise<number>((r) => {
          resolve = r;
        }),
    );
    const wrapper = ({ children }: { children: ReactNode }) => (
      <LikesProvider>{children}</LikesProvider>
    );
    const hook = renderHook(() => useLikes(), { wrapper });
    let pending!: Promise<void>;
    act(() => {
      pending = hook.result.current.toggle(post("one"));
    });
    expect(hook.result.current.values.one).toEqual({
      liked: true,
      like_count: 1,
      busy: true,
    });
    await act(() => hook.result.current.toggle(post("one")));
    expect(mocks.setLike).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve(7);
      await pending;
    });
    expect(hook.result.current.values.one).toEqual({
      liked: true,
      like_count: 7,
      busy: false,
    });
    mocks.setLike.mockResolvedValue(6);
    await act(() => hook.result.current.toggle(post("one")));
    expect(mocks.setLike).toHaveBeenLastCalledWith("one", "member", false);
  });
  it("rolls back when a like request fails", async () => {
    mocks.setLike.mockRejectedValue(new Error("network"));
    const hook = renderHook(() => useLikes(), {
      wrapper: ({ children }) => <LikesProvider>{children}</LikesProvider>,
    });
    await act(async () => {
      await expect(hook.result.current.toggle(post("one"))).rejects.toThrow(
        "נסה שוב",
      );
    });
    expect(hook.result.current.values.one).toEqual({
      liked: false,
      like_count: 0,
      busy: false,
    });
  });
});
