import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, type PanInfo } from "motion/react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./PhotoGallery.module.css";

// Where a flick would come to rest, like scroll deceleration. A fast flick
// travels further, so it can skip past the next photo.
function project(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

export function PhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const { t } = useTranslation();
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const x = useMotionValue(0);
  const last = photos.length - 1;

  // Keep track of the frame width so each photo is exactly one frame wide,
  // and re-align the track when the window is resized.
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
      x.jump(-indexRef.current * entry.contentRect.width);
    });
    observer.observe(frameRef.current!);
    return () => observer.disconnect();
  }, [x]);

  function goTo(target: number, velocity = 0) {
    const clamped = Math.max(0, Math.min(last, target));
    indexRef.current = clamped;
    setIndex(clamped);
    // A little bounce only when the user flicked (momentum), none for button taps.
    animate(x, -clamped * width, { type: "spring", bounce: velocity ? 0.15 : 0, duration: 0.45, velocity });
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    const projected = x.get() + project(info.velocity.x);
    goTo(Math.round(-projected / width), info.velocity.x);
  }

  return (
    // The track always runs left-to-right so the drag math stays simple in both languages.
    <div className={styles.gallery} dir="ltr">
      <div
        ref={frameRef}
        className={styles.frame}
        tabIndex={0}
        aria-roledescription="carousel"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") goTo(index + 1);
          if (e.key === "ArrowLeft") goTo(index - 1);
        }}
      >
        <motion.div
          className={styles.track}
          style={{ x }}
          drag="x"
          dragConstraints={{ left: -last * width, right: 0 }}
          dragElastic={0.18} // rubber-band past the first and last photo
          dragMomentum={false} // we do our own momentum in onDragEnd
          onDragEnd={onDragEnd}
        >
          {photos.map((src, i) => (
            <img
              key={src + i}
              src={src}
              alt={`${alt}, ${t("details.photo", { n: i + 1, total: photos.length })}`}
              className={styles.photo}
              loading={i === 0 ? "eager" : "lazy"}
              draggable={false}
            />
          ))}
        </motion.div>

        {photos.length > 1 && (
          <>
            <button className={`${styles.arrow} ${styles.prev}`} onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Previous photo">
              <ChevronLeft size={20} />
            </button>
            <button className={`${styles.arrow} ${styles.next}`} onClick={() => goTo(index + 1)} disabled={index === last} aria-label="Next photo">
              <ChevronRight size={20} />
            </button>
            <div className={styles.dots}>
              {photos.map((_, i) => (
                <button
                  key={i}
                  className={`${styles.dot} ${i === index ? styles.dotActive : ""}`}
                  onClick={() => goTo(i)}
                  aria-label={t("details.photo", { n: i + 1, total: photos.length })}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
