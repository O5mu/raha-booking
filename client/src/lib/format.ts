import { useTranslation } from "react-i18next";
import { parseDate } from "./dates";

// Intl handles numbers, currency and dates per language. For Arabic we force
// the Gregorian calendar and Western digits (ar-SA defaults to the Hijri
// calendar), which matches how most Saudi booking apps show dates and prices.
const LOCALES = { en: "en-SA", ar: "ar-SA-u-ca-gregory-nu-latn" } as const;

export function useFormat() {
  const { i18n } = useTranslation();
  const lang = i18n.language === "ar" ? "ar" : "en";
  const locale = LOCALES[lang];

  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "SAR", maximumFractionDigits: 0 });
  // Stat tiles: 845,650 -> "845.7K" so big numbers fit (the currency goes in the label).
  const compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });
  const shortDate = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const longDate = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const monthTitle = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" });
  const weekdayShort = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  const weekdayLong = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" });
  const dayDate = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

  return {
    lang,
    money: (amount: number) => money.format(amount),
    compact: (value: number) => compact.format(value),
    shortDate: (date: string) => shortDate.format(parseDate(date)),
    longDate: (date: string) => longDate.format(parseDate(date)),
    monthTitle: (date: Date) => monthTitle.format(date),
    weekday: (date: Date) => weekday.format(date),
    weekdayShort: (date: string) => weekdayShort.format(parseDate(date)),
    weekdayLong: (date: string) => weekdayLong.format(parseDate(date)),
    dayDate: (date: string) => dayDate.format(parseDate(date)),
    range: (from: string, to: string) => `${shortDate.format(parseDate(from))} – ${shortDate.format(parseDate(to))}`,
    // Picks name_ar or name_en (or description_*, district_*) for the current
    // language, falling back to English when the Arabic one is empty.
    pick,
    // "Riyadh, Al Malqa", or just "Riyadh" when there's no district.
    place: (item: { city: string } & Record<string, unknown>) =>
      [i18n.t(`cities.${item.city}`), pick(item, "district")].filter(Boolean).join(lang === "ar" ? "، " : ", "),
  };

  function pick<T extends Record<string, unknown>>(item: T, field: "name" | "description" | "district") {
    return String(item[`${field}_${lang}`] || item[`${field}_en`] || "");
  }
}
