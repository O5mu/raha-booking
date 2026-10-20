import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Compass } from "lucide-react";
import { EmptyState } from "../components/States";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="container page">
      <EmptyState icon={<Compass size={28} />} title={t("common.notFound")}>
        <Link to="/" className="btn btn-primary">
          {t("common.goHome")}
        </Link>
      </EmptyState>
    </div>
  );
}
