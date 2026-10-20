import { defineConfig } from "vitest/config";
import "dotenv/config";

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? "postgres://raha:raha@localhost:5432/raha_test";

export default defineConfig({
  test: {
    globalSetup: "./tests/global-setup.ts",
    setupFiles: "./tests/setup.ts",
    // Test files share one database, so run them one after another.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    env: {
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: "test-secret",
      DEMO_MODE: "true",
    },
  },
});
