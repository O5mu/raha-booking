import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "./Header";
import styles from "./Layout.module.css";

export function Layout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  // New page -> start at the top (React Router keeps the old scroll position).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={styles.shell}>
      <Header />
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <div className="container">
          <p>
            <strong>{t("app.name")}</strong> · {t("app.tagline")}
          </p>
          <p className="muted">{t("app.demoBanner")}</p>
        </div>
      </footer>
    </div>
  );
}
