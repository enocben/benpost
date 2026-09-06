import { Elysia } from "elysia";
import { PostService } from "./service";
import { PostModel } from "./model";
import { isAdmin } from "../../middlewares/auth";
import {getToken} from "../../utils";

export const postsRoutes = new Elysia({ prefix: "/posts" })
  .get("/", () => PostService.getAll())
  .get("/:id", ({ params: { id } }) => PostService.getById(id))
  .get("/slug/:slug", ({ params: { slug } }) => PostService.getBySlug(slug))
  // Admin only routes
  .use(isAdmin)
  .post("/", async ({ headers: { authorization }, jwt, body}) => {
    const user = await jwt.verify(getToken(authorization!)) as {id: string}
    return await PostService.create(body, user.id)
  }, {
    body: PostModel.create,
  })
  .put("/:id", ({ params: { id }, body }) => PostService.update(id, body), {
    body: PostModel.update,
  })
  .delete("/:id", ({ params: { id } }) => PostService.delete(id));
