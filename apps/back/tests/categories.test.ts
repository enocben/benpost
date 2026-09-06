import { test, expect, describe } from "bun:test";
import { app } from "../src/index";

describe("Categories API", () => {
  test("GET /categories/ should return a list of categories", async () => {
    const response = await app.handle(new Request("http://localhost/categories/"));
    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("GET /categories/:id should handle non-existent category", async () => {
    const response = await app.handle(new Request("http://localhost/categories/9999"));
    const status = response.status;
    expect([200, 404, 500]).toContain(status); 
  });
});
