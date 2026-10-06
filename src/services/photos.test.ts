import { beforeEach, describe, it, expect, vi } from "vitest";
const mock = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  insert: vi.fn(),
}));
vi.mock("./client", () => ({
  supabase: {
    rpc: mock.rpc,
    from: mock.from,
    storage: { from: () => ({ upload: mock.upload, remove: mock.remove }) },
  },
}));
import { feed, uploadPhoto } from "./photos";
describe("database-backed photo operations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mock.from.mockReturnValue({ insert: mock.insert });
  });
  it("applies filters and composite cursor before pagination", async () => {
    mock.rpc.mockResolvedValue({ data: [], error: null });
    await feed("team", "member", {
      created_at: "2026-01-01T00:00:00Z",
      id: "cursor",
    } as Parameters<typeof feed>[2]);
    expect(mock.rpc).toHaveBeenCalledWith("photo_feed", {
      p_team: "team",
      p_user: "member",
      p_before_time: "2026-01-01T00:00:00Z",
      p_before_id: "cursor",
      p_limit: 20,
    });
  });
  it("removes an upload when insertion fails", async () => {
    mock.upload.mockResolvedValue({ error: null });
    mock.insert.mockResolvedValue({ error: { code: "42501" } });
    mock.remove.mockResolvedValue({ error: null });
    await expect(
      uploadPhoto("user", "post", { blob: new Blob(), width: 20, height: 10 }),
    ).rejects.toThrow("הקובץ הוסר");
    expect(mock.remove).toHaveBeenCalledWith(["user/post.jpg"]);
  });
  it("never inserts after failed upload and forbids overwrite", async () => {
    mock.upload.mockResolvedValue({ error: {} });
    await expect(
      uploadPhoto("user", "post", { blob: new Blob(), width: 20, height: 10 }),
    ).rejects.toThrow();
    expect(mock.insert).not.toHaveBeenCalled();
    expect(mock.upload.mock.calls[0][2]).toEqual({
      contentType: "image/jpeg",
      upsert: false,
    });
  });
  it("reports unsuccessful cleanup", async () => {
    mock.upload.mockResolvedValue({ error: null });
    mock.insert.mockResolvedValue({ error: {} });
    mock.remove.mockResolvedValue({ error: {} });
    await expect(
      uploadPhoto("user", "post", { blob: new Blob(), width: 20, height: 10 }),
    ).rejects.toThrow("ייתכן שנותר קובץ");
  });
});
