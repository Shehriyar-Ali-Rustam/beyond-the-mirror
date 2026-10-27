"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { MOODS } from "@/lib/moods";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useMood } from "./mood-provider";

/** Header shortcut: a swirl that shows the current mood colour and lets you change it. */
export function MoodButton({ portalHref }: { portalHref: string }) {
  const { mood, setMood } = useMood();
  return (
    <Popover>
      <PopoverTrigger
        className="group relative flex size-9 items-center justify-center rounded-xl transition hover:bg-surface-2 data-[state=open]:bg-surface-2"
        aria-label={mood ? `Mood: ${mood.name}. Change mood` : "Pick a mood colour"}
      >
        <span
          className="block size-5 rounded-full shadow-sm ring-2 ring-surface transition-transform duration-500 group-hover:rotate-180"
          style={{
            background: mood
              ? `conic-gradient(from 0deg, ${mood.color}, ${mood.wash[0]}, ${mood.color})`
              : "conic-gradient(from 0deg, #f5b82e, #ef6a55, #e86a9a, #9b85dd, #4b9fe1, #34b892, #f5b82e)",
          }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-[min(320px,calc(100vw-24px))] p-4">
        <p className="text-sm font-semibold text-ink">What colour is your mood?</p>
        <p className="mt-0.5 text-xs text-ink-3">The site changes colour with you. Only saved on this device.</p>
        <div className="mt-3 grid grid-cols-5 gap-2">
          {MOODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMood(m.id)}
              title={`${m.name}: ${m.feeling}`}
              aria-label={`${m.name}: ${m.feeling}`}
              aria-pressed={mood?.id === m.id}
              className={cn(
                "flex aspect-square items-center justify-center rounded-full shadow-sm transition hover:scale-110",
                mood?.id === m.id && "ring-2 ring-ink ring-offset-2 ring-offset-surface",
              )}
              style={{ background: m.color }}
            >
              {mood?.id === m.id && <Check className="size-4 text-white" />}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMood(null)}
            aria-label="No mood colour"
            className={cn(
              "flex aspect-square items-center justify-center rounded-full border border-dashed border-line-strong text-[10px] font-medium text-ink-3 transition hover:scale-110",
              !mood && "ring-2 ring-ink ring-offset-2 ring-offset-surface",
            )}
          >
            Off
          </button>
        </div>
        {mood && <p className="mt-3 text-xs text-ink-2">{mood.feeling}</p>}
        <PopoverClose asChild>
          <Link
            href={portalHref}
            className="mt-3 flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-3"
          >
            Open the Mood Portal <ArrowRight className="size-4" />
          </Link>
        </PopoverClose>
      </PopoverContent>
    </Popover>
  );
}
