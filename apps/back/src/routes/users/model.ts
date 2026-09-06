import { t } from "elysia";

export const UserModel = {
  updateRole: t.Object({
    role: t.Union([t.Literal("admin"), t.Literal("editor")]),
  }),
};
