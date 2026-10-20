// Dates are passed around as "YYYY-MM-DD" strings. All math is done in UTC so
// the server's own timezone can never shift a date by one day.

const DAY_MS = 24 * 60 * 60 * 1000;

export function todayInRiyadh(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });
}

function toUtc(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: string, days: number): string {
  return new Date(toUtc(date) + days * DAY_MS).toISOString().slice(0, 10);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((toUtc(checkOut) - toUtc(checkIn)) / DAY_MS);
}

export function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && addDays(date, 0) === date;
}
