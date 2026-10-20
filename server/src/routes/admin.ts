import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { HttpError } from "../middleware/errors.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { idParam } from "../lib/validation.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get("/stats", async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM users) AS users,
      (SELECT count(*)::int FROM istirahas WHERE status = 'approved') AS live_listings,
      (SELECT count(*)::int FROM istirahas WHERE status = 'pending') AS pending_listings,
      (SELECT count(*)::int FROM bookings WHERE kind = 'booking' AND status = 'confirmed') AS confirmed_bookings,
      (SELECT coalesce(sum(total_price), 0) FROM bookings WHERE kind = 'booking' AND status = 'confirmed') AS total_value
  `);
  res.json({ stats: rows[0] });
});

adminRouter.get("/istirahas", async (req, res) => {
  const { status } = z
    .object({ status: z.enum(["pending", "approved", "rejected", "hidden"]).optional() })
    .parse(req.query);
  const { rows } = await pool.query(
    `SELECT i.id, i.name_en, i.name_ar, i.city, i.district, i.price_per_night, i.capacity,
            i.photos[1] AS cover_photo, i.status, i.created_at, u.name AS owner_name
     FROM istirahas i JOIN users u ON u.id = i.owner_id
     WHERE ($1::text IS NULL OR i.status = $1)
     ORDER BY (i.status = 'pending') DESC, i.created_at DESC, i.id DESC`,
    [status ?? null]
  );
  res.json({ istirahas: rows });
});

adminRouter.patch("/istirahas/:id/status", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const { status } = z.object({ status: z.enum(["approved", "rejected", "hidden"]) }).parse(req.body);
  const { rows } = await pool.query("UPDATE istirahas SET status = $2 WHERE id = $1 RETURNING id, status", [id, status]);
  if (!rows[0]) throw new HttpError(404, "Istiraha not found");
  res.json({ istiraha: rows[0] });
});

adminRouter.get("/users", async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC, id DESC"
  );
  res.json({ users: rows });
});

adminRouter.get("/bookings", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT b.id, b.check_in, b.check_out, b.guests, b.total_price, b.status, b.created_at,
            i.name_en, i.name_ar, u.name AS guest_name
     FROM bookings b
     JOIN istirahas i ON i.id = b.istiraha_id
     JOIN users u ON u.id = b.user_id
     WHERE b.kind = 'booking'
     ORDER BY b.created_at DESC, b.id DESC
     LIMIT 100`
  );
  res.json({ bookings: rows });
});
