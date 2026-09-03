import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// 防止開發模式下重複建立連線
const globalForDb = global as unknown as { conn: postgres.Sql | undefined };

const connectionString = process.env.DATABASE_URL!;
// Vercel 上每個 function instance 都各自開一個連線池，postgres.js 預設 max=10
// 且 idle 連線永不釋放；幾個 instance 併發就把 RDS 的 max_connections 吃光，
// 之後的查詢會以「Failed query」失敗。Serverless 要小池、且讓閒置連線自己收掉。
const client =
  globalForDb.conn ??
  postgres(connectionString, {
    max: 3,
    idle_timeout: 20, // 秒；閒置即歸還名額給 RDS
    max_lifetime: 60 * 30,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.conn = client;

export const db = drizzle(client);