import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  // B4: component tests are .jsx and use JSX without importing React
  // (React 18's automatic runtime) — esbuild needs to be told that
  // explicitly, since this project has no @vitejs/plugin-react configured
  // (Next.js's own compiler otherwise handles that at build time).
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    // B4: component tests under tests/frontend need a DOM (jsdom); every
    // other test talks to a real Postgres and has no use for one, and
    // paying jsdom's setup cost there for nothing would just slow the
    // suite down. environmentMatchGlobs lets both live in one run.
    environmentMatchGlobs: [["tests/frontend/**", "jsdom"]],
    globals: false,
    include: ["tests/**/*.test.js", "tests/**/*.test.jsx"],
    setupFiles: ["./tests/setup.js"],
    testTimeout: 15000,
    hookTimeout: 15000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["services/**", "oauth/**", "lib/**", "utils/**", "app/api/**"],
      exclude: ["**/*.test.js", "**/*.test.jsx"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
