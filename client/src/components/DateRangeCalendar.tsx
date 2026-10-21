import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFormat } from "../lib/format";
import { addDays, parseDate, today, toDateString } from "../lib/dates";
import styles from "./DateRangeCalendar.module.css";

export type Range = { checkIn?: string; checkOut?: string };

type Props = {
  value: Range;
  onChange: (range: Range) => void;
  booked?: Set<string>; // nights that are taken (see bookedNights)
  months?: 1 | 2;
  maxNights?: number;
};

// Builds the grid for one month: leading blanks so the 1st lands on the right
// weekday (weeks start on Sunday, as in Saudi Arabia), then every date.
function monthDays(monthStart: string): (string | null)[] {
  const first = parseDate(monthStart);
  const blanks = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return [...Array(blanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i))];
}

function startOfMonth(date: string) {
  return `${date.slice(0, 8)}01`;
}

function shiftMonth(monthStart: string, by: number) {
  const d = parseDate(monthStart);
  return toDateString(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + by, 1)));
}

export function DateRangeCalendar({ value, onChange, booked = new Set(), months = 1, maxNights = 30 }: Props) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const now = today();
  const [firstMonth, setFirstMonth] = useState(startOfMonth(value.checkIn ?? now));
  const [hovered, setHovered] = useState<string | null>(null);

  const pickingCheckOut = Boolean(value.checkIn && !value.checkOut);

  // When choosing check-out, the latest allowed day is the first booked night
  // after check-in: you can check out the morning the next guest checks in.
  const lastCheckOut = useMemo(() => {
    if (!pickingCheckOut) return null;
    let d = value.checkIn!;
    for (let i = 0; i < maxNights; i++) {
      if (booked.has(d)) return d;
      d = addDays(d, 1);
    }
    return d;
  }, [pickingCheckOut, value.checkIn, booked, maxNights]);

  function isDisabled(day: string) {
    if (day < now) return true;
    if (pickingCheckOut && day > value.checkIn!) return day > lastCheckOut!;
    return booked.has(day); // as a check-in, the night itself must be free
  }

  function handleClick(day: string) {
    if (isDisabled(day)) return;
    if (pickingCheckOut && day > value.checkIn!) onChange({ checkIn: value.checkIn, checkOut: day });
    else onChange({ checkIn: day, checkOut: undefined });
  }

  // While picking check-out, hovering previews the range.
  const rangeEnd = value.checkOut ?? (pickingCheckOut && hovered && hovered > value.checkIn! && !isDisabled(hovered) ? hovered : null);

  const canGoBack = firstMonth > startOfMonth(now);
  const monthStarts = Array.from({ length: months }, (_, i) => shiftMonth(firstMonth, i));
  const weekdays = Array.from({ length: 7 }, (_, i) => fmt.weekday(parseDate(addDays("2026-01-04", i)))); // a Sunday

  return (
    <div className={styles.calendar} onMouseLeave={() => setHovered(null)}>
      <div className={styles.nav}>
        <button
          type="button"
          className={`btn btn-ghost ${styles.navBtn}`}
          onClick={() => setFirstMonth(shiftMonth(firstMonth, -1))}
          disabled={!canGoBack}
          aria-label={t("details.prevMonth")}
        >
          <ChevronLeft size="1.25rem" className={styles.flip} />
        </button>
        <button
          type="button"
          className={`btn btn-ghost ${styles.navBtn}`}
          onClick={() => setFirstMonth(shiftMonth(firstMonth, 1))}
          aria-label={t("details.nextMonth")}
        >
          <ChevronRight size="1.25rem" className={styles.flip} />
        </button>
      </div>

      <div className={styles.months} data-count={months}>
        {monthStarts.map((monthStart) => (
          <div key={monthStart} className={styles.month}>
            <h3 className={styles.title}>{fmt.monthTitle(parseDate(monthStart))}</h3>
            <div className={styles.grid} role="grid">
              {weekdays.map((w, i) => (
                <span key={i} className={styles.weekday} aria-hidden="true">
                  {w}
                </span>
              ))}
              {monthDays(monthStart).map((day, i) => {
                if (!day) return <span key={`blank-${i}`} />;
                const disabled = isDisabled(day);
                const isStart = day === value.checkIn;
                const isEnd = day === rangeEnd;
                const inRange = value.checkIn && rangeEnd && day > value.checkIn && day < rangeEnd;
                const classes = [
                  styles.day,
                  disabled && styles.disabled,
                  booked.has(day) && styles.booked,
                  inRange && styles.inRange,
                  (isStart || isEnd) && styles.selected,
                  isStart && rangeEnd && styles.rangeStart,
                  isEnd && styles.rangeEnd,
                  day === now && styles.today,
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <button
                    key={day}
                    type="button"
                    className={classes}
                    disabled={disabled}
                    onClick={() => handleClick(day)}
                    onMouseEnter={() => setHovered(day)}
                    aria-pressed={isStart || isEnd}
                    aria-label={`${fmt.longDate(day)}${booked.has(day) ? `, ${t("details.booked")}` : ""}`}
                  >
                    {Number(day.slice(8))}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
