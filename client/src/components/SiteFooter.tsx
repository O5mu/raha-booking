import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { Logo } from "./Logo";
import styles from "./SiteFooter.module.css";

// The close of every public page: the coffee of the majlis on one half, the
// site's menu set large on the other. Photo credits sit in the small print.
export function SiteFooter() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const toggleLanguage = () => i18n.changeLanguage(i18n.language === "ar" ? "en" : "ar");

  const menu = [
    { to: "/search", label: t("footer.places") },
    { to: "/#rates", label: t("footer.rates") },
    { to: user ? (user.role === "guest" ? "/bookings" : user.role === "owner" ? "/owner" : "/admin") : "/login", label: user ? t("footer.yours") : t("nav.login") },
    { to: "/register", label: t("footer.owners") },
  ];

  return (
    <footer className={styles.footer}>
      <img
        className={styles.photo}
        src="/photos/dallah.jpg"
        width={1920}
        height={2868}
        alt={t("footer.photoAlt")}
        loading="lazy"
        decoding="async"
      />
      <div className={styles.side}>
        <Link to="/" className={styles.brand}>
          <Logo size="1.5rem" />
          {t("app.name")}
        </Link>
        <nav className={styles.menu} aria-label={t("footer.menu")}>
          {menu.map((m) => (
            <Link key={m.label} to={m.to}>
              {m.label}
            </Link>
          ))}
          <button onClick={toggleLanguage} lang={i18n.language === "ar" ? "en" : "ar"}>
            {t("nav.switchLanguage")}
          </button>
        </nav>
        <div className={styles.blocks}>
          <p>
            {t("footer.about")}{" "}
            <a href="https://github.com/O5mu/raha-booking" target="_blank" rel="noreferrer">
              {t("footer.source")}
            </a>
          </p>
          <p>{t("footer.hours")}</p>
        </div>
        <p className={styles.legal}>
          {t("footer.legal")} {t("footer.credits")}
        </p>
      </div>
    </footer>
  );
}
