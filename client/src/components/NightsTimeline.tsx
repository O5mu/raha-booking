import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import type { OwnerBooking, OwnerIstiraha } from "../api/types";
import { useFormat } from "../lib/format";
import { addDays, nightsBetween, parseDate } from "../lib/dates";
import styles from "./NightsTimeline.module.css";

// Which nights of the window an entry covers: [from, to) as column indexes.
// A stay from the 10th to the 12th covers the nights of the 10th and 11th,
// the same rule the database uses ('[)' date ranges).
export function clip(entry: { check_in: string; check_out: string }, start: string, nights: number) {
  const from = Math.max(0, nightsBetween(start, entry.check_in));
  const to = Math.min(nights, nightsBetween(start, entry.check_out));
  return to > from ? { from, to } : null;
}

// Thursday and Friday nights are the Saudi weekend, when istirahas fill up.
const isWeekend = (date: string) => [4, 5].includes(parseDate(date).getUTCDay());

// The owner's next nights: one row per istiraha, one column per night.
// Bookings are olive bars with the guest's first name; blocks are hatched.
export function NightsTimeline({ istirahas, entries, start, nights }: { istirahas: OwnerIstiraha[]; entries: OwnerBooking[]; start: string; nights: number }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const days = Array.from({ length: nights }, (_, i) => addDays(start, i));

  return (
    <div className={styles.scroll}>
      <div className={styles.grid} style={{ "--nights": nights } as CSSProperties}>
        <div className={styles.headRow} aria-hidden="true">
          <span />
          {days.map((d, i) => (
            <span key={d} className={`${styles.day} ${isWeekend(d) ? styles.weekend : ""} ${i === 0 ? styles.tonight : ""}`}>
              <small>{i === 0 ? t("owner.tonight") : fmt.weekdayShort(d)}</small>
              <b>{parseDate(d).getUTCDate()}</b>
            </span>
          ))}
        </div>

        {istirahas.map((ist, row) => {
          const name = fmt.pick(ist, "name");
          const bars = entries
            .filter((e) => e.istiraha_id === ist.id && e.status === "confirmed")
            .map((e) => ({ e, span: clip(e, start, nights) }))
            .filter((b): b is { e: OwnerBooking; span: { from: number; to: number } } => b.span !== null);

          return (
            <div key={ist.id} className={styles.row}>
              <span className={styles.name} title={name}>
                {name}
              </span>
              {days.map((d, i) => (
                <span key={d} className={`${styles.cell} ${isWeekend(d) ? styles.weekend : ""}`} style={{ "--from": i } as CSSProperties} />
              ))}
              {bars.map(({ e, span }) => {
                const label =
                  e.kind === "block"
                    ? `${t("owner.blocked")}, ${fmt.range(e.check_in, e.check_out)}`
                    : `${e.guest_name}, ${fmt.range(e.check_in, e.check_out)}`;
                return (
                  <motion.span
                    key={e.id}
                    role="img"
                    aria-label={`${name}: ${label}`}
                    title={label}
                    className={`${styles.bar} ${e.kind === "block" ? styles.block : ""} ${span.from === 0 && e.check_in < start ? styles.cutStart : ""}`}
                    style={{ "--from": span.from, "--to": span.to, originX: fmt.lang === "ar" ? 1 : 0 } as CSSProperties}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.6, delay: 0.1 + row * 0.04 + span.from * 0.01 }}
                  >
                    {/* dir=auto: a Latin name keeps its ellipsis at its own end on an Arabic page. */}
                    <span className={styles.barText} dir="auto">
                      {e.kind === "block" ? t("owner.blockedShort") : e.guest_name.split(" ")[0]}
                    </span>
                  </motion.span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TimelineLegend() {
  const { t } = useTranslation();
  return (
    <ul className={styles.legend}>
      <li>
        <span className={styles.swatch} />
        {t("owner.legendBooked")}
      </li>
      <li>
        <span className={`${styles.swatch} ${styles.block}`} />
        {t("owner.blocked")}
      </li>
      <li>
        <span className={`${styles.swatch} ${styles.weekendSwatch}`} />
        {t("owner.legendWeekend")}
      </li>
    </ul>
  );
}
