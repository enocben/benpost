// src/database/db.ts
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { Database } from "bun:sqlite";

const dbPath = process.env.NODE_ENV === "test" ? ":memory:" : "./src/database/sqlite.db";
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite);

migrate(db, { migrationsFolder: "./src/database/migrations" });
