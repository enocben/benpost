import {Elysia, t} from "elysia";
import {AuthModel} from "./model"
import {AuthService} from "./service";
import {jwt} from "@elysiajs/jwt";


export const authRoutes = new Elysia({
  prefix: '/auth'
})
  .use(jwt({
    name: 'jwt',
    secret: process.env.APP_SECRET || (process.env.NODE_ENV === "test" ? "test-secret-do-not-use-in-prod" : undefined)!,
    exp: "7d",
  }))

authRoutes.post('register', ({body}) => AuthService.register(body), {body: AuthModel.register})
authRoutes.post('login', async ({body, jwt}) => AuthService.login(body, jwt), {body: AuthModel.login})
