import { status } from "elysia";
import { db } from "../../database/db";
import { postSchema } from "../../database/schema";
import { eq } from "drizzle-orm";
import { RouteResponse } from "../../utils/reponses";

export abstract class PostService {
  static async getAll() {
    const posts = await db.select().from(postSchema);
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

  static async create(data: any, authorId: string) {
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

  static async update(id: string, data: any) {
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
