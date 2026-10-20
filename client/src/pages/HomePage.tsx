import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { BadgeCheck, CalendarCheck, Languages } from "lucide-react";
import { api } from "../api/client";
import type { SearchResponse } from "../api/types";
import { SearchBar } from "../components/SearchBar";
import { IstirahaCard, IstirahaCardSkeleton } from "../components/IstirahaCard";
import cardStyles from "../components/IstirahaCard.module.css";
import styles from "./HomePage.module.css";

const HERO = "https://images.unsplash.com/photo-1613977257365-aaae5a9817ff?w=2000&q=80&auto=format&fit=crop";

const CITY_PHOTOS: Record<string, string> = {
  riyadh: "1734942439222-6452df2fd480",
  alahsa: "1789593847377-a0452ab3f3c9",
  jeddah: "1675657144361-98ae33e6b6f9",
  dammam: "1721989519334-40923a0ee1c0",
  khobar: "1694967832949-09984640b143",
  abha: "1416331108676-a22ccb276e35",
  taif: "1782203601219-c772fac676dc",
};

export function HomePage() {
  const { t } = useTranslation();
  const cities = useQuery({
    queryKey: ["cities"],
    queryFn: () => api<{ cities: { city: string; count: number }[] }>("/istirahas/cities"),
  });
  const featured = useQuery({
    queryKey: ["istirahas", "featured"],
    queryFn: () => api<SearchResponse>("/istirahas?sort=recommended"),
  });

  return (
    <>
      <section className={styles.hero}>
        <img src={HERO} alt="" className={styles.heroImage} />
        <div className={`container ${styles.heroContent}`}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <h1>{t("home.heroTitle")}</h1>
            <p className={styles.subtitle}>{t("home.heroSubtitle")}</p>
          </motion.div>
          <SearchBar />
        </div>
      </section>

      <section className="container page">
        <h2>{t("home.browseByCity")}</h2>
        <div className={styles.cities}>
          {(cities.data?.cities ?? []).map(({ city, count }) => (
            <Link key={city} to={`/search?city=${city}`} className={styles.city}>
              <img
                src={`https://images.unsplash.com/photo-${CITY_PHOTOS[city]}?w=600&q=70&auto=format&fit=crop`}
                alt=""
                loading="lazy"
              />
              <span className={styles.cityText}>
                <strong>{t(`cities.${city}`)}</strong>
                <span>{t("home.listingsCount", { count })}</span>
              </span>
            </Link>
          ))}
        </div>

        <div className={styles.why}>
          <h2>{t("home.whyTitle")}</h2>
          <div className={styles.whyGrid}>
            {[
              { icon: CalendarCheck, title: t("home.why1Title"), text: t("home.why1Text") },
              { icon: BadgeCheck, title: t("home.why2Title"), text: t("home.why2Text") },
              { icon: Languages, title: t("home.why3Title"), text: t("home.why3Text") },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className={`card ${styles.whyCard}`}>
                <Icon size={24} color="var(--accent)" />
                <h3>{title}</h3>
                <p className="muted">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <h2 className={styles.featuredTitle}>{t("nav.explore")}</h2>
        <div className={cardStyles.grid}>
          {featured.isPending
            ? Array.from({ length: 6 }, (_, i) => <IstirahaCardSkeleton key={i} />)
            : featured.data?.results.slice(0, 6).map((i) => <IstirahaCard key={i.id} istiraha={i} />)}
        </div>
        <div className={styles.more}>
          <Link to="/search" className="btn btn-secondary">
            {t("search.search")}
          </Link>
        </div>
      </section>
    </>
  );
}
