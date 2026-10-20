import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { api } from "../api/client";
import type { Booking } from "../api/types";
import { useFormat } from "../lib/format";
import { nightsBetween } from "../lib/dates";
import { ErrorState, PageLoader } from "../components/States";
import styles from "./BookingConfirmedPage.module.css";

export function BookingConfirmedPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const fmt = useFormat();
  const { data, isPending } = useQuery({
    queryKey: ["bookings", "mine"],
    queryFn: () => api<{ bookings: Booking[] }>("/bookings/mine"),
  });

  if (isPending) return <PageLoader />;
  const booking = data?.bookings.find((b) => b.id === Number(id));
  if (!booking) return <ErrorState />;
  const name = fmt.pick(booking, "name");

  return (
    <div className={`container page ${styles.page}`}>
      <motion.div
        className={styles.check}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.35, duration: 0.6 }}
      >
        <Check size={40} strokeWidth={3} />
      </motion.div>
      <h1>{t("confirmed.title")}</h1>
      <p className="muted">{t("confirmed.subtitle", { name })}</p>

      <motion.div
        className={`card ${styles.summary}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0, duration: 0.5, delay: 0.15 }}
      >
        <img src={booking.cover_photo} alt="" />
        <div className={styles.details}>
          <span className="badge badge-success">{t("confirmed.reference", { id: booking.id })}</span>
          <h3>{name}</h3>
          <p className="muted">{t(`cities.${booking.city}`)}</p>
          <dl>
            <div>
              <dt>{t("details.checkIn")}</dt>
              <dd>{fmt.longDate(booking.check_in)}</dd>
            </div>
            <div>
              <dt>{t("details.checkOut")}</dt>
              <dd>{fmt.longDate(booking.check_out)}</dd>
            </div>
            <div>
              <dt>{t("search.guests")}</dt>
              <dd>{booking.guests}</dd>
            </div>
            <div className={styles.total}>
              <dt>
                {t("details.total")} ({t("details.nights", { count: nightsBetween(booking.check_in, booking.check_out) })})
              </dt>
              <dd>{fmt.money(booking.total_price)}</dd>
            </div>
          </dl>
        </div>
      </motion.div>

      <div className={styles.actions}>
        <Link to="/bookings" className="btn btn-primary">
          {t("confirmed.viewBookings")}
        </Link>
        <Link to="/search" className="btn btn-secondary">
          {t("confirmed.keepExploring")}
        </Link>
      </div>
    </div>
  );
}
