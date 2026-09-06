import { test, expect, describe } from "bun:test";
import { app } from "../src/index";

describe("Root API", () => {
  test("GET / should return Hello Benpost API", async () => {
    const response = await app.handle(new Request("http://localhost/"));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Hello Benpost API");
  });
});
