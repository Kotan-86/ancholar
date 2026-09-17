import path from "node:path";
import { defineConfig } from "vitest/config";

// npm scripts を介さない Vitest 実行でも、本番と同じ業務タイムゾーンを使う。
process.env.TZ = "Asia/Tokyo";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@domain": path.resolve(__dirname, "src/domain"),
      "@shared": path.resolve(__dirname, "src/shared"),
      "@application": path.resolve(__dirname, "src/application"),
      "@interface": path.resolve(__dirname, "src/interface"),
      "@frameworks-drivers": path.resolve(__dirname, "src/frameworks-drivers"),
      "@presentation": path.resolve(__dirname, "src/frameworks-drivers/presentation"),
      "react-dom": path.resolve(
        __dirname,
        "src/frameworks-drivers/nextjs/node_modules/react-dom",
      ),
      "react": path.resolve(
        __dirname,
        "src/frameworks-drivers/nextjs/node_modules/react",
      ),
    },
  },
});
