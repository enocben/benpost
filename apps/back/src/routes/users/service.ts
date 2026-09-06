import { status } from "elysia";
import { db } from "../../database/db";
import { userSchema } from "../../database/schema";
import { eq } from "drizzle-orm";
import { RouteResponse } from "../../utils/reponses";

export abstract class UserService {
  static async getAll() {
    const users = await db
      .select({
        id: userSchema.id,
        email: userSchema.email,
        name: userSchema.name,
        role: userSchema.role,
        avatar_url: userSchema.avatar_url,
        created_at: userSchema.created_at,
      })
      .from(userSchema);
    return RouteResponse.success("Users retrieved successfully", users);
  }

  static async updateRole(id: string, role: string) {
    const result = await db
      .update(userSchema)
      .set({ role, updated_at: new Date().toISOString() })
      .where(eq(userSchema.id, id))
      .returning({
        id: userSchema.id,
        email: userSchema.email,
        name: userSchema.name,
        role: userSchema.role,
      });

    if (result.length === 0) {
      throw status(404, "User not found");
    }

    return RouteResponse.success("User role updated successfully", result[0]);
  }

  static async delete(id: string) {
    const result = await db.delete(userSchema).where(eq(userSchema.id, id)).returning({
      id: userSchema.id,
    });
    if (result.length === 0) {
      throw status(404, "User not found");
    }
    return RouteResponse.success("User deleted successfully", result[0]);
  }
}
