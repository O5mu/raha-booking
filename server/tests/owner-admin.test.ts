import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { pool } from "../src/db.js";
import { addDays, todayInRiyadh } from "../src/lib/dates.js";
import { app, bearer, tokenFor } from "./helpers.js";

const day = (n: number) => addDays(todayInRiyadh(), n);

const newListing = {
  name_en: "Test Chalet",
  name_ar: "شاليه تجريبي",
  city: "jeddah",
  price_per_night: 900,
  capacity: 15,
  amenities: ["pool", "wifi"],
  photos: ["https://example.com/photo.jpg"],
};

let owner: string, admin: string, guest: string;
beforeAll(async () => {
  [owner, admin, guest] = await Promise.all([tokenFor("owner"), tokenFor("admin"), tokenFor("guest")]);
});

describe("owner", () => {
  it("creates a listing that stays hidden until an admin approves it", async () => {
    const created = await request(app).post("/api/owner/istirahas").set(bearer(owner)).send(newListing);
    expect(created.status).toBe(201);
    expect(created.body.istiraha.status).toBe("pending");
    const id = created.body.istiraha.id;

    expect((await request(app).get(`/api/istirahas/${id}`)).status).toBe(404);

    const approved = await request(app)
      .patch(`/api/admin/istirahas/${id}/status`)
      .set(bearer(admin))
      .send({ status: "approved" });
    expect(approved.body.istiraha.status).toBe("approved");
    expect((await request(app).get(`/api/istirahas/${id}`)).status).toBe(200);
  });

  it("lists only my own listings and bookings", async () => {
    const mine = await request(app).get("/api/owner/istirahas").set(bearer(owner));
    const ownerId = (await pool.query("SELECT id FROM users WHERE email = 'owner@raha.demo'")).rows[0].id;
    expect(mine.body.istirahas.length).toBeGreaterThan(0);
    expect(mine.body.istirahas.every((i: { owner_id: number }) => i.owner_id === ownerId)).toBe(true);

    const bookings = await request(app).get("/api/owner/bookings").set(bearer(owner));
    expect(bookings.status).toBe(200);
    expect(bookings.body.bookings.length).toBeGreaterThan(0);
  });

  it("cannot edit another owner's listing", async () => {
    const other = await pool.query(
      "SELECT i.id FROM istirahas i JOIN users u ON u.id = i.owner_id WHERE u.email = 'khalid@raha.demo' LIMIT 1"
    );
    const res = await request(app).put(`/api/owner/istirahas/${other.rows[0].id}`).set(bearer(owner)).send(newListing);
    expect(res.status).toBe(404);
  });

  it("can hide and show an approved listing", async () => {
    const hide = await request(app).patch("/api/owner/istirahas/1/visibility").set(bearer(owner)).send({ hidden: true });
    expect(hide.body.istiraha.status).toBe("hidden");
    expect((await request(app).get("/api/istirahas/1")).status).toBe(404);
    await request(app).patch("/api/owner/istirahas/1/visibility").set(bearer(owner)).send({ hidden: false });
    expect((await request(app).get("/api/istirahas/1")).status).toBe(200);
  });

  it("blocks dates, which stops guests booking them", async () => {
    const block = await request(app)
      .post("/api/owner/istirahas/1/blocks")
      .set(bearer(owner))
      .send({ checkIn: day(160), checkOut: day(165) });
    expect(block.status).toBe(201);

    const booking = await request(app)
      .post("/api/bookings")
      .set(bearer(guest))
      .send({ istirahaId: 1, checkIn: day(162), checkOut: day(163), guests: 5 });
    expect(booking.status).toBe(409);

    const calendar = await request(app).get("/api/owner/istirahas/1/calendar").set(bearer(owner));
    const entry = calendar.body.entries.find((e: { id: number }) => e.id === block.body.block.id);
    expect(entry).toMatchObject({ kind: "block", check_in: day(160), check_out: day(165) });

    // Removing the block frees the dates.
    expect((await request(app).delete(`/api/owner/blocks/${block.body.block.id}`).set(bearer(owner))).status).toBe(204);
    const retry = await request(app)
      .post("/api/bookings")
      .set(bearer(guest))
      .send({ istirahaId: 1, checkIn: day(162), checkOut: day(163), guests: 5 });
    expect(retry.status).toBe(201);
  });

  it("is off limits to guests", async () => {
    expect((await request(app).get("/api/owner/istirahas").set(bearer(guest))).status).toBe(403);
  });
});

describe("admin", () => {
  it("sees platform stats and pending listings", async () => {
    const stats = await request(app).get("/api/admin/stats").set(bearer(admin));
    expect(stats.body.stats.live_listings).toBeGreaterThanOrEqual(20);

    const pending = await request(app).get("/api/admin/istirahas?status=pending").set(bearer(admin));
    expect(pending.body.istirahas.every((i: { status: string }) => i.status === "pending")).toBe(true);
  });

  it("is off limits to owners and guests", async () => {
    expect((await request(app).get("/api/admin/stats").set(bearer(owner))).status).toBe(403);
    expect((await request(app).get("/api/admin/users").set(bearer(guest))).status).toBe(403);
  });
});
