import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Loader2 } from "lucide-react";
import styles from "./States.module.css";

export function PageLoader() {
  const { t } = useTranslation();
  return (
    <div className={styles.center} role="status">
      <Loader2 className={styles.spin} size={28} />
      <span className="visually-hidden">{t("common.loading")}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="empty-state" role="alert">
      <AlertCircle size={32} color="var(--danger)" />
      <p>{message ?? t("common.error")}</p>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className={styles.emptyIcon}>{icon}</div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
