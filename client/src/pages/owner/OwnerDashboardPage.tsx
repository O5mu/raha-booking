import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { api } from "../../api/client";
import type { OwnerBooking, OwnerIstiraha } from "../../api/types";
import { useFormat } from "../../lib/format";
import { nightsBetween, today } from "../../lib/dates";
import { useMediaQuery } from "../../lib/useMediaQuery";
import { StatRow, StatTile, StatusBadge } from "../../components/Dashboard";
import { NightsTimeline, TimelineLegend, clip } from "../../components/NightsTimeline";
import { ErrorState, PageLoader } from "../../components/States";
import { ManageDatesDialog } from "./ManageDatesDialog";
import styles from "../../components/Dashboard.module.css";

const NIGHTS = 14; // the summary's window: tonight and the 13 nights after it

export function OwnerDashboardPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const queryClient = useQueryClient();
  const [datesFor, setDatesFor] = useState<OwnerIstiraha | null>(null);
  // A phone draws one week of the timeline; wider screens draw two.
  const shown = useMediaQuery("(max-width: 600px)") ? 7 : NIGHTS;

  const listings = useQuery({
    queryKey: ["owner", "istirahas"],
    queryFn: () => api<{ istirahas: OwnerIstiraha[] }>("/owner/istirahas"),
  });
  const bookings = useQuery({
    queryKey: ["owner", "bookings"],
    queryFn: () => api<{ bookings: OwnerBooking[] }>("/owner/bookings"),
  });

  const visibility = useMutation({
    mutationFn: ({ id, hidden }: { id: number; hidden: boolean }) =>
      api(`/owner/istirahas/${id}/visibility`, { method: "PATCH", body: { hidden } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["owner", "istirahas"] }),
  });

  if (listings.isPending || bookings.isPending) return <PageLoader />;
  if (listings.isError || bookings.isError) return <ErrorState onRetry={() => queryClient.invalidateQueries({ queryKey: ["owner"] })} />;

  const now = today();
  const items = listings.data.istirahas;
  const entries = bookings.data.bookings.filter((b) => b.status === "confirmed");
  const upcoming = entries
    .filter((b) => b.kind === "booking" && b.check_out > now)
    .sort((a, b) => a.check_in.localeCompare(b.check_in)); // API is newest-first; arrivals read soonest-first

  // Only listings that can take guests go on the timeline.
  const onCalendar = items.filter((i) => i.status === "approved" || i.status === "hidden");
  // The screen's finding: how many of the next 14 nights are already sold.
  const sold = upcoming.reduce((sum, b) => {
    const span = clip(b, now, NIGHTS);
    return span ? sum + span.to - span.from : sum;
  }, 0);

  // The arrivals list stops level with the istirahas list beside it.
  const arriving = upcoming.filter((b) => b.check_in >= now);
  const arrivals = arriving.slice(0, Math.max(items.length, 3));

  return (
    <div className="container page">
      <div className={styles.head}>
        <div>
          <h1>{t("owner.overview")}</h1>
          <p>{t("owner.summary", { sold, total: onCalendar.length * NIGHTS })}</p>
        </div>
        <Link to="/owner/istirahas/new" className="btn btn-primary">
          <Plus size={16} />
          {t("owner.add")}
        </Link>
      </div>

      <StatRow count={4}>
        <StatTile label={t("owner.liveListings")} value={items.filter((i) => i.status === "approved").length} />
        <StatTile label={t("owner.upcomingBookings")} value={upcoming.length} />
        <StatTile label={t("owner.upcomingRevenue")} value={fmt.money(upcoming.reduce((sum, b) => sum + b.total_price, 0))} money />
        <StatTile label={t("owner.pendingReview")} value={items.filter((i) => i.status === "pending").length} />
      </StatRow>

      <section className={styles.panel} aria-labelledby="nights-title">
        <div className={styles.panelHead}>
          <h2 id="nights-title">{t("owner.nightsTitle", { count: shown })}</h2>
          <TimelineLegend />
        </div>
        {onCalendar.length === 0 ? (
          <p className={styles.empty}>{t("owner.noListings")}</p>
        ) : (
          <NightsTimeline istirahas={onCalendar} entries={entries} start={now} nights={shown} />
        )}
      </section>

      <div className={styles.pair}>
        <section className={styles.panel} aria-labelledby="listings-title">
          <div className={styles.panelHead}>
            <h2 id="listings-title">{t("owner.yourListings")}</h2>
            <span className={styles.panelNote}>{items.length}</span>
          </div>
          {items.length === 0 ? (
            <div className={styles.empty}>
              <p>{t("owner.noListings")}</p>
              <Link to="/owner/istirahas/new" className="btn btn-secondary" style={{ marginTop: 12 }}>
                {t("owner.add")}
              </Link>
            </div>
          ) : (
            <ul className={`${styles.rows} ${styles.withActions}`}>
              {items.map((i) => (
                <li key={i.id} className={styles.row}>
                  <img src={i.photos[0]} alt="" loading="lazy" />
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>
                      <span>{fmt.pick(i, "name")}</span>
                      {i.status !== "approved" && <StatusBadge status={i.status} label={t(`status.${i.status}`)} />}
                    </span>
                    <span className={styles.rowSub}>
                      {t(`cities.${i.city}`)} · {fmt.money(i.price_per_night)} {t("search.perNight")}
                      <span className={styles.rowExtra}> · {t("owner.upcomingCount", { count: i.upcoming_bookings })}</span>
                    </span>
                  </div>
                  <div className={styles.rowActions}>
                    <Link to={`/owner/istirahas/${i.id}/edit`} className="btn btn-ghost">
                      {t("owner.edit")}
                    </Link>
                    <button className="btn btn-ghost" onClick={() => setDatesFor(i)}>
                      {t("owner.dates")}
                    </button>
                    {(i.status === "approved" || i.status === "hidden") && (
                      <button
                        className="btn btn-ghost"
                        disabled={visibility.isPending}
                        onClick={() => visibility.mutate({ id: i.id, hidden: i.status === "approved" })}
                      >
                        {i.status === "approved" ? t("owner.hide") : t("owner.show")}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="arrivals-title">
          <div className={styles.panelHead}>
            <h2 id="arrivals-title">{t("owner.arrivals")}</h2>
            <span className={styles.panelNote}>{t("owner.upcomingCount", { count: arriving.length })}</span>
          </div>
          {arriving.length === 0 ? (
            <p className={styles.empty}>{t("owner.noBookings")}</p>
          ) : (
            <>
              <ul className={styles.rows}>
                {arrivals.map((b) => (
                  <li key={b.id} className={`${styles.row} ${styles.plain}`}>
                    <div className={styles.rowMain}>
                      <span className={styles.rowTitle}>
                        <span dir="auto">{b.guest_name}</span>
                      </span>
                      <span className={styles.rowSub}>
                        {fmt.pick(b, "name")} · {t("bookings.guests", { count: b.guests ?? 0 })}
                      </span>
                    </div>
                    <div className={styles.rowEnd}>
                      <span>{fmt.dayDate(b.check_in)}</span>
                      <span>
                        {t("details.nights", { count: nightsBetween(b.check_in, b.check_out) })} · {fmt.money(b.total_price)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              {arriving.length > arrivals.length && <p className={styles.more}>{t("owner.moreLater", { count: arriving.length - arrivals.length })}</p>}
            </>
          )}
        </section>
      </div>

      <ManageDatesDialog istiraha={datesFor} onClose={() => setDatesFor(null)} />
    </div>
  );
}
