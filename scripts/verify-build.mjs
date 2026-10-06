import { readFile, access } from "node:fs/promises";
import assert from "node:assert/strict";
import { loadEnv } from "vite";
const base =
  process.env.VITE_BASE_PATH ||
  loadEnv("production", process.cwd(), "").VITE_BASE_PATH ||
  "/";
const html = await readFile("dist/index.html", "utf8");
const refs = [...html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g)].map(
  (m) => m[1],
);
assert.equal(refs.length, 2, "Expected JS and CSS entry assets");
for (const path of refs) {
  assert(path.startsWith(base), "Asset must use configured subpath");
  await access("dist/" + path.slice(base.length));
}
console.log("PASS: repository-subpath asset links and emitted files");
