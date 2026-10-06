// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
const mock = vi.hoisted(() => ({ limit: vi.fn() }));
vi.mock("../services/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          ilike: () => ({
            order: () => ({ order: () => ({ limit: mock.limit }) }),
          }),
        }),
      }),
    }),
  },
}));
import { Search } from "./Search";
afterEach(cleanup);
it("debounces Hebrew input and ignores an older search response", async () => {
  let resolve!: (value: unknown) => void;
  mock.limit
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    )
    .mockResolvedValueOnce({
      data: [
        {
          id: "two",
          display_name: "תמר",
          teams: { name: "ניצן" },
          avatar_path: null,
        },
      ],
      error: null,
    });
  render(
    <MemoryRouter>
      <Search />
    </MemoryRouter>,
  );
  const input = screen.getByRole("searchbox");
  fireEvent.change(input, { target: { value: "נו" } });
  await waitFor(() => expect(mock.limit).toHaveBeenCalledTimes(1));
  fireEvent.change(input, { target: { value: "תמ" } });
  await screen.findByText("תמר");
  await act(async () =>
    resolve({
      data: [{ id: "one", display_name: "נועם", teams: { name: "אופק" } }],
      error: null,
    }),
  );
  expect(screen.queryByText("נועם")).toBeNull();
  expect(screen.getByText("תמר")).toBeTruthy();
  expect(mock.limit).toHaveBeenLastCalledWith(20);
});
