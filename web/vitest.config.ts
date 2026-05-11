import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next", "dist"],
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "**/*.config.*",
        "**/*.d.ts",
        ".next/**",
        "node_modules/**",
        "supabase/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
