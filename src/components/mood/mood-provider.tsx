"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { moodById, type Mood, type MoodId } from "@/lib/moods";
import { AmbientLayer } from "./ambient-layer";

const KEY = "btm:mood";
type Ctx = { mood: Mood | null; setMood: (id: MoodId | null) => void };
const MoodContext = createContext<Ctx>({ mood: null, setMood: () => {} });
export const useMood = () => useContext(MoodContext);

/** Remembers the chosen mood on this device only and paints the site with it. */
export function MoodProvider({ children }: { children: React.ReactNode }) {
  // undefined until we've read localStorage, so we don't wipe what the boot script applied.
  const [moodId, setMoodId] = useState<MoodId | null | undefined>(undefined);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only available after mount
      setMoodId((moodById(localStorage.getItem(KEY))?.id as MoodId) ?? null);
    } catch {}
  }, []);

  const mood = moodById(moodId);

  useEffect(() => {
    if (moodId === undefined) return;
    const root = document.documentElement;
    if (mood) {
      root.dataset.mood = mood.id;
      root.style.setProperty("--mood-1", mood.wash[0]);
      root.style.setProperty("--mood-2", mood.wash[1]);
      root.style.setProperty("--mood-3", mood.wash[2]);
      root.style.setProperty("--mood-color", mood.color);
    } else {
      delete root.dataset.mood;
      ["--mood-1", "--mood-2", "--mood-3", "--mood-color"].forEach((v) => root.style.removeProperty(v));
    }
  }, [mood, moodId]);

  const setMood = useCallback((id: MoodId | null) => {
    setMoodId(id);
    try {
      if (id) localStorage.setItem(KEY, id);
      else localStorage.removeItem(KEY);
    } catch {}
  }, []);

  const value = useMemo(() => ({ mood, setMood }), [mood, setMood]);
  return (
    <MoodContext value={value}>
      {mood && <AmbientLayer mood={mood} />}
      {children}
    </MoodContext>
  );
}
