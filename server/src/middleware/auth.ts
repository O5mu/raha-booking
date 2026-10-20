import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { HttpError } from "./errors.js";

export type Role = "guest" | "owner" | "admin";
export type AuthUser = { id: number; role: Role; name: string };

// Tell TypeScript that req.user can exist after requireAuth runs.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ role: user.role, name: user.name }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: "7d",
  });
}

// Reads "Authorization: Bearer <token>", checks the signature and expiry,
// and puts the user on req.user. Anything wrong means 401.
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new HttpError(401, "Please log in");
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret) as jwt.JwtPayload;
    req.user = { id: Number(payload.sub), role: payload.role, name: payload.name };
    next();
  } catch {
    throw new HttpError(401, "Your session has expired, please log in again");
  }
};

// Use after requireAuth: requireRole("owner", "admin") lets only those roles through (403 otherwise).
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new HttpError(403, "You don't have permission to do this");
    }
    next();
  };
}
