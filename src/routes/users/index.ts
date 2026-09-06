import { Elysia } from "elysia";
import { UserService } from "./service";
import { UserModel } from "./model";
import { isAdmin } from "../../middlewares/auth";

export const usersRoutes = new Elysia({ prefix: "/users" })
  .use(isAdmin) // Admin ONLY
  .get("/", () => UserService.getAll())
  .put("/:id/role", ({ params: { id }, body }) => UserService.updateRole(id, body.role), {
    body: UserModel.updateRole,
  })
  .delete("/:id", ({ params: { id } }) => UserService.delete(id));
