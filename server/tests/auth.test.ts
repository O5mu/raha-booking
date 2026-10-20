import { describe, expect, it } from "vitest";
import request from "supertest";
import { app, bearer } from "./helpers.js";

describe("auth", () => {
  it("registers a guest and never returns the password hash", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Mona", email: "mona@example.com", password: "secret123" });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user).toMatchObject({ email: "mona@example.com", role: "guest" });
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it("rejects a duplicate email regardless of letter case", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Copy", email: "GUEST@raha.demo", password: "secret123" });
    expect(res.status).toBe(409);
  });

  it("does not allow signing up as admin", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Hacker", email: "h@example.com", password: "secret123", role: "admin" });
    expect(res.status).toBe(400);
  });

  it("validates input", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "A", email: "not-an-email", password: "123" });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.details)).toEqual(expect.arrayContaining(["name", "email", "password"]));
  });

  it("logs in with the right password", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "owner@raha.demo", password: "demo1234" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("owner");
  });

  it("gives the same error for a wrong password and an unknown email", async () => {
    const wrongPassword = await request(app).post("/api/auth/login").send({ email: "owner@raha.demo", password: "nope" });
    const unknownEmail = await request(app).post("/api/auth/login").send({ email: "nobody@raha.demo", password: "nope" });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error).toBe(unknownEmail.body.error);
  });

  it("logs in through the demo buttons", async () => {
    for (const role of ["guest", "owner", "admin"] as const) {
      const res = await request(app).post("/api/auth/demo").send({ role });
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe(role);
    }
  });

  it("protects /me with a valid token", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set(bearer("garbage"))).status).toBe(401);

    const login = await request(app).post("/api/auth/demo").send({ role: "guest" });
    const me = await request(app).get("/api/auth/me").set(bearer(login.body.token));
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe("guest@raha.demo");
  });
});
