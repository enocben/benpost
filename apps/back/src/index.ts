import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";
import { cors } from "@elysiajs/cors";
import { postsRoutes } from "./routes/posts";
import { authRoutes } from "./routes/auth";
import { categoriesRoutes } from "./routes/categories";
import { tagsRoutes } from "./routes/tags";
import { usersRoutes } from "./routes/users";
import { filesRoutes } from "./routes/files";

if (!process.env.APP_SECRET && process.env.NODE_ENV !== "test") {
  throw new Error("APP_SECRET manquant — définis APP_SECRET dans apps/back/.env");
}

const corsOrigins = (process.env.FRONT_URL ?? process.env.CORS_ORIGIN ?? "http://localhost:4321")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const app = new Elysia()
  .use(
    cors({
      origin: corsOrigins,
    })
  )
  .use(openapi())
  .use(authRoutes)
  .use(postsRoutes)
  .use(categoriesRoutes)
  .use(tagsRoutes)
  .use(usersRoutes)
  .use(filesRoutes)
  .get("/", () => "Hello Benpost API");

if (import.meta.main) {
  const port = Number(process.env.PORT ?? process.env.BACK_PORT ?? 3000);
  app.listen(port);
  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
  );
}

export type App = typeof app
