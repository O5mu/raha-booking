import { describe, expect, it } from "vitest";
import { addDays, bookedNights, nightsBetween } from "./dates";

describe("date helpers", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("counts nights between check-in and check-out", () => {
    expect(nightsBetween("2026-11-10", "2026-11-12")).toBe(2);
    expect(nightsBetween("2026-11-10", "2026-11-10")).toBe(0);
  });

  it("treats the check-out day as free, like the database's [) range", () => {
    const nights = bookedNights([{ check_in: "2026-11-10", check_out: "2026-11-12" }]);
    expect([...nights]).toEqual(["2026-11-10", "2026-11-11"]);
    expect(nights.has("2026-11-12")).toBe(false);
  });
});
