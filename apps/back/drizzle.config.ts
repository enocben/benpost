// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/database/schema.ts",
  out: "./src/database/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: "./src/database/sqlite.db", // adapte le chemin vers ton fichier .db
  },
});
