import { Outlet, useLocation } from "react-router-dom";
import { Suspense, useEffect } from "react";
import { Header } from "./Header";
import { SiteFooter } from "./SiteFooter";
import { PageLoader } from "./States";
import styles from "./Layout.module.css";

// Screens people work in (lists, dashboards) use the light "app" surface;
// everything else is a public page on the tobacco ground.
const APP_ROUTES = [/^\/search/, /^\/bookings$/, /^\/owner/, /^\/admin/];

export function surfaceFor(pathname: string): "page" | "app" {
  return APP_ROUTES.some((r) => r.test(pathname)) ? "app" : "page";
}

// Pages whose first screen is a full-bleed photograph: the header sits on it.
const OVERLAY_ROUTES = [/^\/$/, /^\/istirahas\/\d+$/];

export function Layout() {
  const { pathname } = useLocation();
  const surface = surfaceFor(pathname);
  const overlay = OVERLAY_ROUTES.some((r) => r.test(pathname));

  useEffect(() => {
    document.documentElement.dataset.surface = surface;
  }, [surface]);

  // New page -> start at the top (React Router keeps the old scroll position).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={styles.shell}>
      <Header surface={surface} overlay={overlay} />
      <main className={styles.main}>
        {/* Lazy pages show a spinner here while the header stays in place */}
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      {surface === "page" && <SiteFooter />}
    </div>
  );
}
