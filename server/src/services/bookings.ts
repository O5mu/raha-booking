import { withTransaction } from "../db.js";
import { HttpError } from "../middleware/errors.js";
import { nightsBetween, todayInRiyadh } from "../lib/dates.js";

export const MAX_NIGHTS = 30;

// Postgres error codes:
// 23P01 = exclusion constraint violated: the dates overlap a confirmed booking
//         (constraint no_double_booking in 001_init.sql).
// 40P01 = deadlock detected: two transactions inserting overlapping rows at the
//         same moment can each wait for the other; Postgres cancels one.
const EXCLUSION_VIOLATION = "23P01";
const DEADLOCK = "40P01";

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

// Either way, the insert lost the race for these dates.
export function isBookingConflict(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  return code === EXCLUSION_VIOLATION || code === DEADLOCK;
}

// Locks the istiraha row until the transaction ends. Every booking and block for
// the same istiraha takes this lock first, so they run one after another: the
// second one only inserts after the first has committed, sees its row, and fails
// cleanly with 23P01 instead of deadlocking. It also stops the owner changing the
// price or hiding the listing halfway through a booking.
export const LOCK_ISTIRAHA = "FOR UPDATE";

export async function createBooking(input: NewBooking) {
  const nights = validateStay(input.checkIn, input.checkOut);

  return withTransaction(async (db) => {
    const { rows } = await db.query(
      `SELECT price_per_night, capacity FROM istirahas WHERE id = $1 AND status = 'approved' ${LOCK_ISTIRAHA}`,
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
      if (isBookingConflict(err)) throw new HttpError(409, "Sorry, these dates were just booked. Please pick other dates.");
      throw err;
    }
  });
}
