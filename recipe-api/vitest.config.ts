import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    fileParallelism: false,
    include: ["src/**/*.test.ts", "src/**/*.tests.ts"],
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
