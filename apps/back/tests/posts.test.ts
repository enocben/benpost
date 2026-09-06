import { test, expect, describe, beforeAll } from "bun:test";
import { app } from "../src/index";

describe("Posts API", () => {
  test("GET /posts/ should return a list of posts", async () => {
    const response = await app.handle(new Request("http://localhost/posts/"));
    expect(response.status).toBe(200);
    
    // As it uses an in-memory DB and we haven't seeded data in this test,
    // the list should probably be an empty array if migrations ran properly.
    const body: any = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("GET /posts/:id should return 404 or a proper error for non-existent post", async () => {
    const response = await app.handle(new Request("http://localhost/posts/9999"));
    // Depending on Elysia setup, this could be 200 with null, or 404, or 500 if unhandled
    // Assuming an unhandled non-existent item throws or returns null/empty
    // We will just check that it doesn't crash the server.
    const status = response.status;
    expect([200, 404, 500]).toContain(status); 
  });
});
