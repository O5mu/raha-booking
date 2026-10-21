import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { api } from "../../api/client";
import type { AdminBooking, AdminIstiraha, AdminStats, AdminUser, ListingStatus } from "../../api/types";
import { useFormat } from "../../lib/format";
import { StatRow, StatTile, StatusBadge } from "../../components/Dashboard";
import { ErrorState, PageLoader } from "../../components/States";
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
  // Tab counts appear once each list has loaded.
  const counts = { listings: all.length, users: users.data?.users.length, bookings: bookings.data?.bookings.length };

  return (
    <div className="container page">
      <div className={styles.head}>
        <div>
          <h1>{t("admin.title")}</h1>
          <p>{t("admin.summary", { count: pending.length })}</p>
        </div>
      </div>

      <StatRow count={5}>
        <StatTile label={t("admin.users")} value={s.users} />
        <StatTile label={t("admin.liveListings")} value={s.live_listings} />
        <StatTile label={t("admin.pending")} value={s.pending_listings} />
        <StatTile label={t("admin.bookings")} value={s.confirmed_bookings} />
        <StatTile label={t("admin.value")} value={fmt.money(s.total_value)} money />
      </StatRow>

      {/* The queue comes first: it is the work. */}
      <section className={styles.panel} aria-labelledby="queue-title">
        <div className={styles.panelHead}>
          <h2 id="queue-title">{t("admin.queue")}</h2>
          <span className={styles.panelNote}>{pending.length}</span>
        </div>
        {pending.length === 0 ? (
          <p className={styles.empty}>{t("admin.queueEmpty")}</p>
        ) : (
          <ul className={`${styles.rows} ${styles.withActions}`}>
            <AnimatePresence initial={false}>
              {pending.map((i) => (
                <motion.li layout exit={{ opacity: 0 }} key={i.id} className={styles.row}>
                  <img src={i.cover_photo} alt="" loading="lazy" />
                  <div className={styles.rowMain}>
                    <span className={styles.rowTitle}>
                      <span>{fmt.pick(i, "name")}</span>
                    </span>
                    <span className={styles.rowSub}>
                      {fmt.place(i)} · {fmt.money(i.price_per_night)} {t("search.perNight")} · {t("admin.owner", { name: i.owner_name })}
                    </span>
                  </div>
                  <div className={styles.rowActions}>
                    <button className="btn btn-secondary" disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: i.id, status: "approved" })}>
                      <Check size="1rem" />
                      {t("admin.approve")}
                    </button>
                    <button className={`btn btn-ghost ${local.reject}`} disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: i.id, status: "rejected" })}>
                      {t("admin.reject")}
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>

      <section className={`${styles.panel} ${local.records}`}>
        <div className={styles.tabs} role="tablist">
          {(["listings", "users", "bookings"] as const).map((key) => (
            <button key={key} role="tab" aria-selected={tab === key} className={styles.tab} onClick={() => setTab(key)}>
              {tab === key && <motion.span layoutId="admin-tab" className={styles.highlight} />}
              <span>{t(`admin.tab${key[0].toUpperCase()}${key.slice(1)}`)}</span>
              {counts[key] !== undefined && <span className={styles.count}>{counts[key]}</span>}
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
                    <th className={styles.num}>{t("admin.colPrice")}</th>
                    <th>{t("admin.colStatus")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((i) => (
                    <tr key={i.id}>
                      <td>{i.status === "approved" ? <Link to={`/istirahas/${i.id}`}>{fmt.pick(i, "name")}</Link> : fmt.pick(i, "name")}</td>
                      <td>{t(`cities.${i.city}`)}</td>
                      <td>{i.owner_name}</td>
                      <td className={styles.num}>{fmt.money(i.price_per_night)}</td>
                      <td>
                        {/* Live is the usual state, so it stays plain; only the exceptions get a pill. */}
                        {i.status === "approved" ? <span className={local.live}>{t("status.approved")}</span> : <StatusBadge status={i.status} label={t(`status.${i.status}`)} />}
                      </td>
                      <td className={local.action}>
                        {i.status === "approved" ? (
                          <button className="btn btn-ghost" onClick={() => setStatus.mutate({ id: i.id, status: "hidden" })}>
                            {t("admin.hideListing")}
                          </button>
                        ) : i.status !== "pending" ? (
                          <button className="btn btn-ghost" onClick={() => setStatus.mutate({ id: i.id, status: "approved" })}>
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
                    <th className={styles.num}>{t("admin.joined")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.data?.users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td dir="ltr">{u.email}</td>
                      <td>{t(`admin.roles.${u.role}`)}</td>
                      <td className={styles.num}>{u.created_at.slice(0, 10)}</td>
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
                    <th className={styles.num}>#</th>
                    <th>{t("owner.guest")}</th>
                    <th>{t("owner.istiraha")}</th>
                    <th>{t("owner.dates")}</th>
                    <th className={styles.num}>{t("owner.amount")}</th>
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
