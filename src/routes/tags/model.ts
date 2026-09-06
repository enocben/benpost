import { t } from "elysia";

export const TagModel = {
  create: t.Object({
    name: t.String({ minLength: 2, maxLength: 50 }),
    slug: t.String({ minLength: 2, maxLength: 50 }),
  }),
  update: t.Object({
    name: t.Optional(t.String({ minLength: 2, maxLength: 50 })),
    slug: t.Optional(t.String({ minLength: 2, maxLength: 50 })),
  }),
};
