import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "./helpers.js";

describe("app", () => {
  it("reports healthy when the database answers", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("returns JSON 404 for unknown API routes", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Not found");
  });
});
