import { defineConfig } from "vitest/config";
import { interpretApiPlugin } from "./vite.api-plugin";

export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
  },
  plugins: [interpretApiPlugin()],
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
