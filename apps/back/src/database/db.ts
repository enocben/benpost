// src/database/db.ts — LibSQL (Turso) + fallback local SQLite
// - test      : :memory: (bun:sqlite, pas de réseau)
// - prod/libsql: TURSO_DATABASE_URL + TURSO_AUTH_TOKEN (ou LIBSQL_URL/LIBSQL_AUTH_TOKEN)
// - local dev : file:./sqlite.db (libsql local file, pas de volume Docker nécessaire en prod)

import path from "node:path";
// @ts-ignore
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

console.log(import.meta?.env)

const isTest = process.env.NODE_ENV === "test";
const tursoUrl = process.env.TURSO_DATABASE_URL;

const tursoToken = process.env.TURSO_AUTH_TOKEN;

let db: any;
let client: any;

if (!tursoUrl || !tursoToken) {
  throw new Error("[db] no TURSO_DATABASE_URL or TURSO_AUTH_TOKEN, set env vars or use local sqlite.db"
  );
}

client = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});
db = drizzle(client);
// migrate libsql — idempotent
try {
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  await migrate(db, { migrationsFolder: path.resolve(import.meta.dir, "./migrations") });
} catch (e) {
  console.warn("[db] migrate libsql skipped:", (e as Error).message);
}

try {
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  await migrate(db, { migrationsFolder: path.resolve(import.meta.dir, "./migrations") });
} catch (e) {
  console.warn("[db] migrate libsql skipped:", (e as Error).message);
}

// if (isTest) {
//   // Tests -> bun:sqlite :memory: (rapide, isolé)
//   const { drizzle } = await import("drizzle-orm/bun-sqlite");
//   const { migrate } = await import("drizzle-orm/bun-sqlite/migrator");
//   const { Database } = await import("bun:sqlite");
//   const sqlite = new Database(":memory:");
//   try { sqlite.run("PRAGMA journal_mode=WAL;"); } catch { }
//   // @ts-ignore
//   db = drizzle(sqlite);
//   migrate(db, { migrationsFolder: path.resolve(import.meta.dir, "./migrations") });
// } else if (tursoUrl && tursoToken) {
//   // Prod / Turso distant (Hrana) — drizzle attend { connection } ou un client explicite
//   const { drizzle } = await import("drizzle-orm/libsql");
//   client = createClient({
//     url: tursoUrl,
//     authToken: tursoToken,
//   });
//   db = drizzle(client);
//   // migrate libsql — idempotent
//   try {
//     const { migrate } = await import("drizzle-orm/libsql/migrator");
//     await migrate(db, { migrationsFolder: path.resolve(import.meta.dir, "./migrations") });
//   } catch (e) {
//     console.warn("[db] migrate libsql skipped:", (e as Error).message);
//   }
// } else {
//   // Fallback local (dev sans Turso) -> file:./sqlite.db via libsql
//   const { drizzle } = await import("drizzle-orm/libsql");
//   const localPath = path.resolve(import.meta.dir, "./sqlite.db");
//   const url = `file:${localPath}`;
//   console.log(`[db] no TURSO_DATABASE_URL, using local ${url}`);
//   client = createClient({ url });
//   db = drizzle(client);
//   try {
//     const { migrate } = await import("drizzle-orm/libsql/migrator");
//     await migrate(db, { migrationsFolder: path.resolve(import.meta.dir, "./migrations") });
//   } catch (e) {
//     console.warn("[db] migrate local libsql skipped:", (e as Error).message);
//   }
// }

export { db, client };
