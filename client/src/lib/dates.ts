// Same rules as the server: dates are "YYYY-MM-DD" strings and all math is in
// UTC, so the user's timezone can never shift a day.

const DAY_MS = 86_400_000;

export function parseDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return toDateString(new Date(parseDate(date).getTime() + days * DAY_MS));
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((parseDate(checkOut).getTime() - parseDate(checkIn).getTime()) / DAY_MS);
}

export function today(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });
}

// Every night that is taken: a stay from the 10th to the 12th occupies the
// nights of the 10th and 11th. The 12th stays free for the next check-in.
export function bookedNights(ranges: { check_in: string; check_out: string }[]): Set<string> {
  const nights = new Set<string>();
  for (const r of ranges) {
    for (let d = r.check_in; d < r.check_out; d = addDays(d, 1)) nights.add(d);
  }
  return nights;
}
