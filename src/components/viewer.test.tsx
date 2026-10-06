// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
vi.mock("./Photo", () => ({ Photo: () => <img alt="תמונה" /> }));
vi.mock("./PostCard", () => ({
  Like: () => <button>לייק</button>,
  dateLabel: () => "7 באוקטובר",
}));
import { Viewer } from "./Viewer";
afterEach(cleanup);
it("opens a native modal, locks scroll, handles Escape and restores focus", () => {
  const show = vi.fn(function(this: HTMLDialogElement) { this.setAttribute('open', ''); });
  const close = vi.fn();
  HTMLDialogElement.prototype.showModal = show;
  HTMLDialogElement.prototype.close = close;
  const before = document.createElement("button");
  document.body.append(before);
  before.focus();
  const onClose = vi.fn();
  const view = render(
    <MemoryRouter>
      <Viewer
        post={{
          id: "one",
          user_id: "member",
          image_path: "path",
          image_width: 10,
          image_height: 20,
          created_at: "2026-10-07",
          display_name: "נועם",
          team_name: "אופק",
          avatar_path: null,
          like_count: 0,
          liked: false,
        }}
        onClose={onClose}
      />
    </MemoryRouter>,
  );
  expect(show).toHaveBeenCalled();
  expect(document.body.style.overflow).toBe("hidden");
  fireEvent(
    screen.getByRole("dialog"),
    new Event("cancel", { cancelable: true }),
  );
  expect(onClose).toHaveBeenCalled();
  view.unmount();
  expect(document.body.style.overflow).toBe("");
  expect(document.activeElement).toBe(before);
  before.remove();
});
