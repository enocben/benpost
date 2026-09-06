import { status } from "elysia";
import { db } from "../../database/db";
import { categorySchema } from "../../database/schema";
import { eq } from "drizzle-orm";
import { RouteResponse } from "../../utils/reponses";

export abstract class CategoryService {
  static async getAll() {
    const categories = await db.select().from(categorySchema);
    return RouteResponse.success("Categories retrieved successfully", categories);
  }

  static async getById(id: string) {
    const categories = await db
      .select()
      .from(categorySchema)
      .where(eq(categorySchema.id, id))
      .limit(1);

    if (categories.length === 0) {
      throw status(404, "Category not found");
    }
    return RouteResponse.success("Category retrieved successfully", categories[0]);
  }

  static async create(data: { name: string; slug: string; description?: string }) {
    const existing = await db
      .select()
      .from(categorySchema)
      .where(eq(categorySchema.slug, data.slug))
      .limit(1);

    if (existing.length > 0) {
      throw status(400, "Category with this slug already exists");
    }

    const newCategory = {
      id: Bun.randomUUIDv7(),
      name: data.name,
      slug: data.slug,
      description: data.description || null,
    };

    await db.insert(categorySchema).values(newCategory);
    return status(201, RouteResponse.success("Category created successfully", newCategory));
  }

  static async update(id: string, data: { name?: string; slug?: string; description?: string }) {
    if (data.slug) {
      const existing = await db
        .select()
        .from(categorySchema)
        .where(eq(categorySchema.slug, data.slug))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw status(400, "Category with this slug already exists");
      }
    }

    const result = await db
      .update(categorySchema)
      .set(data)
      .where(eq(categorySchema.id, id))
      .returning();

    if (result.length === 0) {
      throw status(404, "Category not found");
    }

    return RouteResponse.success("Category updated successfully", result[0]);
  }

  static async delete(id: string) {
    const result = await db.delete(categorySchema).where(eq(categorySchema.id, id)).returning();
    if (result.length === 0) {
      throw status(404, "Category not found");
    }
    return RouteResponse.success("Category deleted successfully", result[0]);
  }
}
