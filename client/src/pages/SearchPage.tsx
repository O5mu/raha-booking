import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SearchX } from "lucide-react";
import { api } from "../api/client";
import type { SearchResponse } from "../api/types";
import { SearchBar, toSearchParams } from "../components/SearchBar";
import { IstirahaCard, IstirahaCardSkeleton } from "../components/IstirahaCard";
import { AmenityIcon } from "../components/AmenityIcon";
import { EmptyState, ErrorState } from "../components/States";
import { useFormat } from "../lib/format";
import cardStyles from "../components/IstirahaCard.module.css";
import styles from "./SearchPage.module.css";

const FILTER_AMENITIES = ["pool", "kids_pool", "majlis", "football", "bbq", "firepit", "kids_area", "wifi"];
const PRICES = [800, 1200, 2000, 3000];

export function SearchPage() {
  const { t } = useTranslation();
  const fmt = useFormat();
  // The URL is the single source of truth for the search, so results can be
  // shared, bookmarked and restored with the back button.
  const [params, setParams] = useSearchParams();
  const city = params.get("city") ?? undefined;
  const checkIn = params.get("checkIn") ?? undefined;
  const checkOut = params.get("checkOut") ?? undefined;
  const guests = Number(params.get("guests")) || undefined;
  const amenities = params.get("amenities")?.split(",").filter(Boolean) ?? [];
  const maxPrice = params.get("maxPrice") ?? "";
  const sort = params.get("sort") ?? "recommended";
  const page = Number(params.get("page")) || 1;

  const query = useQuery({
    queryKey: ["istirahas", params.toString()],
    queryFn: () => api<SearchResponse>(`/istirahas?${params}`),
    placeholderData: keepPreviousData, // keep old results on screen while new ones load
  });

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in changes)) next.delete("page");
    setParams(next);
  }

  function toggleAmenity(a: string) {
    const set = new Set(amenities);
    if (set.has(a)) set.delete(a);
    else set.add(a);
    update({ amenities: [...set].join(",") });
  }

  const pages = query.data ? Math.ceil(query.data.total / query.data.pageSize) : 1;
  // Pass dates and guests on to the details page.
  const carry = toSearchParams({ checkIn, checkOut, guests }).toString();

  return (
    <div className="container page">
      <SearchBar key={params.toString()} initial={{ city, checkIn, checkOut, guests }} compact />

      <div className={styles.filters}>
        <div className={styles.chips}>
          {FILTER_AMENITIES.map((a) => (
            <button key={a} className="chip" aria-pressed={amenities.includes(a)} onClick={() => toggleAmenity(a)}>
              <AmenityIcon name={a} size={15} />
              {t(`amenities.${a}`)}
            </button>
          ))}
        </div>
        <div className={styles.selects}>
          <label>
            <span className="visually-hidden">{t("search.maxPrice")}</span>
            <select className="input" value={maxPrice} onChange={(e) => update({ maxPrice: e.target.value })}>
              <option value="">
                {t("search.anyPrice")}
              </option>
              {PRICES.map((p) => (
                <option key={p} value={p}>
                  ≤ {fmt.money(p)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="visually-hidden">{t("search.sort")}</span>
            <select className="input" value={sort} onChange={(e) => update({ sort: e.target.value })}>
              <option value="recommended">{t("search.sortRecommended")}</option>
              <option value="price_asc">{t("search.sortPriceAsc")}</option>
              <option value="price_desc">{t("search.sortPriceDesc")}</option>
            </select>
          </label>
        </div>
      </div>

      <h1 className={styles.heading}>
        {query.data ? t("search.results", { count: query.data.total }) : " "}
        {city && <span> {t("search.resultsIn", { city: t(`cities.${city}`) })}</span>}
        {checkIn && checkOut && <span className="muted"> · {t("search.available", { dates: fmt.range(checkIn, checkOut) })}</span>}
      </h1>

      {query.isError ? (
        <ErrorState message={(query.error as Error).message} onRetry={() => query.refetch()} />
      ) : query.data?.total === 0 ? (
        <EmptyState icon={<SearchX size={28} />} title={t("search.results", { count: 0 })}>
          <p className="muted">{t("search.noResultsHint")}</p>
          <button className="btn btn-secondary" onClick={() => setParams({})}>
            {t("search.clearFilters")}
          </button>
        </EmptyState>
      ) : (
        <div className={cardStyles.grid} style={{ opacity: query.isPlaceholderData ? 0.6 : 1, transition: "opacity 150ms" }}>
          {query.isPending
            ? Array.from({ length: 6 }, (_, i) => <IstirahaCardSkeleton key={i} />)
            : query.data?.results.map((i) => <IstirahaCard key={i.id} istiraha={i} query={carry ? `?${carry}` : ""} />)}
        </div>
      )}

      {pages > 1 && (
        <nav className={styles.pagination}>
          <button className="btn btn-secondary" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
            {t("search.previous")}
          </button>
          <span className="muted">{t("search.page", { page, pages })}</span>
          <button className="btn btn-secondary" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>
            {t("search.next")}
          </button>
        </nav>
      )}
    </div>
  );
}
