import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";
import { cors } from "@elysiajs/cors";
import { postsRoutes } from "./routes/posts";
import { authRoutes } from "./routes/auth";
import { categoriesRoutes } from "./routes/categories";
import { tagsRoutes } from "./routes/tags";
import { usersRoutes } from "./routes/users";
import { filesRoutes } from "./routes/files";
import { db } from "./database/db";
import { userSchema } from "./database/schema";
import { eq } from "drizzle-orm";

if (!process.env.APP_SECRET && process.env.NODE_ENV !== "test") {
  throw new Error("APP_SECRET manquant — définis APP_SECRET dans apps/back/.env");
}

const corsOrigins = (process.env.FRONT_URL ?? process.env.CORS_ORIGIN ?? "http://localhost:4321")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const app = new Elysia()
  .use(
    cors({
      origin: corsOrigins,
    }),
  )
  .use(openapi())
  .use(authRoutes)
  .use(postsRoutes)
  .use(categoriesRoutes)
  .use(tagsRoutes)
  .use(usersRoutes)
  .use(filesRoutes)
  .onStart(async () => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error(
        "ADMIN_EMAIL and ADMIN_PASSWORD must be set in the environment variables",
      );
    }

    const users = await db
      .select()
      .from(userSchema)
      .where(eq(userSchema.email, adminEmail))
      .limit(1);

    // Aucun admin → création
    if (users.length === 0) {
      await db.insert(userSchema).values({
        id: Bun.randomUUIDv7(),
        name: "Admin",
        email: adminEmail,
        password: await Bun.password.hash(adminPassword),
        role: "admin",
        created_at: new Date().toISOString(),
      });

      return;
    }

    const user = users[0];

    // Admin existant → synchronisation avec les variables d'environnement
    const passwordValid = await Bun.password.verify(
      adminPassword,
      user.password,
    );

    if (user.email !== adminEmail || !passwordValid) {
      await db
        .update(userSchema)
        .set({
          email: adminEmail,
          password: await Bun.password.hash(adminPassword),
        })
        .where(eq(userSchema.id, user.id));
    }
  })
  .get("/", () => "Hello Benpost API");

if (import.meta.main) {
  const port = Number(process.env.PORT ?? process.env.BACK_PORT ?? 3000);
  app.listen(port);
  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
  );
}

export type App = typeof app
