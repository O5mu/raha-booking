import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { HttpError } from "../middleware/errors.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createBooking } from "../services/bookings.js";
import { todayInRiyadh } from "../lib/dates.js";
import { dateString, idParam } from "../lib/validation.js";

export const bookingsRouter = Router();
bookingsRouter.use(requireAuth);

const createSchema = z.object({
  istirahaId: z.number().int().positive(),
  checkIn: dateString,
  checkOut: dateString,
  guests: z.number().int().positive(),
});

bookingsRouter.post("/", requireRole("guest"), async (req, res) => {
  const input = createSchema.parse(req.body);
  const booking = await createBooking({ ...input, userId: req.user!.id });
  res.status(201).json({ booking });
});

bookingsRouter.get("/mine", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT b.id, b.check_in, b.check_out, b.guests, b.total_price, b.status, b.created_at,
            i.id AS istiraha_id, i.name_en, i.name_ar, i.city, i.photos[1] AS cover_photo
     FROM bookings b JOIN istirahas i ON i.id = b.istiraha_id
     WHERE b.user_id = $1 AND b.kind = 'booking'
     ORDER BY b.check_in DESC`,
    [req.user!.id]
  );
  res.json({ bookings: rows });
});

bookingsRouter.patch("/:id/cancel", async (req, res) => {
  const id = idParam.parse(req.params.id);
  // The user_id check means you can only cancel your own bookings.
  const { rows } = await pool.query(
    "SELECT status, check_in FROM bookings WHERE id = $1 AND user_id = $2 AND kind = 'booking'",
    [id, req.user!.id]
  );
  const booking = rows[0];
  if (!booking) throw new HttpError(404, "Booking not found");
  if (booking.status === "cancelled") throw new HttpError(400, "This booking is already cancelled");
  if (booking.check_in <= todayInRiyadh()) throw new HttpError(400, "Past or ongoing stays can't be cancelled");

  const updated = await pool.query(
    "UPDATE bookings SET status = 'cancelled' WHERE id = $1 RETURNING id, status",
    [id]
  );
  res.json({ booking: updated.rows[0] });
});
