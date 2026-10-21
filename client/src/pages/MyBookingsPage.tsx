import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { api } from "../api/client";
import type { Booking } from "../api/types";
import { useFormat } from "../lib/format";
import { nightsBetween, today } from "../lib/dates";
import { ErrorState, PageLoader } from "../components/States";
import styles from "./MyBookingsPage.module.css";

type Tab = "upcoming" | "past" | "cancelled";

function tabOf(b: Booking, now: string): Tab {
  if (b.status === "cancelled") return "cancelled";
  return b.check_out > now ? "upcoming" : "past";
}

export function MyBookingsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("upcoming");
  const query = useQuery({
    queryKey: ["bookings", "mine"],
    queryFn: () => api<{ bookings: Booking[] }>("/bookings/mine"),
  });

  if (query.isPending) return <PageLoader />;
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} />;

  const now = today();
  const all = query.data.bookings;
  const list = all.filter((b) => tabOf(b, now) === tab);
  // Upcoming trips read best soonest-first; the API returns newest-first.
  if (tab === "upcoming") list.reverse();

  return (
    <div className="container page">
      <h1 className={styles.title}>{t("bookings.title")}</h1>

      {/* Underline tabs; the 2px indicator slides to the chosen one. The counts come from the rows. */}
      <div className={styles.tabs} role="tablist">
        {(["upcoming", "past", "cancelled"] as const).map((key) => (
          <button key={key} role="tab" aria-selected={tab === key} className={styles.tab} onClick={() => setTab(key)}>
            {tab === key && <motion.span layoutId="tab-highlight" className={styles.highlight} />}
            <span className={styles.tabLabel}>{t(`bookings.${key}`)}</span>
            <span className={styles.count}>{all.filter((b) => tabOf(b, now) === key).length}</span>
          </button>
        ))}
      </div>

      <div className={styles.layout}>
        <div>
          {list.length === 0 ? (
            <div className={styles.empty}>
              <p>{t("bookings.empty")}</p>
              <Link to="/search" className="btn btn-primary" style={{ marginTop: "0.75rem" }}>
                {t("bookings.findPlace")}
              </Link>
            </div>
          ) : (
            <ul className={styles.list}>
              <AnimatePresence initial={false}>
                {list.map((b) => (
                  <BookingRow key={b.id} booking={b} canCancel={tab === "upcoming" && b.check_in > now} />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
        {tab === "upcoming" && list[0] && <NextStay booking={list[0]} now={now} />}
      </div>
    </div>
  );
}

// Beside the list: the soonest stay, with when it starts and the gate hours.
function NextStay({ booking, now }: { booking: Booking; now: string }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const days = Math.max(0, nightsBetween(now, booking.check_in));
  return (
    <aside className={styles.next} aria-labelledby="next-stay">
      <img src={booking.cover_photo} alt="" />
      <div className={styles.nextBody}>
        <h2 id="next-stay">{t("bookings.nextStay")}</h2>
        <p className={styles.nextWhen}>{t("bookings.when", { count: days })}</p>
        <p>
          {fmt.pick(booking, "name")}, {fmt.place(booking)}
        </p>
        <p className={styles.meta}>
          {fmt.longDate(booking.check_in)}. {t("home.checkIn")}.
        </p>
      </div>
    </aside>
  );
}

function BookingRow({ booking, canCancel }: { booking: Booking; canCancel: boolean }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const cancel = useMutation({
    mutationFn: () => api(`/bookings/${booking.id}/cancel`, { method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["istiraha", String(booking.istiraha_id)] });
      queryClient.invalidateQueries({ queryKey: ["istirahas"] });
    },
  });

  const name = fmt.pick(booking, "name");
  const nights = nightsBetween(booking.check_in, booking.check_out);

  return (
    <motion.li layout exit={{ opacity: 0 }} className={styles.row}>
      <Link to={`/istirahas/${booking.istiraha_id}`} className={styles.thumb}>
        <img src={booking.cover_photo} alt="" loading="lazy" />
      </Link>
      <div className={styles.info}>
        <div className={styles.top}>
          <Link to={`/istirahas/${booking.istiraha_id}`}>
            <h3>{name}</h3>
          </Link>
          {booking.status === "cancelled" && <span className="badge badge-danger">{t("bookings.cancelledBadge")}</span>}
        </div>
        <p className={styles.meta}>
          {t(`cities.${booking.city}`)} · {fmt.range(booking.check_in, booking.check_out)} · {t("details.nights", { count: nights })} ·{" "}
          {t("bookings.guests", { count: booking.guests })}
        </p>
      </div>
      <div className={styles.end}>
        <p className={styles.price}>{fmt.money(booking.total_price)}</p>
        {canCancel && !confirming && (
          <button className={`btn btn-ghost ${styles.cancelBtn}`} onClick={() => setConfirming(true)}>
            {t("bookings.cancel")}
          </button>
        )}
      </div>
      {confirming && (
        <div className={styles.confirm} role="alertdialog" aria-label={t("bookings.confirmCancel")}>
          <p>{t("bookings.confirmCancel")}</p>
          <div>
            <button className="btn btn-danger" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
              {t("bookings.yesCancel")}
            </button>
            <button className="btn btn-ghost" onClick={() => setConfirming(false)}>
              {t("bookings.keep")}
            </button>
          </div>
        </div>
      )}
      {cancel.isError && <p className="form-error">{(cancel.error as Error).message}</p>}
    </motion.li>
  );
}
