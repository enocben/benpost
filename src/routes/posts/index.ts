import {Elysia} from "elysia";


export const postsRoutes = new Elysia({
  prefix: '/posts'
})
  .get('/hello', () => "Hello Post Route")
