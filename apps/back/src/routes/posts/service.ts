import { status } from "elysia";
import { db } from "../../database/db";
import { postSchema, userSchema, categorySchema } from "../../database/schema";
import {eq} from "drizzle-orm";
import { RouteResponse } from "../../utils/reponses";
import { type PostModel } from './model'

export abstract class PostService {
  static async getAll() {
    const posts = await db
      .select({
        id: postSchema.id,
        title: postSchema.title,
        slug: postSchema.slug,
        excerpt: postSchema.excerpt,
        cover_image_url: postSchema.cover_image_url,
        status: postSchema.status,
        author_id: postSchema.author_id,
        category_id: postSchema.category_id,
        seo_title: postSchema.seo_title,
        seo_description: postSchema.seo_description,
        published_at: postSchema.published_at,
        created_at: postSchema.created_at,
        updated_at: postSchema.updated_at,
        author_name: userSchema.name,
        author_email: userSchema.email,
        category_name: categorySchema.name,
      })
      .from(postSchema)
      .leftJoin(userSchema, eq(postSchema.author_id, userSchema.id))
      .leftJoin(categorySchema, eq(postSchema.category_id, categorySchema.id));
    return RouteResponse.success("Posts retrieved successfully", posts);
  }

  static async getById(id: string) {
    const posts = await db.select().from(postSchema).where(eq(postSchema.id, id)).limit(1);
    if (posts.length === 0) {
      throw status(404, "Post not found");
    }
    return RouteResponse.success("Post retrieved successfully", posts[0]);
  }

  static async getBySlug(slug: string) {
    const posts = await db.select().from(postSchema).where(eq(postSchema.slug, slug)).limit(1);
    if (posts.length === 0) {
      throw status(404, "Post not found");
    }
    return RouteResponse.success("Post retrieved successfully", posts[0]);
  }

  static async create(data: PostModel["create"], authorId: string) {
    const existing = await db
      .select()
      .from(postSchema)
      .where(eq(postSchema.slug, data.slug))
      .limit(1);

    if (existing.length > 0) {
      throw status(400, "Post with this slug already exists");
    }

    const now = new Date().toISOString();
    const newPost = {
      id: Bun.randomUUIDv7(),
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt || null,
      content: data.content,
      cover_image_url: data.cover_image_url || null,
      status: data.status || "draft",
      author_id: authorId,
      category_id: data.category_id || null,
      seo_title: data.seo_title || null,
      seo_description: data.seo_description || null,
      published_at: data.status === "published" ? now : null,
      created_at: now,
      updated_at: now,
    };

    await db.insert(postSchema).values(newPost);
    return status(201, RouteResponse.success("Post created successfully", newPost));
  }

  static async update(id: string, data: PostModel['update']) {

    if (data.slug) {
      const existing = await db
        .select()
        .from(postSchema)
        .where(eq(postSchema.slug, data.slug))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw status(400, "Post with this slug already exists");
      }
    }

    const updateData = {
      ...data,
      published_at: undefined as string | undefined,
      updated_at: new Date().toISOString(),
    };

    if (data.status === "published") {
        updateData.published_at = new Date().toISOString();
    }

    const result = await db
      .update(postSchema)
      .set(updateData)
      .where(eq(postSchema.id, id))
      .returning();

    if (result.length === 0) {
      throw status(404, "Post not found");
    }

    return RouteResponse.success("Post updated successfully", result[0]);
  }

  static async delete(id: string) {
    const result = await db.delete(postSchema).where(eq(postSchema.id, id)).returning();
    if (result.length === 0) {
      throw status(404, "Post not found");
    }
    return RouteResponse.success("Post deleted successfully", result[0]);
  }
}
