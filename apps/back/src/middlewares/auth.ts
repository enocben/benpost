import { Elysia, status } from "elysia";
import { jwt } from "@elysiajs/jwt";
import * as process from "node:process";
import {getToken} from "../utils";

export const isAuthenticated = new Elysia()
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

    const payload = await jwt.verify(getToken(authorization));
    if (!payload) {
      throw status(401, "Unauthorized");
    }

    return {
      user: payload as { id: string; role: string },
    };
  });

export const isAdmin = new Elysia()
  .use(isAuthenticated)
  .onBeforeHandle((context: any) => {
    if (context.user.role !== "admin") {
      throw status(403, "Forbidden: Admins only");
    }
  });
