import { Elysia } from "elysia";
import { CategoryService } from "./service";
import { CategoryModel } from "./model";
import { isAdmin } from "../../middlewares/auth";

export const categoriesRoutes = new Elysia({ prefix: "/categories" })
  .get("/", () => CategoryService.getAll())
  .get("/:id", ({ params: { id } }) => CategoryService.getById(id))
  // Admin only routes
  .use(isAdmin)
  .post("/", ({ body }) => CategoryService.create(body), {
    body: CategoryModel.create,
  })
  .put("/:id", ({ params: { id }, body }) => CategoryService.update(id, body), {
    body: CategoryModel.update,
  })
  .delete("/:id", ({ params: { id } }) => CategoryService.delete(id));
