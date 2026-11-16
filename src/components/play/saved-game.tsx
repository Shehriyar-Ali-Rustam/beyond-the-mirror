"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { saveGame } from "@/actions/games";
import type { SavedGameProps } from "./game-props";

const Loading = () => <div className="aspect-[4/3] w-full animate-pulse rounded-[2rem] bg-surface-2 sm:aspect-video" aria-label="Loading" />;
// Heavy 3D / canvas games load only when opened.
const GAMES = {
  pet: dynamic(() => import("@/components/pet/little-paws"), { ssr: false, loading: Loading }),
  cozy: dynamic(() => import("@/components/cozy/cozy-room"), { ssr: false, loading: Loading }),
} satisfies Record<string, React.ComponentType<SavedGameProps>>;

const localKey = (game: string) => `btm:save:${game}`;

/**
 * Loads and saves progress: on this device for visitors, and also to the
 * account (private to its owner) when signed in.
 */
export function SavedGame({ game, serverSave, signedIn }: { game: keyof typeof GAMES; serverSave: unknown; signedIn: boolean }) {
  const [initial, setInitial] = useState<{ value: unknown } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<unknown>(undefined);

  useEffect(() => {
    let local: unknown = null;
    try {
      local = JSON.parse(localStorage.getItem(localKey(game)) ?? "null");
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the device copy is only readable after mount
    setInitial({ value: signedIn && serverSave != null ? serverSave : local });
  }, [game, serverSave, signedIn]);

  const flush = useCallback(() => {
    if (pending.current === undefined) return;
    const data = pending.current;
    pending.current = undefined;
    try {
      localStorage.setItem(localKey(game), JSON.stringify(data));
    } catch {}
    if (signedIn) void saveGame(game, data);
  }, [game, signedIn]);

  const onSave = useCallback(
    (data: unknown) => {
      pending.current = data;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 1500);
    },
    [flush],
  );

  useEffect(() => {
    const onHide = () => flush();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      flush();
    };
  }, [flush]);

  if (!initial) return <Loading />;
  const Game = GAMES[game];
  return <Game initialSave={initial.value} onSave={onSave} signedIn={signedIn} />;
}
