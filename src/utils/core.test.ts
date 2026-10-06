import { describe, it, expect } from "vitest";
import { dimensions, validateImage } from "./images";
import { memberEmail } from "./identity";
import { validateRows } from "../../scripts/members.mjs";
describe("input protections", () => {
  it("rejects HEIC, SVG and excessive input", () => {
    for (const type of ["image/heic", "image/svg+xml", "text/plain"])
      expect(() => validateImage({ type, size: 100 })).toThrow();
    expect(() =>
      validateImage({ type: "image/jpeg", size: 16 * 1024 * 1024 }),
    ).toThrow();
    expect(() =>
      validateImage({ type: "image/webp", size: 100 }),
    ).not.toThrow();
  });
  it("bounds portrait and landscape while preserving ratio", () => {
    expect(dimensions(4000, 2000)).toEqual({ width: 2048, height: 1024 });
    expect(dimensions(1000, 4000)).toEqual({ width: 512, height: 2048 });
    expect(dimensions(500, 300)).toEqual({ width: 500, height: 300 });
  });
  it("normalizes identifiers and rejects email injection", () => {
    expect(memberEmail(" DEMO-001 ", "members.example.invalid")).toBe(
      "demo-001@members.example.invalid",
    );
    expect(() =>
      memberEmail("other@example.com", "members.example.invalid"),
    ).toThrow();
  });
  it("rejects duplicate provisioning rows before writes", () => {
    expect(() =>
      validateRows([
        {
          member_identifier: "demo-001",
          display_name: "נועם",
          team_name: "אופק",
        },
        {
          member_identifier: "DEMO-001",
          display_name: "תמר",
          team_name: "אופק",
        },
      ]),
    ).toThrow();
  });
});
