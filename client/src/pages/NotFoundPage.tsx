import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SplitPage } from "../components/SplitPage";
import split from "../components/SplitPage.module.css";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <SplitPage photo="/photos/firepit-poster.jpg" alt={t("common.fireAlt")}>
      <h1 className={split.title}>{t("common.notFound")}</h1>
      <p className={split.lead}>{t("common.notFoundNote")}</p>
      <div className={split.actions}>
        <Link to="/" className="btn btn-primary btn-lg">
          {t("common.goHome")}
        </Link>
        <Link to="/search" className="btn btn-secondary btn-lg">
          {t("nav.places")}
        </Link>
      </div>
    </SplitPage>
  );
}
