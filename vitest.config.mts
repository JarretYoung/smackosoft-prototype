import path from "node:path";
import { defineConfig } from "vitest/config";

// Server tests run against a disposable Postgres that tests/support/global-setup.ts
// starts in Docker. Every test creates its own data, so files can run in parallel.
export default defineConfig({
  resolve: {
    // `server-only` throws outside a React Server environment. Tests are plain Node.
    alias: { "server-only": path.resolve(import.meta.dirname, "tests/support/server-only.ts") },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/support/global-setup.ts"],
    // The first test in a file pays for module loading and pool startup.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: "v8",
      include: ["src/server/**", "src/contract/**"],
      exclude: ["src/server/db/types.ts"],
    },
  },
});
