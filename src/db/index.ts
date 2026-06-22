import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL environment variable is missing!");
  throw new Error("DATABASE_URL is required to initialize the database connection.");
}

const sql = neon(databaseUrl);
export const db = drizzle(sql);
