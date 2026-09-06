import {Elysia, t} from "elysia";
import {AuthModel} from "./model"
import {AuthService} from "./service";
import {jwt} from "@elysia/jwt";


export const authRoutes = new Elysia({
  prefix: '/auth'
})
  .use(jwt({
    name: 'jwt',
    secret: process.env.APP_SECRET!
  }))

authRoutes.post('register', ({body}) => AuthService.register(body), {body: AuthModel.register})
authRoutes.post('login', async ({body, jwt}) => AuthService.login(body, jwt), {body: AuthModel.login})
