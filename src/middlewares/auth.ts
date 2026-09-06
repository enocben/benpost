import { Elysia, status } from "elysia";
import { jwt } from "@elysia/jwt";
import * as process from "node:process";

export const isAuthenticated = new Elysia({ name: "isAuthenticated" })
  .use(
    jwt({
      name: "jwt",
      secret: process.env.APP_SECRET!,
    })
  )
  .derive(async ({ jwt, headers: { authorization } }) => {
    if (!authorization) {
      throw status(401, "Unauthorized");
    }

    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : authorization;

    const payload = await jwt.verify(token);
    if (!payload) {
      throw status(401, "Unauthorized");
    }

    return {
      user: payload as { id: string; role: string },
    };
  });

export const isAdmin = new Elysia({ name: "isAdmin" })
  .use(isAuthenticated)
  .onBeforeHandle((context: any) => {
    if (context.user.role !== "admin") {
      throw status(403, "Forbidden: Admins only");
    }
  });
