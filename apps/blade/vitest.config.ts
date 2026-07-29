import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  oxc: {
    jsx: {
      importSource: "react",
      runtime: "automatic",
    },
  },
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Node stays the default: 43 of 55 existing files render with
    // `renderToStaticMarkup` and need no DOM. Tests that exercise state, events,
    // or effects opt in per file with a `@vitest-environment jsdom` docblock.
    environment: "node",
    setupFiles: ["./src/tests/setup.ts"],
    exclude: [...configDefaults.exclude, "src/tests/e2e/**"],
  },
});
