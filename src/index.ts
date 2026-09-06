import { Elysia } from "elysia";
import { openapi } from "@elysia/openapi";
import { postsRoutes } from "./routes/posts";
import { authRoutes } from "./routes/auth";
import { categoriesRoutes } from "./routes/categories";
import { tagsRoutes } from "./routes/tags";
import { usersRoutes } from "./routes/users";

const app = new Elysia()
  .use(openapi())
  .use(authRoutes)
  .use(postsRoutes)
  .use(categoriesRoutes)
  .use(tagsRoutes)
  .use(usersRoutes)
  .get("/", () => "Hello Benpost API")
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
