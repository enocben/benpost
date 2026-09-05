// src/database/db.ts
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { Database } from "bun:sqlite";

const sqlite = new Database("./src/database/sqlite.db");
export const db = drizzle(sqlite);

migrate(db, { migrationsFolder: "./src/database/migrations" });
