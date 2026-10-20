import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "../db.js";
import { config } from "../config.js";
import { HttpError } from "../middleware/errors.js";
import { requireAuth, signToken, type AuthUser } from "../middleware/auth.js";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(120),
  password: z.string().min(8).max(100),
  // Nobody can sign up as admin.
  role: z.enum(["guest", "owner"]).default("guest"),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

// A real bcrypt hash used when the email doesn't exist, so a wrong email takes
// as long as a wrong password and attackers can't tell which emails are registered.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

function respond(user: AuthUser & { email: string }) {
  return { token: signToken(user), user };
}

authRouter.post("/register", async (req, res) => {
  const input = registerSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(input.password, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [input.name, input.email, passwordHash, input.role]
    );
    res.status(201).json(respond(rows[0]));
  } catch (err) {
    // 23505 = unique_violation (the lower(email) unique index)
    if ((err as { code?: string }).code === "23505") throw new HttpError(409, "This email is already registered");
    throw err;
  }
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const { rows } = await pool.query(
    "SELECT id, name, email, role, password_hash FROM users WHERE lower(email) = lower($1)",
    [email]
  );
  const user = rows[0];
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, "Invalid email or password");
  const { password_hash: _, ...safeUser } = user;
  res.json(respond(safeUser));
});

// "Try as guest / owner / admin" buttons. Only enabled when DEMO_MODE is on.
authRouter.post("/demo", async (req, res) => {
  if (!config.demoMode) throw new HttpError(404, "Demo mode is off");
  const { role } = z.object({ role: z.enum(["guest", "owner", "admin"]) }).parse(req.body);
  const { rows } = await pool.query("SELECT id, name, email, role FROM users WHERE email = $1", [
    `${role}@raha.demo`,
  ]);
  if (!rows[0]) throw new HttpError(404, "Demo account not found, run the seed script");
  res.json(respond(rows[0]));
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT id, name, email, role FROM users WHERE id = $1", [req.user!.id]);
  if (!rows[0]) throw new HttpError(401, "Please log in");
  res.json({ user: rows[0] });
});
