import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarCheck, Compass, Languages, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Logo } from "./Logo";
import styles from "./Header.module.css";

export function Header() {
  const { t, i18n } = useTranslation();
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const toggleLanguage = () => i18n.changeLanguage(i18n.language === "ar" ? "en" : "ar");

  const links = [
    { to: "/search", label: t("nav.explore"), icon: Compass, show: true },
    { to: "/bookings", label: t("nav.myBookings"), icon: CalendarCheck, show: user?.role === "guest" },
    { to: "/owner", label: t("nav.dashboard"), icon: LayoutDashboard, show: user?.role === "owner" },
    { to: "/admin", label: t("nav.admin"), icon: ShieldCheck, show: user?.role === "admin" },
  ].filter((l) => l.show);

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.brand} aria-label={t("app.name")}>
          <Logo />
          <span>{t("app.name")}</span>
        </Link>

        <nav className={styles.nav}>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ""}`}>
              <Icon size={18} />
              <span className={styles.linkLabel}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.actions}>
          <button className={`btn btn-ghost ${styles.lang}`} onClick={toggleLanguage} lang={i18n.language === "ar" ? "en" : "ar"}>
            <Languages size={18} />
            <span>{t("nav.switchLanguage")}</span>
          </button>
          {loading ? null : user ? (
            <div className={styles.user}>
              <span className={styles.avatar} title={user.name}>
                {user.name.charAt(0)}
              </span>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                aria-label={t("nav.logout")}
                title={t("nav.logout")}
              >
                <LogOut size={18} className={styles.flip} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary">
              {t("nav.login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
