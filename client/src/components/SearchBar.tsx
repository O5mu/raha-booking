import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, MapPin, Minus, Plus, Search, Users } from "lucide-react";
import { DateRangeCalendar, type Range } from "./DateRangeCalendar";
import { useFormat } from "../lib/format";
import styles from "./SearchBar.module.css";

export const CITIES = ["riyadh", "jeddah", "dammam", "khobar", "alahsa", "abha", "taif"];

export type SearchValues = { city?: string; checkIn?: string; checkOut?: string; guests?: number };

export function toSearchParams(v: SearchValues & Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(v)) if (value) params.set(key, String(value));
  return params;
}

export function SearchBar({ initial = {}, compact = false }: { initial?: SearchValues; compact?: boolean }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const navigate = useNavigate();
  const [city, setCity] = useState(initial.city ?? "");
  const [range, setRange] = useState<Range>({ checkIn: initial.checkIn, checkOut: initial.checkOut });
  const [guests, setGuests] = useState(initial.guests ?? 10);
  const [datesOpen, setDatesOpen] = useState(false);
  const datesRef = useRef<HTMLDivElement>(null);

  // Close the date popover on outside click or Escape.
  useEffect(() => {
    if (!datesOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!datesRef.current?.contains(e.target as Node)) setDatesOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDatesOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [datesOpen]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const complete = range.checkIn && range.checkOut;
    navigate(`/search?${toSearchParams({ city, guests, ...(complete ? range : {}) })}`);
  }

  const datesLabel =
    range.checkIn && range.checkOut ? fmt.range(range.checkIn, range.checkOut) : range.checkIn ? fmt.shortDate(range.checkIn) + " –" : t("search.addDates");

  return (
    <form className={`${styles.bar} ${compact ? styles.compact : ""}`} onSubmit={submit} role="search">
      <label className={styles.segment}>
        <MapPin size={18} className={styles.icon} />
        <span className={styles.text}>
          <span className={styles.label}>{t("search.where")}</span>
          <select className={styles.control} value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">{t("search.anyCity")}</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {t(`cities.${c}`)}
              </option>
            ))}
          </select>
        </span>
      </label>

      <div className={styles.segment} ref={datesRef}>
        <CalendarDays size={18} className={styles.icon} />
        <button type="button" className={styles.text} onClick={() => setDatesOpen((o) => !o)} aria-expanded={datesOpen}>
          <span className={styles.label}>{t("search.dates")}</span>
          <span className={`${styles.control} ${!range.checkIn ? styles.placeholder : ""}`}>{datesLabel}</span>
        </button>
        <AnimatePresence>
          {datesOpen && (
            // The popover grows out of the field that opened it (transform-origin: top).
            <motion.div
              className={styles.popover}
              ref={(el) => {
                // If the popover opens below the fold, bring it into view.
                el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
              }}
              initial={{ opacity: 0, scale: 0.96, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -6 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            >
              <DateRangeCalendar
                value={range}
                months={2}
                onChange={(r) => {
                  setRange(r);
                  if (r.checkOut) setDatesOpen(false);
                }}
              />
              {range.checkIn && (
                <button type="button" className="btn btn-ghost" onClick={() => setRange({})}>
                  {t("details.clearDates")}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={styles.segment}>
        <Users size={18} className={styles.icon} />
        <span className={styles.text}>
          <span className={styles.label}>{t("search.guests")}</span>
          <span className={styles.stepper}>
            <button type="button" onClick={() => setGuests((g) => Math.max(1, g - 5))} aria-label="−5">
              <Minus size={14} />
            </button>
            <output aria-live="polite">{guests}</output>
            <button type="button" onClick={() => setGuests((g) => Math.min(200, g + 5))} aria-label="+5">
              <Plus size={14} />
            </button>
          </span>
        </span>
      </div>

      <button type="submit" className={`btn btn-primary ${styles.submit}`}>
        <Search size={18} />
        <span>{t("search.search")}</span>
      </button>
    </form>
  );
}
