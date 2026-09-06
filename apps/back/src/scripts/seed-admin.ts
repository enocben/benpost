import { db } from "../database/db";
import { userSchema } from "../database/schema";
import { eq } from "drizzle-orm";

const email = process.env.ADMIN_EMAIL ?? "admin@benpost.local";
const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";

const existing = await db
  .select()
  .from(userSchema)
  .where(eq(userSchema.email, email))
  .limit(1);

if (existing.length > 0) {
  console.log(`ℹ️  Un compte existe déjà pour ${email} — rien à faire.`);
} else {
  await db.insert(userSchema).values({
    id: Bun.randomUUIDv7(),
    email,
    name: "Admin",
    password: await Bun.password.hash(password),
    role: "admin",
    created_at: new Date().toISOString(),
  });
  console.log(`✅ Admin créé — email : ${email} | mot de passe : ${password}`);
}
