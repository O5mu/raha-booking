import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "../auth/AuthContext";
import { Logo } from "./Logo";
import styles from "./Header.module.css";

type Props = { surface: "page" | "app"; overlay: boolean };

// A plain bar: the mark and name at one end, a few text links and one action
// at the other. No pill, no blur, no border. On a phone the links fold into a
// full-screen sheet behind a "Menu" button.
export function Header({ surface, overlay }: Props) {
  const { t, i18n } = useTranslation();
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const links = [
    { to: "/search", label: t("nav.places"), show: true },
    { to: "/bookings", label: t("nav.myBookings"), show: user?.role === "guest" },
    { to: "/owner", label: t("nav.dashboard"), show: user?.role === "owner" },
    { to: "/admin", label: t("nav.admin"), show: user?.role === "admin" },
  ].filter((l) => l.show);

  const toggleLanguage = () => i18n.changeLanguage(i18n.language === "ar" ? "en" : "ar");
  const otherLang = i18n.language === "ar" ? "en" : "ar";

  const account = loading ? null : user ? (
    <button
      className={styles.link}
      onClick={() => {
        logout();
        navigate("/");
      }}
    >
      {t("nav.logout")}
    </button>
  ) : (
    <Link to="/login" className={styles.link}>
      {t("nav.login")}
    </Link>
  );

  const className = [styles.header, styles[surface], overlay && styles.overlay].filter(Boolean).join(" ");

  return (
    <header className={className}>
      <Link to="/" className={styles.brand}>
        <Logo size={surface === "app" ? 24 : 28} />
        <span>{t("app.name")}</span>
      </Link>

      <nav className={styles.links} aria-label={t("nav.main")}>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}>
            {l.label}
          </NavLink>
        ))}
        {user && surface === "app" && <span className={styles.user}>{user.name}</span>}
        {account}
        <button className={styles.link} onClick={toggleLanguage} lang={otherLang}>
          {t("nav.switchLanguage")}
        </button>
      </nav>

      {/* The one action of the public pages. */}
      {surface === "page" && pathname !== "/search" && (
        <Link to="/search" className={`btn btn-primary ${styles.action}`}>
          {t("home.cta")}
        </Link>
      )}

      <button className={`${styles.link} ${styles.menuButton}`} onClick={() => setOpen(true)} aria-expanded={open}>
        {t("nav.menu")}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.menu")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.sheetTop}>
              <Link to="/" className={styles.brand}>
                <Logo />
                <span>{t("app.name")}</span>
              </Link>
              <button className={styles.link} onClick={() => setOpen(false)}>
                {t("nav.close")}
              </button>
            </div>
            <nav className={styles.sheetLinks}>
              {links.map((l) => (
                <Link key={l.to} to={l.to}>
                  {l.label}
                </Link>
              ))}
              {!loading && !user && <Link to="/login">{t("nav.login")}</Link>}
              {user && (
                <button
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                >
                  {t("nav.logout")}
                </button>
              )}
              <button onClick={toggleLanguage} lang={otherLang}>
                {t("nav.switchLanguage")}
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
