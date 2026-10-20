import type { ReactNode } from "react";
import styles from "./SplitPage.module.css";

// Photograph half, panel half: the layout for the short pages (log in,
// register, booking confirmed, not found). The photo takes columns 1 to 6,
// the panel columns 8 to 11; on phones the photo becomes a band on top.
// `photoClassName` lets a page crop its own photo.
export function SplitPage({ photo, alt, photoClassName, children }: { photo: string; alt: string; photoClassName?: string; children: ReactNode }) {
  return (
    <div className={styles.page}>
      <div className={styles.photo}>
        <img className={photoClassName} src={photo} width={1920} height={1920} alt={alt} />
      </div>
      <div className={styles.panel}>{children}</div>
    </div>
  );
}
