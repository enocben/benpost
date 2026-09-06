import {status, type Handler} from "elysia";
import type {AuthModel} from "./model";
import {db} from "../../database/db";
import {userSchema} from "../../database/schema";
import {eq} from "drizzle-orm";
import {RouteResponse} from "../../utils/reponses";
import { jwt } from "@elysia/jwt";


export abstract class AuthService {
  static async register(data: AuthModel['register']) {
    const user = await db.select().from(userSchema).where(eq(userSchema.email, data.email)).limit(1)
    if (user.length >= 1)
      throw status(
        400,
        'This user is already exist'
      )

    const password_hash = await Bun.password.hash(data.password)
    await db.insert(userSchema).values({
      id: Bun.randomUUIDv7(),
      name: data.name,
      email: data.email,
      password: password_hash,
      created_at: new Date().toISOString()
    })

    return status(200, RouteResponse.success('Account created successfully'))
  }

  static  async login(data: AuthModel['login'], jwt: any) {
    const users = await db.select().from(userSchema).where(eq(userSchema.email, data.email)).limit(1)
    if (users.length === 0)
      throw status(
        400,
        "Invalid email or password"
      )

    const user = users[0]
    const isValid = await Bun.password.verify(data.password, user.password)
    if (!isValid)
      throw status(
        400,
        "Invalid email or password"
      )

    const token = await jwt.sign({ id: user.id, role: user.role })
    return status(200, RouteResponse.success('success', {token}))
  }

}
