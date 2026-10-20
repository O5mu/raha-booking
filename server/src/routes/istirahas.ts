import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { HttpError } from "../middleware/errors.js";
import { todayInRiyadh } from "../lib/dates.js";
import { AMENITIES, CITIES, dateString, idParam } from "../lib/validation.js";

export const istirahasRouter = Router();

const searchSchema = z
  .object({
    city: z.enum(CITIES).optional(),
    checkIn: dateString.optional(),
    checkOut: dateString.optional(),
    guests: z.coerce.number().int().positive().optional(),
    maxPrice: z.coerce.number().positive().optional(),
    // "pool,bbq" -> ["pool", "bbq"]
    amenities: z
      .string()
      .transform((s) => s.split(",").filter(Boolean))
      .pipe(z.array(z.enum(AMENITIES)))
      .optional(),
    sort: z.enum(["recommended", "price_asc", "price_desc"]).default("recommended"),
    page: z.coerce.number().int().positive().default(1),
    // The home page rate sheet lists every place at once; capped so nobody can ask for thousands.
    pageSize: z.coerce.number().int().min(1).max(50).default(12),
  })
  .refine((q) => !q.checkIn === !q.checkOut, "Send both checkIn and checkOut, or neither")
  .refine((q) => !q.checkIn || q.checkOut! > q.checkIn, "checkOut must be after checkIn");

const ORDER_BY = {
  recommended: "i.id",
  price_asc: "i.price_per_night ASC, i.id",
  price_desc: "i.price_per_night DESC, i.id",
};

istirahasRouter.get("/", async (req, res) => {
  const q = searchSchema.parse(req.query);

  // Build the WHERE clause from whichever filters were sent. Values always go
  // in as $1, $2... parameters, never pasted into the SQL (prevents SQL injection).
  const where = ["i.status = 'approved'"];
  const params: unknown[] = [];
  const add = (value: unknown) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (q.city) where.push(`i.city = ${add(q.city)}`);
  if (q.guests) where.push(`i.capacity >= ${add(q.guests)}`);
  if (q.maxPrice) where.push(`i.price_per_night <= ${add(q.maxPrice)}`);
  if (q.amenities?.length) where.push(`i.amenities @> ${add(q.amenities)}::text[]`);
  if (q.checkIn && q.checkOut) {
    // Hide istirahas with any confirmed booking overlapping the requested stay.
    where.push(`NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.istiraha_id = i.id AND b.status = 'confirmed'
        AND b.stay && daterange(${add(q.checkIn)}::date, ${add(q.checkOut)}::date, '[)')
    )`);
  }

  const { rows } = await pool.query(
    `SELECT i.id, i.name_en, i.name_ar, i.city, i.district_en, i.district_ar, i.price_per_night, i.capacity,
            i.amenities, i.photos[1] AS cover_photo, count(*) OVER () AS total
     FROM istirahas i
     WHERE ${where.join(" AND ")}
     ORDER BY ${ORDER_BY[q.sort]}
     LIMIT ${add(q.pageSize)} OFFSET ${add((q.page - 1) * q.pageSize)}`,
    params
  );

  res.json({
    total: Number(rows[0]?.total ?? 0),
    page: q.page,
    pageSize: q.pageSize,
    results: rows.map(({ total: _, ...r }) => r),
  });
});

istirahasRouter.get("/cities", async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT city, count(*)::int AS count FROM istirahas WHERE status = 'approved' GROUP BY city ORDER BY count DESC"
  );
  res.json({ cities: rows });
});

istirahasRouter.get("/:id", async (req, res) => {
  const id = idParam.parse(req.params.id);
  const { rows } = await pool.query(
    `SELECT i.id, i.name_en, i.name_ar, i.description_en, i.description_ar, i.city, i.district_en, i.district_ar,
            i.price_per_night, i.capacity, i.amenities, i.photos, u.name AS owner_name
     FROM istirahas i JOIN users u ON u.id = i.owner_id
     WHERE i.id = $1 AND i.status = 'approved'`,
    [id]
  );
  if (!rows[0]) throw new HttpError(404, "Istiraha not found");

  // Only dates, never who booked, so the calendar can grey out taken days.
  const booked = await pool.query(
    `SELECT check_in, check_out FROM bookings
     WHERE istiraha_id = $1 AND status = 'confirmed' AND check_out > $2
     ORDER BY check_in`,
    [id, todayInRiyadh()]
  );
  res.json({ istiraha: rows[0], bookedRanges: booked.rows });
});
