import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

async function runMigrations() {
  console.log("Running database migrations...");
  
  const client = postgres(process.env.DATABASE_URL!, { 
    prepare: false,
    max: 1 
  });
  
  const db = drizzle(client);

  try {
    // Use absolute path for migrations folder
    const migrationsFolder = path.join(process.cwd(), "drizzle");
    await migrate(db, { migrationsFolder });
    console.log("Migrations completed successfully!");
  } catch (error: any) {
    // Check if error is about existing objects (common when schema already exists)
    if (error?.cause?.code === "42710" || error?.cause?.code === "42P07" || error?.cause?.code === "42P06") {
      console.warn("Some database objects already exist. This is normal if the database was previously set up.");
      console.warn("If you need a fresh start, consider resetting the database or using 'db:push' instead.");
      // Don't exit with error for "already exists" cases
      return;
    }
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
