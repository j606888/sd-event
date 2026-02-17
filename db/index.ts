import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// 防止開發模式下重複建立連線
const globalForDb = global as unknown as { conn: postgres.Sql | undefined };

const connectionString = process.env.DATABASE_URL!;
const client = globalForDb.conn ?? postgres(connectionString);

if (process.env.NODE_ENV !== "production") globalForDb.conn = client;

export const db = drizzle(client);