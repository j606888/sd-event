import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * 單元測試只跑 lib/ 底下的純函式（定價、群組規則），不碰 DB 也不碰 React，
 * 所以用預設的 node 環境即可。`@/` 對齊 tsconfig.json 的 paths 設定。
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
