import { Elysia, InternalRoute } from "elysia";
import { openapi } from "@elysia/openapi"
import {postsRoutes} from "./routes/posts";

const app = new Elysia()
  .use(openapi())
  .use(postsRoutes)
  .get("/", () => "Hello Elysia").listen(3000);


console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
