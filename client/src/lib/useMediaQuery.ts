import { useSyncExternalStore } from "react";

// True while a CSS media query matches, and re-renders when that changes
// (for things CSS alone can't change, like how many nights to draw).
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
