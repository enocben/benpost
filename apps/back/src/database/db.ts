// src/database/db.ts
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { Database } from "bun:sqlite";
import path from "node:path";

const dbPath =
  process.env.NODE_ENV === "test"
    ? ":memory:"
    : path.resolve(import.meta.dir, "./sqlite.db");

const sqlite = new Database(dbPath);
// WAL améliore concurrence lecture/écriture pour SQLite
try {
  sqlite.exec("PRAGMA journal_mode=WAL;");
} catch {}
export const db = drizzle(sqlite);

migrate(db, { migrationsFolder: path.resolve(import.meta.dir, "./migrations") });
