// drizzle.config.ts — génère migrations depuis schema.ts
// Local:  file:./src/database/sqlite.db  (libsql local)
// Turso:  TURSO_DATABASE_URL + TURSO_AUTH_TOKEN (ou LIBSQL_URL)
// Drizzle-kit lit ce fichier: bunx drizzle-kit generate/push/migrate

import { defineConfig } from "drizzle-kit";

const tursoUrl = process.env.TURSO_DATABASE_URL ?? process.env.LIBSQL_URL ?? process.env.DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN ?? process.env.LIBSQL_AUTH_TOKEN ?? process.env.DATABASE_AUTH_TOKEN;

export default defineConfig({
  schema: "./src/database/schema.ts",
  out: "./src/database/migrations",
  dialect: "turso",
  dbCredentials: tursoUrl
    ? { url: tursoUrl, authToken: tursoToken }
    : { url: "file:./src/database/sqlite.db" },
});
