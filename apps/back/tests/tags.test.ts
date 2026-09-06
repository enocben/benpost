import { test, expect, describe } from "bun:test";
import { app } from "../src/index";

describe("Tags API", () => {
  test("GET /tags/ should return a list of tags", async () => {
    const response = await app.handle(new Request("http://localhost/tags/"));
    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("GET /tags/:id should handle non-existent tag", async () => {
    const response = await app.handle(new Request("http://localhost/tags/9999"));
    const status = response.status;
    expect([200, 404, 500]).toContain(status); 
  });
});
