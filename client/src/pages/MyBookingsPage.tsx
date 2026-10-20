import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { CalendarX2 } from "lucide-react";
import { api } from "../api/client";
import type { Booking } from "../api/types";
import { useFormat } from "../lib/format";
import { nightsBetween, today } from "../lib/dates";
import { EmptyState, ErrorState, PageLoader } from "../components/States";
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
  const list = query.data.bookings.filter((b) => tabOf(b, now) === tab);
  // Upcoming trips read best soonest-first; the API returns newest-first.
  if (tab === "upcoming") list.reverse();

  return (
    <div className="container page">
      <h1 className={styles.title}>{t("bookings.title")}</h1>

      {/* Segmented control: the highlight slides between tabs with a shared layout animation. */}
      <div className={styles.tabs} role="tablist">
        {(["upcoming", "past", "cancelled"] as const).map((key) => (
          <button key={key} role="tab" aria-selected={tab === key} className={styles.tab} onClick={() => setTab(key)}>
            {tab === key && <motion.span layoutId="tab-highlight" className={styles.highlight} />}
            <span className={styles.tabLabel}>{t(`bookings.${key}`)}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<CalendarX2 size={28} />} title={t("bookings.empty")}>
          <Link to="/search" className="btn btn-primary">
            {t("bookings.findPlace")}
          </Link>
        </EmptyState>
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
    },
  });

  const name = fmt.pick(booking, "name");
  const nights = nightsBetween(booking.check_in, booking.check_out);

  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }} className={`card ${styles.row}`}>
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
        <p className="muted">
          {t(`cities.${booking.city}`)} · {fmt.range(booking.check_in, booking.check_out)} · {t("details.nights", { count: nights })} ·{" "}
          {t("bookings.guests", { count: booking.guests })}
        </p>
        <p className={styles.price}>{fmt.money(booking.total_price)}</p>

        {canCancel &&
          (confirming ? (
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
          ) : (
            <button className={`btn btn-ghost ${styles.cancelBtn}`} onClick={() => setConfirming(true)}>
              {t("bookings.cancel")}
            </button>
          ))}
        {cancel.isError && <p className="form-error">{(cancel.error as Error).message}</p>}
      </div>
    </motion.li>
  );
}
