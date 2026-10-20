import { withTransaction } from "../db.js";
import { HttpError } from "../middleware/errors.js";
import { nightsBetween, todayInRiyadh } from "../lib/dates.js";

export const MAX_NIGHTS = 30;

// Postgres error code for "exclusion constraint violated", i.e. the dates
// overlap a confirmed booking (constraint no_double_booking in 001_init.sql).
const EXCLUSION_VIOLATION = "23P01";

type NewBooking = {
  istirahaId: number;
  userId: number;
  checkIn: string;
  checkOut: string;
  guests: number;
};

export function validateStay(checkIn: string, checkOut: string) {
  if (checkIn < todayInRiyadh()) throw new HttpError(400, "Check-in can't be in the past");
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) throw new HttpError(400, "Check-out must be after check-in");
  if (nights > MAX_NIGHTS) throw new HttpError(400, `You can book up to ${MAX_NIGHTS} nights`);
  return nights;
}

export function isOverlapError(err: unknown): boolean {
  return (err as { code?: string }).code === EXCLUSION_VIOLATION;
}

export async function createBooking(input: NewBooking) {
  const nights = validateStay(input.checkIn, input.checkOut);

  return withTransaction(async (db) => {
    // FOR SHARE locks this istiraha row until we commit, so an owner can't
    // change the price or hide the listing halfway through this booking.
    const { rows } = await db.query(
      "SELECT price_per_night, capacity FROM istirahas WHERE id = $1 AND status = 'approved' FOR SHARE",
      [input.istirahaId]
    );
    const istiraha = rows[0];
    if (!istiraha) throw new HttpError(404, "Istiraha not found");
    if (input.guests > istiraha.capacity) {
      throw new HttpError(400, `This istiraha fits up to ${istiraha.capacity} guests`);
    }

    // The price is always calculated here on the server, never taken from the client.
    const totalPrice = nights * istiraha.price_per_night;

    try {
      const inserted = await db.query(
        `INSERT INTO bookings (istiraha_id, user_id, check_in, check_out, guests, total_price)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, istiraha_id, check_in, check_out, guests, total_price, status, created_at`,
        [input.istirahaId, input.userId, input.checkIn, input.checkOut, input.guests, totalPrice]
      );
      return inserted.rows[0];
    } catch (err) {
      // We don't check availability with a SELECT first: two requests could both
      // see "free" and both insert. Instead we just insert and let the database
      // constraint reject the loser atomically.
      if (isOverlapError(err)) throw new HttpError(409, "Sorry, these dates were just booked. Please pick other dates.");
      throw err;
    }
  });
}
