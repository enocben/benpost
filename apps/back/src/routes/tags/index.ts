import { Elysia } from "elysia";
import { TagService } from "./service";
import { TagModel } from "./model";
import { isAdmin } from "../../middlewares/auth";

export const tagsRoutes = new Elysia({ prefix: "/tags" })
  .get("/", () => TagService.getAll())
  .get("/:id", ({ params: { id } }) => TagService.getById(id))
  // Admin only routes
  .use(isAdmin)
  .post("/", ({ body }) => TagService.create(body), {
    body: TagModel.create,
  })
  .put("/:id", ({ params: { id }, body }) => TagService.update(id, body), {
    body: TagModel.update,
  })
  .delete("/:id", ({ params: { id } }) => TagService.delete(id));
