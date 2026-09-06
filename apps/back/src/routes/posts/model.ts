import { t } from "elysia";

export const PostModel = {
  create: t.Object({
    title: t.String({ minLength: 2, maxLength: 200 }),
    slug: t.String({ minLength: 2, maxLength: 200 }),
    excerpt: t.Optional(t.String()),
    content: t.String({ minLength: 10 }),
    cover_image_url: t.Optional(t.String()),
    status: t.Optional(t.Union([t.Literal("draft"), t.Literal("published"), t.Literal("archived")])),
    category_id: t.Optional(t.String()),
    seo_title: t.Optional(t.String()),
    seo_description: t.Optional(t.String()),
  }),
  update: t.Object({
    title: t.Optional(t.String({ minLength: 2, maxLength: 200 })),
    slug: t.Optional(t.String({ minLength: 2, maxLength: 200 })),
    excerpt: t.Optional(t.String()),
    content: t.Optional(t.String({ minLength: 10 })),
    cover_image_url: t.Optional(t.String()),
    status: t.Optional(t.Union([t.Literal("draft"), t.Literal("published"), t.Literal("archived")])),
    category_id: t.Optional(t.String()),
    seo_title: t.Optional(t.String()),
    seo_description: t.Optional(t.String()),
  }),
};
