import { useSyncExternalStore } from "react";

function useMedia(query: string, fallback: boolean) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

export const useReducedMotion = () => useMedia("(prefers-reduced-motion: reduce)", false);
export const useWide = () => useMedia("(min-width: 768px)", true);
