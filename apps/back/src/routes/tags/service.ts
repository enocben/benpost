import { status } from "elysia";
import { db } from "../../database/db";
import { tagSchema } from "../../database/schema";
import { eq } from "drizzle-orm";
import { RouteResponse } from "../../utils/reponses";

export abstract class TagService {
  static async getAll() {
    const tags = await db.select().from(tagSchema);
    return RouteResponse.success("Tags retrieved successfully", tags);
  }

  static async getById(id: string) {
    const tags = await db.select().from(tagSchema).where(eq(tagSchema.id, id)).limit(1);
    if (tags.length === 0) {
      throw status(404, "Tag not found");
    }
    return RouteResponse.success("Tag retrieved successfully", tags[0]);
  }

  static async create(data: { name: string; slug: string }) {
    const existing = await db
      .select()
      .from(tagSchema)
      .where(eq(tagSchema.slug, data.slug))
      .limit(1);

    if (existing.length > 0) {
      throw status(400, "Tag with this slug already exists");
    }

    const newTag = {
      id: Bun.randomUUIDv7(),
      name: data.name,
      slug: data.slug,
    };

    await db.insert(tagSchema).values(newTag);
    return status(201, RouteResponse.success("Tag created successfully", newTag));
  }

  static async update(id: string, data: { name?: string; slug?: string }) {
    if (data.slug) {
      const existing = await db
        .select()
        .from(tagSchema)
        .where(eq(tagSchema.slug, data.slug))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw status(400, "Tag with this slug already exists");
      }
    }

    const result = await db
      .update(tagSchema)
      .set(data)
      .where(eq(tagSchema.id, id))
      .returning();

    if (result.length === 0) {
      throw status(404, "Tag not found");
    }

    return RouteResponse.success("Tag updated successfully", result[0]);
  }

  static async delete(id: string) {
    const result = await db.delete(tagSchema).where(eq(tagSchema.id, id)).returning();
    if (result.length === 0) {
      throw status(404, "Tag not found");
    }
    return RouteResponse.success("Tag deleted successfully", result[0]);
  }
}
