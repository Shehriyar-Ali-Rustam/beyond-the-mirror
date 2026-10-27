"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { formatSeconds } from "@/lib/voice-meta";
import { cn } from "@/lib/utils";

/** Fixed bar heights so every note gets its own "waveform" without decoding audio. */
function bars(seed: string, count = 36) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return Array.from({ length: count }, (_, i) => {
    h = (h * 1103515245 + 12345) >>> 0;
    const wave = Math.sin((i / count) * Math.PI);
    return 0.25 + wave * 0.45 + ((h >>> 16) % 100) / 400;
  });
}

/**
 * A small custom audio player. Only one plays at a time across the page.
 * `onFirstPlay` fires once per mount (used to count listens).
 */
export function VoicePlayer({
  id,
  src,
  duration,
  color,
  autoPlay,
  onFirstPlay,
  className,
}: {
  id: string;
  src: string | null;
  duration: number;
  color: string;
  autoPlay?: boolean;
  onFirstPlay?: () => void;
  className?: string;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const counted = useRef(false);
  const heights = bars(id);
  const progress = duration ? Math.min(1, time / duration) : 0;

  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id) audio.current?.pause();
    };
    window.addEventListener("btm:voice-play", onOther);
    return () => window.removeEventListener("btm:voice-play", onOther);
  }, [id]);

  useEffect(() => {
    if (autoPlay && src) audio.current?.play().catch(() => {});
  }, [autoPlay, src]);

  const toggle = () => {
    const el = audio.current;
    if (!el || !src) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audio.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    el.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        type="button"
        onClick={toggle}
        disabled={!src}
        aria-label={playing ? "Pause" : "Play"}
        className="flex size-12 shrink-0 items-center justify-center rounded-full text-white shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50"
        style={{ background: color }}
      >
        {playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="ml-0.5 size-5" fill="currentColor" />}
      </button>
      <div className="min-w-0 flex-1">
        <div
          className="flex h-10 cursor-pointer items-center gap-[3px]"
          onClick={seek}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          tabIndex={0}
          onKeyDown={(e) => {
            const el = audio.current;
            if (!el) return;
            if (e.key === "ArrowRight") el.currentTime = Math.min(duration, el.currentTime + 5);
            if (e.key === "ArrowLeft") el.currentTime = Math.max(0, el.currentTime - 5);
          }}
        >
          {heights.map((h, i) => (
            <span
              key={i}
              className={cn("flex-1 rounded-full transition-colors duration-200", playing && "origin-center")}
              style={{
                height: `${Math.round(h * 100)}%`,
                backgroundColor: i / heights.length < progress ? color : "var(--line-strong)",
                animation: playing && i / heights.length < progress + 0.08 && i / heights.length > progress - 0.08 ? "bar-bounce 0.8s ease-in-out infinite" : undefined,
              }}
            />
          ))}
        </div>
        <p className="mt-0.5 flex justify-between text-[11px] tabular-nums text-ink-3">
          <span>{formatSeconds(time)}</span>
          <span>{formatSeconds(duration)}</span>
        </p>
      </div>
      {src && (
        <audio
          ref={audio}
          src={src}
          preload="none"
          onPlay={() => {
            setPlaying(true);
            window.dispatchEvent(new CustomEvent("btm:voice-play", { detail: id }));
            if (!counted.current) {
              counted.current = true;
              onFirstPlay?.();
            }
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setTime(0);
          }}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        />
      )}
    </div>
  );
}
