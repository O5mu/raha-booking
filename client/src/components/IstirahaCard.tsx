import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import type { IstirahaCard as Card } from "../api/types";
import { useFormat } from "../lib/format";
import { AmenityIcon } from "./AmenityIcon";
import styles from "./IstirahaCard.module.css";

export function IstirahaCard({ istiraha, query = "" }: { istiraha: Card; query?: string }) {
  const { t } = useTranslation();
  const fmt = useFormat();
  const name = fmt.pick(istiraha, "name");

  return (
    // The search dates travel to the details page in the URL.
    <Link to={`/istirahas/${istiraha.id}${query}`} className={styles.card}>
      <div className={styles.media}>
        <img src={istiraha.cover_photo} alt={name} loading="lazy" />
        <span className={styles.city}>{t(`cities.${istiraha.city}`)}</span>
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{name}</h3>
        <p className={`muted ${styles.meta}`}>
          <span>{fmt.pick(istiraha, "district")}</span>
          <span className={styles.capacity}>
            <Users size={14} /> {istiraha.capacity}
          </span>
        </p>
        <div className={styles.amenities}>
          {istiraha.amenities.slice(0, 4).map((a) => (
            <span key={a} title={t(`amenities.${a}`)}>
              <AmenityIcon name={a} size={16} />
            </span>
          ))}
        </div>
        <p className={styles.price}>
          <strong>{fmt.money(istiraha.price_per_night)}</strong> <span className="muted">{t("search.perNight")}</span>
        </p>
      </div>
    </Link>
  );
}

export function IstirahaCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={`${styles.media} skeleton`} />
      <div className={styles.body}>
        <div className="skeleton" style={{ height: 20, width: "70%" }} />
        <div className="skeleton" style={{ height: 14, width: "40%" }} />
        <div className="skeleton" style={{ height: 18, width: "35%", marginTop: 8 }} />
      </div>
    </div>
  );
}
