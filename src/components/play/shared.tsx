"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";

const COLORS = ["#f5b82e", "#ef6a55", "#e86a9a", "#9b85dd", "#4b9fe1", "#34b892"];

/** A quick burst of confetti from the centre of its parent. Re-mount (change `key`) to fire again. */
export function Confetti({ count = 36 }: { count?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-visible">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.3;
        const dist = 90 + ((i * 37) % 120);
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 block rounded-[2px]"
            style={{ width: 6 + (i % 3) * 3, height: 10 + (i % 4) * 2, background: COLORS[i % COLORS.length] }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
            animate={{ x: Math.cos(angle) * dist, y: [0, Math.sin(angle) * dist - 40, Math.sin(angle) * dist + 120], opacity: [1, 1, 0], rotate: 360 + i * 25, scale: 1 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

/** A number kept in localStorage (best scores, counters). Never leaves the device. */
export function useLocalNumber(key: string, initial = 0) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`btm:${key}`);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only available after mount
      if (raw !== null) setValue(Number(raw) || 0);
    } catch {}
  }, [key]);
  const update = useCallback(
    (next: number | ((v: number) => number)) => {
      setValue((prev) => {
        const v = typeof next === "function" ? next(prev) : next;
        try {
          localStorage.setItem(`btm:${key}`, String(v));
        } catch {}
        return v;
      });
    },
    [key],
  );
  return [value, update] as const;
}

/** A list of strings kept in localStorage (stickers collected, puzzles solved). */
export function useLocalList(key: string) {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(`btm:${key}`) ?? "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only available after mount
      if (Array.isArray(raw)) setList(raw.filter((x) => typeof x === "string"));
    } catch {}
  }, [key]);
  const add = useCallback(
    (item: string) =>
      setList((prev) => {
        if (prev.includes(item)) return prev;
        const next = [...prev, item];
        try {
          localStorage.setItem(`btm:${key}`, JSON.stringify(next));
        } catch {}
        return next;
      }),
    [key],
  );
  const reset = useCallback(() => {
    setList([]);
    try {
      localStorage.removeItem(`btm:${key}`);
    } catch {}
  }, [key]);
  return [list, add, reset] as const;
}

export const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];

/** Loose answer matching: case, spaces, punctuation, "the", and simple plurals don't matter. */
export function normalizeAnswer(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\b(the|a|an)\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
    .join(" ");
}
