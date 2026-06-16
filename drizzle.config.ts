import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// 預設讀 .env（本地）。跑 production 指令時會用 dotenv-cli 載入 .env.production 覆蓋。
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

// 安全提示：跑 migrate / studio 時清楚印出連到哪個 DB（不含密碼）
const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
console.log(
  `[drizzle] target = ${isLocal ? "LOCAL" : "REMOTE / PRODUCTION"} (${
    new URL(url).host
  })`
);

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url,
    // SSL 由連線字串的 sslmode 決定：本地不用 SSL，正式機 URL 已帶 ?sslmode=require
    ssl: isLocal ? false : "require",
  },
});
