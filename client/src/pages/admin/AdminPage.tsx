import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Check, CheckCircle2, EyeOff, RotateCcw, X } from "lucide-react";
import { api } from "../../api/client";
import type { AdminBooking, AdminIstiraha, AdminStats, AdminUser, ListingStatus } from "../../api/types";
import { useFormat } from "../../lib/format";
import { StatRow, StatTile, StatusBadge } from "../../components/Dashboard";
import { EmptyState, ErrorState, PageLoader } from "../../components/States";
import styles from "../../components/Dashboard.module.css";
import local from "./AdminPage.module.css";

type Tab = "listings" | "users" | "bookings";

export function AdminPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("listings");
  const [filter, setFilter] = useState<ListingStatus | "all">("all");

  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => api<{ stats: AdminStats }>("/admin/stats") });
  const listings = useQuery({ queryKey: ["admin", "istirahas"], queryFn: () => api<{ istirahas: AdminIstiraha[] }>("/admin/istirahas") });
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: () => api<{ users: AdminUser[] }>("/admin/users"), enabled: tab === "users" });
  const bookings = useQuery({ queryKey: ["admin", "bookings"], queryFn: () => api<{ bookings: AdminBooking[] }>("/admin/bookings"), enabled: tab === "bookings" });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ListingStatus }) =>
      api(`/admin/istirahas/${id}/status`, { method: "PATCH", body: { status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      // Public search results and city counts change too.
      queryClient.invalidateQueries({ queryKey: ["istirahas"] });
      queryClient.invalidateQueries({ queryKey: ["cities"] });
    },
  });

  if (stats.isPending || listings.isPending) return <PageLoader />;
  if (stats.isError || listings.isError) return <ErrorState onRetry={() => queryClient.invalidateQueries({ queryKey: ["admin"] })} />;

  const s = stats.data.stats;
  const all = listings.data.istirahas;
  const pending = all.filter((i) => i.status === "pending");
  const shown = filter === "all" ? all : all.filter((i) => i.status === filter);

  return (
    <div className="container page">
      <div className={styles.head}>
        <div>
          <h1>{t("admin.title")}</h1>
          <p className="muted">{t("admin.subtitle")}</p>
        </div>
      </div>

      <StatRow>
        <StatTile label={t("admin.users")} value={s.users} />
        <StatTile label={t("admin.liveListings")} value={s.live_listings} />
        <StatTile label={t("admin.pending")} value={s.pending_listings} />
        <StatTile label={t("admin.bookings")} value={s.confirmed_bookings} />
        <StatTile label={t("admin.value")} value={fmt.compact(s.total_value)} />
      </StatRow>

      <section className={styles.section}>
        <h2>{t("admin.queue")}</h2>
        {pending.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={28} />} title={t("admin.queueEmpty")} />
        ) : (
          <div className={styles.listings}>
            {pending.map((i) => (
              <motion.div layout key={i.id} className={`card ${styles.listing}`}>
                <img src={i.cover_photo} alt="" loading="lazy" />
                <div className={styles.listingInfo}>
                  <h3>{fmt.pick(i, "name")}</h3>
                  <p className="muted">
                    {fmt.place(i)} · {fmt.money(i.price_per_night)} {t("search.perNight")}
                  </p>
                  <p className="muted">{t("admin.owner", { name: i.owner_name })}</p>
                </div>
                <div className={styles.actions}>
                  <button className="btn btn-primary" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: i.id, status: "approved" })}>
                    <Check size={16} />
                    {t("admin.approve")}
                  </button>
                  <button className="btn btn-danger" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: i.id, status: "rejected" })}>
                    <X size={16} />
                    {t("admin.reject")}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={local.tabs} role="tablist">
          {(["listings", "users", "bookings"] as const).map((key) => (
            <button key={key} role="tab" aria-selected={tab === key} className={local.tab} onClick={() => setTab(key)}>
              {tab === key && <motion.span layoutId="admin-tab" className={local.highlight} />}
              <span className={local.tabLabel}>{t(`admin.tab${key[0].toUpperCase()}${key.slice(1)}`)}</span>
            </button>
          ))}
        </div>

        {tab === "listings" && (
          <>
            <div className={local.filters}>
              {(["all", "approved", "pending", "hidden", "rejected"] as const).map((f) => (
                <button key={f} className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                  {f === "all" ? t("admin.filterAll") : t(`status.${f}`)}
                </button>
              ))}
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("owner.istiraha")}</th>
                    <th>{t("owner.city")}</th>
                    <th>{t("admin.colOwner")}</th>
                    <th>{t("admin.colPrice")}</th>
                    <th>{t("admin.colStatus")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((i) => (
                    <tr key={i.id}>
                      <td>
                        {i.status === "approved" ? <Link to={`/istirahas/${i.id}`}>{fmt.pick(i, "name")}</Link> : fmt.pick(i, "name")}
                      </td>
                      <td>{t(`cities.${i.city}`)}</td>
                      <td>{i.owner_name}</td>
                      <td className={styles.num}>{fmt.money(i.price_per_night)}</td>
                      <td>
                        <StatusBadge status={i.status} label={t(`status.${i.status}`)} />
                      </td>
                      <td>
                        {i.status === "approved" ? (
                          <button className="btn btn-ghost" onClick={() => setStatus.mutate({ id: i.id, status: "hidden" })}>
                            <EyeOff size={16} />
                            {t("admin.hideListing")}
                          </button>
                        ) : i.status !== "pending" ? (
                          <button className="btn btn-ghost" onClick={() => setStatus.mutate({ id: i.id, status: "approved" })}>
                            <RotateCcw size={16} />
                            {t("admin.restore")}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "users" &&
          (users.isPending ? (
            <PageLoader />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("admin.name")}</th>
                    <th>{t("admin.email")}</th>
                    <th>{t("admin.role")}</th>
                    <th>{t("admin.joined")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.data?.users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td dir="ltr">{u.email}</td>
                      <td>{t(`admin.roles.${u.role}`)}</td>
                      <td>{fmt.shortDate(u.created_at.slice(0, 10))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {tab === "bookings" &&
          (bookings.isPending ? (
            <PageLoader />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t("owner.guest")}</th>
                    <th>{t("owner.istiraha")}</th>
                    <th>{t("owner.dates")}</th>
                    <th>{t("owner.amount")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {bookings.data?.bookings.map((b) => (
                    <tr key={b.id}>
                      <td className={styles.num}>{b.id}</td>
                      <td>{b.guest_name}</td>
                      <td>{fmt.pick(b, "name")}</td>
                      <td>{fmt.range(b.check_in, b.check_out)}</td>
                      <td className={styles.num}>{fmt.money(b.total_price)}</td>
                      <td>{b.status === "cancelled" && <span className="badge badge-danger">{t("bookings.cancelledBadge")}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </section>
    </div>
  );
}
