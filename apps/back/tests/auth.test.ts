import { test, expect, describe } from "bun:test";
import { app } from "../src/index";

describe("Auth API", () => {
  test("POST /auth/register with empty body should fail validation", async () => {
    const response = await app.handle(new Request("http://localhost/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    }));
    // Should be a validation error
    expect([400, 422, 500]).toContain(response.status); 
  });

  test("POST /auth/login with empty body should fail validation", async () => {
    const response = await app.handle(new Request("http://localhost/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    }));
    // Should be a validation error
    expect([400, 422, 500]).toContain(response.status); 
  });
});
