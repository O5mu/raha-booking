import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CalendarRange, Eye, EyeOff, Home, Pencil, Plus } from "lucide-react";
import { api } from "../../api/client";
import type { OwnerBooking, OwnerIstiraha } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { useFormat } from "../../lib/format";
import { today } from "../../lib/dates";
import { StatRow, StatTile, StatusBadge } from "../../components/Dashboard";
import { EmptyState, ErrorState, PageLoader } from "../../components/States";
import { ManageDatesDialog } from "./ManageDatesDialog";
import styles from "../../components/Dashboard.module.css";

export function OwnerDashboardPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [datesFor, setDatesFor] = useState<OwnerIstiraha | null>(null);

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
  const upcoming = bookings.data.bookings
    .filter((b) => b.kind === "booking" && b.status === "confirmed" && b.check_out > now)
    .reverse(); // API is newest-first; upcoming reads best soonest-first

  return (
    <div className="container page">
      <div className={styles.head}>
        <div>
          <h1>{t("owner.title", { name: user!.name.split(" ")[0] })}</h1>
          <p className="muted">{t("owner.subtitle")}</p>
        </div>
        <Link to="/owner/istirahas/new" className="btn btn-primary">
          <Plus size={18} />
          {t("owner.add")}
        </Link>
      </div>

      <StatRow>
        <StatTile label={t("owner.liveListings")} value={items.filter((i) => i.status === "approved").length} />
        <StatTile label={t("owner.upcomingBookings")} value={upcoming.length} />
        <StatTile label={t("owner.upcomingRevenue")} value={fmt.compact(upcoming.reduce((sum, b) => sum + b.total_price, 0))} />
        <StatTile label={t("owner.pendingReview")} value={items.filter((i) => i.status === "pending").length} />
      </StatRow>

      <section className={styles.section}>
        <h2>{t("owner.yourListings")}</h2>
        {items.length === 0 ? (
          <EmptyState icon={<Home size={28} />} title={t("owner.noListings")}>
            <Link to="/owner/istirahas/new" className="btn btn-primary">
              {t("owner.add")}
            </Link>
          </EmptyState>
        ) : (
          <div className={styles.listings}>
            {items.map((i) => (
              <div key={i.id} className={`card ${styles.listing}`}>
                <img src={i.photos[0]} alt="" loading="lazy" />
                <div className={styles.listingInfo}>
                  <div className={styles.listingTitle}>
                    <h3>{fmt.pick(i, "name")}</h3>
                    <StatusBadge status={i.status} label={t(`status.${i.status}`)} />
                  </div>
                  <p className="muted">
                    {t(`cities.${i.city}`)} · {fmt.money(i.price_per_night)} {t("search.perNight")}
                  </p>
                  <p className="muted">{t("owner.upcomingCount", { count: i.upcoming_bookings })}</p>
                </div>
                <div className={styles.actions}>
                  <Link to={`/owner/istirahas/${i.id}/edit`} className="btn btn-secondary">
                    <Pencil size={16} />
                    {t("owner.edit")}
                  </Link>
                  <button className="btn btn-secondary" onClick={() => setDatesFor(i)}>
                    <CalendarRange size={16} />
                    {t("owner.manageDates")}
                  </button>
                  {(i.status === "approved" || i.status === "hidden") && (
                    <button
                      className="btn btn-ghost"
                      disabled={visibility.isPending}
                      onClick={() => visibility.mutate({ id: i.id, hidden: i.status === "approved" })}
                    >
                      {i.status === "approved" ? <EyeOff size={16} /> : <Eye size={16} />}
                      {i.status === "approved" ? t("owner.hide") : t("owner.show")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2>{t("owner.bookingsTitle")}</h2>
        {upcoming.length === 0 ? (
          <p className="muted">{t("owner.noBookings")}</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("owner.guest")}</th>
                  <th>{t("owner.istiraha")}</th>
                  <th>{t("owner.dates")}</th>
                  <th>{t("search.guests")}</th>
                  <th>{t("owner.amount")}</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((b) => (
                  <tr key={b.id}>
                    <td>{b.guest_name}</td>
                    <td>{fmt.pick(b, "name")}</td>
                    <td>{fmt.range(b.check_in, b.check_out)}</td>
                    <td className={styles.num}>{b.guests}</td>
                    <td className={styles.num}>{fmt.money(b.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ManageDatesDialog istiraha={datesFor} onClose={() => setDatesFor(null)} />
    </div>
  );
}
