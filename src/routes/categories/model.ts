import { t } from "elysia";

export const CategoryModel = {
  create: t.Object({
    name: t.String({ minLength: 2, maxLength: 100 }),
    slug: t.String({ minLength: 2, maxLength: 100 }),
    description: t.Optional(t.String()),
  }),
  update: t.Object({
    name: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
    slug: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
    description: t.Optional(t.String()),
  }),
};
