import { app } from "./src/index.ts";
const res = await app.handle(new Request("http://localhost/users/"));
console.log(res.status);
