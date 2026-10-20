// Wipes the database and fills it with demo data. Booking dates are relative
// to today, so the demo always has past stays and upcoming bookings.
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { pool, withTransaction } from "../src/db.js";
import { addDays, todayInRiyadh } from "../src/lib/dates.js";
import { DEMO_PASSWORD, istirahas, users, type UserKey } from "./seed-data.js";

// Small seeded random generator, so every reseed produces the same data.
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type SeedBooking = {
  user: UserKey;
  kind: "booking" | "block";
  checkIn: string;
  nights: number;
  status: "confirmed" | "cancelled";
};

export async function seed() {
  const rand = random(42);
  const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const today = todayInRiyadh();
  const otherGuests: UserKey[] = ["g1", "g2", "g3", "g4", "g5"];
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  await withTransaction(async (db) => {
    await db.query("TRUNCATE bookings, istirahas, users RESTART IDENTITY CASCADE");

    const userIds = {} as Record<UserKey, number>;
    for (const u of users) {
      const { rows } = await db.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id",
        [u.name, u.email, passwordHash, u.role]
      );
      userIds[u.key] = rows[0].id;
    }

    for (const [index, l] of istirahas.entries()) {
      const { rows } = await db.query(
        `INSERT INTO istirahas (owner_id, name_en, name_ar, description_en, description_ar, city, district,
                                price_per_night, capacity, amenities, photos, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
        [userIds[l.owner], l.name_en, l.name_ar, l.description_en, l.description_ar, l.city, l.district,
         l.price, l.capacity, l.amenities, l.photos, l.status]
      );
      if (l.status !== "approved") continue;

      // Walk forward through a window from 30 days ago to 75 days ahead,
      // placing bookings with random gaps so they never overlap.
      const bookings: SeedBooking[] = [];
      let cursor = addDays(today, -30 - between(0, 5));
      while (cursor < addDays(today, 75)) {
        const checkIn = addDays(cursor, between(1, 8));
        const nights = between(1, 3);
        const isBlock = rand() < 0.07;
        bookings.push({
          user: isBlock ? l.owner : otherGuests[between(0, otherGuests.length - 1)],
          kind: isBlock ? "block" : "booking",
          checkIn,
          nights,
          status: !isBlock && rand() < 0.08 ? "cancelled" : "confirmed",
        });
        cursor = addDays(checkIn, nights);
      }

      // Give the demo guest a realistic history: a past stay, upcoming trips and a cancellation.
      const past = bookings.filter((b) => b.kind === "booking" && b.checkIn < today);
      const upcoming = bookings.filter((b) => b.kind === "booking" && b.checkIn > today);
      if (index === 0 && past.length) Object.assign(past[past.length - 1], { user: "guest", status: "confirmed" });
      if ((index === 2 || index === 9) && upcoming.length) Object.assign(upcoming[0], { user: "guest", status: "confirmed" });
      if (index === 5 && upcoming.length) Object.assign(upcoming[0], { user: "guest", status: "cancelled" });

      for (const b of bookings) {
        await db.query(
          `INSERT INTO bookings (istiraha_id, user_id, kind, check_in, check_out, guests, total_price, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [rows[0].id, userIds[b.user], b.kind, b.checkIn, addDays(b.checkIn, b.nights),
           b.kind === "booking" ? between(5, l.capacity) : null,
           b.kind === "booking" ? b.nights * l.price : 0, b.status]
        );
      }
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed()
    .then(async () => {
      const { rows } = await pool.query(
        "SELECT (SELECT count(*) FROM users) AS users, (SELECT count(*) FROM istirahas) AS istirahas, (SELECT count(*) FROM bookings) AS bookings"
      );
      console.log("seeded", rows[0]);
      await pool.end();
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
