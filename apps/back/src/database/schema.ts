import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

export const userSchema = sqliteTable("users", {
  id: text().primaryKey(), // uuid
  email: text().notNull().unique(),
  password: text("password_hash").notNull(),
  name: text(),
  avatar_url: text(),
  role: text().notNull().default("editor"), // "admin" | "editor"
  created_at: text().notNull(),
  updated_at: text(),
});


export const categorySchema = sqliteTable("categories", {
  id: text().primaryKey(), // uuid
  name: text().notNull(),
  slug: text().notNull().unique(),
  description: text(),
});


export const tagSchema = sqliteTable("tags", {
  id: text().primaryKey(), // uuid
  name: text().notNull(),
  slug: text().notNull().unique(),
});

export const mediaSchema = sqliteTable("media", {
  id: text().primaryKey(), // uuid
  url: text().notNull(),
  alt_text: text(),
  type: text().notNull().default("image"), // "image" | "video"
  uploaded_at: text().notNull(),
});


export const postSchema = sqliteTable("posts", {
  id: text().primaryKey(), // uuid
  title: text().notNull(),
  slug: text().notNull().unique(),
  excerpt: text(),
  content: text().notNull(),
  cover_image_url: text(),
  status: text().notNull().default("draft"), // "draft" | "published" | "archived"
  author_id: text()
    .notNull()
    .references(() => userSchema.id, { onDelete: "cascade" }),
  category_id: text().references(() => categorySchema.id, {
    onDelete: "set null",
  }),
  seo_title: text(),
  seo_description: text(),
  published_at: text(),
  created_at: text().notNull(),
  updated_at: text(),
});

export const postTagSchema = sqliteTable(
  "post_tags",
  {
    post_id: text()
      .notNull()
      .references(() => postSchema.id, { onDelete: "cascade" }),
    tag_id: text()
      .notNull()
      .references(() => tagSchema.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.post_id, table.tag_id] }),
  })
);

// ----------------------
// RELATIONS
// ----------------------
export const userRelations = relations(userSchema, ({ many }) => ({
  posts: many(postSchema),
}));

export const categoryRelations = relations(categorySchema, ({ many }) => ({
  posts: many(postSchema),
}));

export const tagRelations = relations(tagSchema, ({ many }) => ({
  postTags: many(postTagSchema),
}));

export const postRelations = relations(postSchema, ({ one, many }) => ({
  author: one(userSchema, {
    fields: [postSchema.author_id],
    references: [userSchema.id],
  }),
  category: one(categorySchema, {
    fields: [postSchema.category_id],
    references: [categorySchema.id],
  }),
  postTags: many(postTagSchema),
}));

export const postTagRelations = relations(postTagSchema, ({ one }) => ({
  post: one(postSchema, {
    fields: [postTagSchema.post_id],
    references: [postSchema.id],
  }),
  tag: one(tagSchema, {
    fields: [postTagSchema.tag_id],
    references: [tagSchema.id],
  }),
}));
