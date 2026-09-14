// src/database/db.ts — LibSQL (Turso) + fallback local SQLite
// - test      : :memory: (bun:sqlite, pas de réseau)
// - prod/libsql: TURSO_DATABASE_URL + TURSO_AUTH_TOKEN (ou LIBSQL_URL/LIBSQL_AUTH_TOKEN)
// - local dev : file:./sqlite.db (libsql local file, pas de volume Docker nécessaire en prod)

import path from "node:path";
import { createClient } from "@tursodatabase/api"

const isTest = process.env.NODE_ENV === "test";
const tursoUrl =
  process.env.TURSO_DATABASE_URL ??
  process.env.LIBSQL_URL ??
  process.env.DATABASE_URL;

const tursoToken =
  process.env.TURSO_AUTH_TOKEN ??
  process.env.LIBSQL_AUTH_TOKEN ??
  process.env.DATABASE_AUTH_TOKEN;

let db: any;
let client: any;

if (isTest) {
  // Tests -> bun:sqlite :memory: (rapide, isolé)
  const { drizzle } = await import("drizzle-orm/bun-sqlite");
  const { migrate } = await import("drizzle-orm/bun-sqlite/migrator");
  const { Database } = await import("bun:sqlite");
  const sqlite = new Database(":memory:");
  try { sqlite.exec("PRAGMA journal_mode=WAL;"); } catch { }
  db = drizzle(sqlite);
  migrate(db, { migrationsFolder: path.resolve(import.meta.dir, "./migrations") });
} else if (tursoUrl && tursoToken) {
  // Prod / LibSQL (Turso ou file:)
  const { drizzle } = await import("drizzle-orm/libsql");
  client = createClient({
    baseUrl: tursoUrl,
    token: tursoToken,
  });
  db = drizzle(client);
  // migrate libsql — idempotent
  try {
    const { migrate } = await import("drizzle-orm/libsql/migrator");
    await migrate(db, { migrationsFolder: path.resolve(import.meta.dir, "./migrations") });
  } catch (e) {
    console.warn("[db] migrate libsql skipped:", (e as Error).message);
  }
} else {
  // Fallback local (dev sans Turso) -> file:./sqlite.db via libsql
  const { drizzle } = await import("drizzle-orm/libsql");
  const localPath = path.resolve(import.meta.dir, "./sqlite.db");
  const url = `file:${localPath}`;
  console.log(`[db] no TURSO_DATABASE_URL, using local ${url}`);
  client = createClient({ baseUrl: url, token: "" });
  db = drizzle(client);
  try {
    const { migrate } = await import("drizzle-orm/libsql/migrator");
    await migrate(db, { migrationsFolder: path.resolve(import.meta.dir, "./migrations") });
  } catch (e) {
    console.warn("[db] migrate local libsql skipped:", (e as Error).message);
  }
}

export { db, client };
