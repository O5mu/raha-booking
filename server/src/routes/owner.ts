import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { HttpError } from "../middleware/errors.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { isOverlapError, validateStay } from "../services/bookings.js";
import { todayInRiyadh } from "../lib/dates.js";
import { AMENITIES, CITIES, dateString, idParam } from "../lib/validation.js";

export const ownerRouter = Router();
ownerRouter.use(requireAuth, requireRole("owner"));

const listingSchema = z.object({
  name_en: z.string().trim().min(3).max(100),
  name_ar: z.string().trim().min(3).max(100),
  description_en: z.string().trim().max(1000).default(""),
  description_ar: z.string().trim().max(1000).default(""),
  city: z.enum(CITIES),
  district: z.string().trim().max(100).default(""),
  price_per_night: z.number().int().min(100).max(50_000),
  capacity: z.number().int().min(1).max(500),
  amenities: z.array(z.enum(AMENITIES)).default([]),
  photos: z.array(z.url()).min(1).max(10),
});

const COLUMNS = [
  "name_en", "name_ar", "description_en", "description_ar", "city", "district",
  "price_per_night", "capacity", "amenities", "photos",
] as const;

// Every query below filters by owner_id, so an owner can only ever touch their own listings.
async function findOwnListing(id: number, ownerId: number) {
  const { rows } = await pool.query("SELECT id, status FROM istirahas WHERE id = $1 AND owner_id = $2", [id, ownerId]);
  if (!rows[0]) throw new HttpError(404, "Istiraha not found");
  return rows[0];
}

ownerRouter.get("/istirahas", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT i.*, (
       SELECT count(*)::int FROM bookings b
       WHERE b.istiraha_id = i.id AND b.kind = 'booking' AND b.status = 'confirmed' AND b.check_in >= $2
     ) AS upcoming_bookings
     FROM istirahas i WHERE i.owner_id = $1 ORDER BY i.created_at DESC, i.id DESC`,
    [req.user!.id, todayInRiyadh()]
  );
  res.json({ istirahas: rows });
});

ownerRouter.post("/istirahas", async (req, res) => {
  const l = listingSchema.parse(req.body);
  // New listings start as 'pending' (the column default) until an admin approves them.
  const { rows } = await pool.query(
    `INSERT INTO istirahas (owner_id, ${COLUMNS.join(", ")})
     VALUES ($1, ${COLUMNS.map((_, i) => `$${i + 2}`).join(", ")}) RETURNING *`,
    [req.user!.id, ...COLUMNS.map((c) => l[c])]
  );
  res.status(201).json({ istiraha: rows[0] });
});

ownerRouter.put("/istirahas/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const l = listingSchema.parse(req.body);
  await findOwnListing(id, req.user!.id);
  const { rows } = await pool.query(
    `UPDATE istirahas SET ${COLUMNS.map((c, i) => `${c} = $${i + 3}`).join(", ")}
     WHERE id = $1 AND owner_id = $2 RETURNING *`,
    [id, req.user!.id, ...COLUMNS.map((c) => l[c])]
  );
  res.json({ istiraha: rows[0] });
});

// Owners can temporarily hide an approved listing and show it again.
ownerRouter.patch("/istirahas/:id/visibility", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const { hidden } = z.object({ hidden: z.boolean() }).parse(req.body);
  const listing = await findOwnListing(id, req.user!.id);
  if (!["approved", "hidden"].includes(listing.status)) {
    throw new HttpError(400, "Only approved listings can be hidden or shown");
  }
  const { rows } = await pool.query("UPDATE istirahas SET status = $2 WHERE id = $1 RETURNING id, status", [
    id,
    hidden ? "hidden" : "approved",
  ]);
  res.json({ istiraha: rows[0] });
});

ownerRouter.get("/bookings", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT b.id, b.kind, b.check_in, b.check_out, b.guests, b.total_price, b.status,
            i.id AS istiraha_id, i.name_en, i.name_ar, u.name AS guest_name
     FROM bookings b
     JOIN istirahas i ON i.id = b.istiraha_id
     JOIN users u ON u.id = b.user_id
     WHERE i.owner_id = $1
     ORDER BY b.check_in DESC`,
    [req.user!.id]
  );
  res.json({ bookings: rows });
});

// Blocking dates (e.g. for maintenance or a family event) is just a 'block' row
// in the bookings table, so the same constraint stops it overlapping a booking.
ownerRouter.post("/istirahas/:id/blocks", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const { checkIn, checkOut } = z.object({ checkIn: dateString, checkOut: dateString }).parse(req.body);
  validateStay(checkIn, checkOut);
  await findOwnListing(id, req.user!.id);
  try {
    const { rows } = await pool.query(
      `INSERT INTO bookings (istiraha_id, user_id, kind, check_in, check_out)
       VALUES ($1, $2, 'block', $3, $4) RETURNING id, kind, check_in, check_out, status`,
      [id, req.user!.id, checkIn, checkOut]
    );
    res.status(201).json({ block: rows[0] });
  } catch (err) {
    if (isOverlapError(err)) throw new HttpError(409, "These dates overlap an existing booking");
    throw err;
  }
});

ownerRouter.delete("/blocks/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const { rowCount } = await pool.query(
    `UPDATE bookings b SET status = 'cancelled'
     FROM istirahas i
     WHERE b.id = $1 AND b.kind = 'block' AND i.id = b.istiraha_id AND i.owner_id = $2`,
    [id, req.user!.id]
  );
  if (!rowCount) throw new HttpError(404, "Block not found");
  res.status(204).end();
});
