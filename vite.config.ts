import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwind()],
  base: loadEnv(mode, process.cwd(), "").VITE_BASE_PATH || "/",
  test: { environment: "node", maxWorkers: 1, pool: "threads" },
}));
