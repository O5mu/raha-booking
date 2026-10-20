import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { pool } from "../src/db.js";
import { addDays, todayInRiyadh } from "../src/lib/dates.js";
import { app, bearer, tokenFor } from "./helpers.js";

// Seed bookings only go ~80 days ahead, so these dates are free for testing.
const day = (n: number) => addDays(todayInRiyadh(), n);
const ISTIRAHA = 1; // Al Nakheel, Riyadh: 1200 SAR/night, up to 40 guests

let guest: string;
beforeAll(async () => {
  guest = await tokenFor("guest");
});

const book = (body: object, token = guest) =>
  request(app).post("/api/bookings").set(bearer(token)).send(body);

describe("search", () => {
  it("filters by city and only returns approved listings", async () => {
    const res = await request(app).get("/api/istirahas?city=riyadh");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(5); // 6 in Riyadh, 1 still pending
    expect(res.body.results.every((r: { city: string }) => r.city === "riyadh")).toBe(true);
  });

  it("hides istirahas that are booked on the requested dates", async () => {
    await book({ istirahaId: ISTIRAHA, checkIn: day(200), checkOut: day(202), guests: 10 });
    const res = await request(app).get(`/api/istirahas?city=riyadh&checkIn=${day(201)}&checkOut=${day(203)}`);
    const ids = res.body.results.map((r: { id: number }) => r.id);
    expect(ids).not.toContain(ISTIRAHA);
    expect(ids.length).toBe(4);
  });

  it("filters by guests, price and amenities", async () => {
    const res = await request(app).get("/api/istirahas?guests=45&maxPrice=2500&amenities=pool,football");
    for (const r of res.body.results) {
      expect(r.capacity).toBeGreaterThanOrEqual(45);
      expect(r.price_per_night).toBeLessThanOrEqual(2500);
      expect(r.amenities).toEqual(expect.arrayContaining(["pool", "football"]));
    }
    expect(res.body.total).toBeGreaterThan(0);
  });

  it("rejects bad search input", async () => {
    expect((await request(app).get("/api/istirahas?city=paris")).status).toBe(400);
    expect((await request(app).get(`/api/istirahas?checkIn=${day(5)}`)).status).toBe(400);
  });

  it("shows booked date ranges on the details page without guest info", async () => {
    const res = await request(app).get(`/api/istirahas/${ISTIRAHA}`);
    expect(res.status).toBe(200);
    expect(res.body.istiraha.name_ar).toBe("استراحة النخيل");
    expect(res.body.bookedRanges.length).toBeGreaterThan(0);
    expect(Object.keys(res.body.bookedRanges[0])).toEqual(["check_in", "check_out"]);
  });

  it("does not show pending listings publicly", async () => {
    const pending = await pool.query("SELECT id FROM istirahas WHERE status = 'pending' LIMIT 1");
    expect((await request(app).get(`/api/istirahas/${pending.rows[0].id}`)).status).toBe(404);
  });
});

describe("booking", () => {
  it("books and calculates the price on the server", async () => {
    const res = await book({ istirahaId: ISTIRAHA, checkIn: day(100), checkOut: day(103), guests: 20, total_price: 1 });
    expect(res.status).toBe(201);
    expect(res.body.booking).toMatchObject({ check_in: day(100), check_out: day(103), total_price: 3600, status: "confirmed" });
  });

  it("rejects overlapping dates with 409", async () => {
    const res = await book({ istirahaId: ISTIRAHA, checkIn: day(102), checkOut: day(105), guests: 5 });
    expect(res.status).toBe(409);
  });

  it("allows checking in on the day the previous guest checks out", async () => {
    const res = await book({ istirahaId: ISTIRAHA, checkIn: day(103), checkOut: day(104), guests: 5 });
    expect(res.status).toBe(201);
  });

  it("validates the stay", async () => {
    expect((await book({ istirahaId: ISTIRAHA, checkIn: day(-2), checkOut: day(1), guests: 5 })).status).toBe(400);
    expect((await book({ istirahaId: ISTIRAHA, checkIn: day(110), checkOut: day(110), guests: 5 })).status).toBe(400);
    expect((await book({ istirahaId: ISTIRAHA, checkIn: day(110), checkOut: day(150), guests: 5 })).status).toBe(400);
    expect((await book({ istirahaId: ISTIRAHA, checkIn: day(110), checkOut: day(111), guests: 41 })).status).toBe(400);
    expect((await book({ istirahaId: 9999, checkIn: day(110), checkOut: day(111), guests: 5 })).status).toBe(404);
  });

  it("only lets guests book", async () => {
    const body = { istirahaId: ISTIRAHA, checkIn: day(120), checkOut: day(121), guests: 5 };
    expect((await request(app).post("/api/bookings").send(body)).status).toBe(401);
    expect((await book(body, await tokenFor("owner"))).status).toBe(403);
  });

  it("allows exactly one of 10 simultaneous bookings for the same dates", async () => {
    const body = { istirahaId: ISTIRAHA, checkIn: day(130), checkOut: day(132), guests: 10 };
    const results = await Promise.all(Array.from({ length: 10 }, () => book(body)));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409, 409, 409, 409, 409, 409]);

    const { rows } = await pool.query(
      "SELECT count(*)::int AS n FROM bookings WHERE istiraha_id = $1 AND check_in = $2 AND status = 'confirmed'",
      [ISTIRAHA, day(130)]
    );
    expect(rows[0].n).toBe(1);
  });

  it("blocks overlaps even when the API is bypassed with raw concurrent SQL", async () => {
    const insert = async () => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "INSERT INTO bookings (istiraha_id, user_id, check_in, check_out, guests) VALUES ($1, 1, $2, $3, 5)",
          [ISTIRAHA, day(140), day(143)]
        );
        await client.query("COMMIT");
        return "ok";
      } catch (err) {
        await client.query("ROLLBACK");
        return (err as { code: string }).code;
      } finally {
        client.release();
      }
    };
    expect((await Promise.all([insert(), insert()])).sort()).toEqual(["23P01", "ok"]);
  });
});

describe("my bookings", () => {
  it("lists my bookings and lets me cancel, which frees the dates", async () => {
    const created = await book({ istirahaId: ISTIRAHA, checkIn: day(150), checkOut: day(152), guests: 8 });
    const id = created.body.booking.id;

    const mine = await request(app).get("/api/bookings/mine").set(bearer(guest));
    expect(mine.body.bookings.map((b: { id: number }) => b.id)).toContain(id);

    const cancel = await request(app).patch(`/api/bookings/${id}/cancel`).set(bearer(guest));
    expect(cancel.body.booking.status).toBe("cancelled");
    expect((await request(app).patch(`/api/bookings/${id}/cancel`).set(bearer(guest))).status).toBe(400);

    // Cancelled bookings don't count for the constraint, so the dates are free again.
    expect((await book({ istirahaId: ISTIRAHA, checkIn: day(150), checkOut: day(152), guests: 8 })).status).toBe(201);
  });

  it("does not let me cancel someone else's booking", async () => {
    const other = await pool.query(
      "SELECT b.id FROM bookings b JOIN users u ON u.id = b.user_id WHERE u.email = 'sara@raha.demo' LIMIT 1"
    );
    const res = await request(app).patch(`/api/bookings/${other.rows[0].id}/cancel`).set(bearer(guest));
    expect(res.status).toBe(404);
  });
});
