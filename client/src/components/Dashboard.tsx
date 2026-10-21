import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import styles from "./Dashboard.module.css";

// One headline number: grey label above, value below. A row of these is one
// container split by 1px dividers (no card per number). `money` sets the
// value in bold, the only figure that gets it.
export function StatTile({ label, value, hint, money }: { label: string; value: string | number; hint?: string; money?: boolean }) {
  return (
    <div className={styles.tile}>
      <span className={styles.tileLabel}>{label}</span>
      <span className={`${styles.tileValue} ${money ? styles.money : ""}`}>{value}</span>
      {hint && <span className={styles.tileHint}>{hint}</span>}
    </div>
  );
}

export function StatRow({ children, count }: { children: ReactNode; count: number }) {
  return (
    <div className={styles.stats} style={{ "--count": count } as CSSProperties}>
      {children}
    </div>
  );
}

const STATUS_BADGE = { approved: "badge-success", pending: "badge-warning", rejected: "badge-danger", hidden: "" };

export function StatusBadge({ status, label }: { status: keyof typeof STATUS_BADGE; label: string }) {
  return <span className={`badge ${STATUS_BADGE[status]}`}>{label}</span>;
}

// A modal task: a dimming scrim pushes the page back so focus is on the sheet.
// It closes with Escape, the X button, or a click on the scrim.
export function Dialog({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden"; // stop the page scrolling behind the dialog
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className={styles.scrim} onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            ref={panelRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: "1.5rem", scale: 0.98 }}
            animate={{ opacity: 1, y: "0rem", scale: 1 }}
            exit={{ opacity: 0, y: "1.5rem", scale: 0.98 }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
          >
            <header className={styles.dialogHeader}>
              <h2>{title}</h2>
              <button className="btn btn-ghost" onClick={onClose} aria-label="Close">
                <X size="1.25rem" />
              </button>
            </header>
            <div className={styles.dialogBody}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
