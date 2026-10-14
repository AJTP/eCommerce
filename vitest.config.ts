import { defineConfig } from "vitest/config";

// En Docker sobre macOS (virtiofs/osxfs), los eventos inotify del volumen
// montado no siempre llegan al contenedor: el watch mode necesita polling.
const usePolling = process.env.VITEST_WATCH_USE_POLLING === "true";

export default defineConfig({
  server: {
    watch: usePolling ? { usePolling: true, interval: 100 } : undefined,
  },
  test: {
    environment: "node",
    globals: true,
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
