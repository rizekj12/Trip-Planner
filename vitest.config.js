// Vitest config. Run with: npm test (once) or npm run test:watch
// Kept separate from vite.config.js so tests don't load the PWA plugin.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    // Node by default (server and shared code). React component tests opt into a browser
    // environment with a `// @vitest-environment jsdom` comment at the top of the file.
    environment: "node",
    include: ["{src,server,shared}/**/*.test.{js,jsx}"],
    setupFiles: ["./src/test/setup.js"],
    // Placeholder Supabase settings. Importing src/utils/supabase.js creates a client, which
    // throws without a URL; CI has no .env, and tests should never reach the real project anyway.
    env: {
      VITE_SUPABASE_URL: "http://localhost:54321",
      VITE_SUPABASE_ANON_KEY: "test-anon-key",
    },
  },
});
