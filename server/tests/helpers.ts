import request from "supertest";
import { createApp } from "../src/app.js";

export const app = createApp();

export async function tokenFor(role: "guest" | "owner" | "admin"): Promise<string> {
  const res = await request(app).post("/api/auth/demo").send({ role });
  return res.body.token;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
