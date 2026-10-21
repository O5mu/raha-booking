import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { api } from "../api/client";
import type { Booking } from "../api/types";
import { useFormat } from "../lib/format";
import { nightsBetween } from "../lib/dates";
import { ErrorState, PageLoader } from "../components/States";
import { SplitPage } from "../components/SplitPage";
import split from "../components/SplitPage.module.css";
import styles from "./BookingConfirmedPage.module.css";

// Each part of the panel rises in after the one before it, 80ms apart.
const rise = (order: number) => ({
  initial: { opacity: 0, y: "1.5rem" },
  animate: { opacity: 1, y: "0rem" },
  transition: { type: "spring" as const, bounce: 0, duration: 0.7, delay: 0.1 + order * 0.08 },
});

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
  const nights = nightsBetween(booking.check_in, booking.check_out);

  return (
    <SplitPage photo={booking.cover_photo} alt={name}>
      <motion.h1 className={split.title} {...rise(0)}>
        {t("confirmed.title", { day: fmt.weekdayLong(booking.check_in) })}
      </motion.h1>
      <motion.p className={split.lead} {...rise(1)}>
        {t("confirmed.subtitle", { name })}
      </motion.p>

      {/* The ticket: one line per fact, the total last. */}
      <motion.dl className={styles.ticket} {...rise(2)}>
        <div>
          <dt>{t("confirmed.refLabel")}</dt>
          <dd>#{booking.id}</dd>
        </div>
        <div>
          <dt>{t("confirmed.place")}</dt>
          <dd>{fmt.place(booking)}</dd>
        </div>
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
            {t("details.total")}, {t("details.nights", { count: nights })}
          </dt>
          <dd>{fmt.money(booking.total_price)}</dd>
        </div>
      </motion.dl>

      <motion.p className={styles.hours} {...rise(3)}>
        {t("home.checkIn")}. {t("home.checkOut")}.
      </motion.p>

      <motion.div className={split.actions} {...rise(4)}>
        <Link to="/bookings" className="btn btn-primary btn-lg">
          {t("confirmed.viewBookings")}
        </Link>
        <Link to="/search" className="btn btn-secondary btn-lg">
          {t("confirmed.keepExploring")}
        </Link>
      </motion.div>
    </SplitPage>
  );
}
