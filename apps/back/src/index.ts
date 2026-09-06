import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";
import { cors } from "@elysiajs/cors";
import { postsRoutes } from "./routes/posts";
import { authRoutes } from "./routes/auth";
import { categoriesRoutes } from "./routes/categories";
import { tagsRoutes } from "./routes/tags";
import { usersRoutes } from "./routes/users";

export const app = new Elysia()
  .use(
    cors({
      origin: ["http://localhost:3001", "http://localhost:4321"],
    })
  )
  .use(openapi())
  .use(authRoutes)
  .use(postsRoutes)
  .use(categoriesRoutes)
  .use(tagsRoutes)
  .use(usersRoutes)
  .get("/", () => "Hello Benpost API");

if (import.meta.main) {
  app.listen(3000);
  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
  );
}

export type App = typeof app
