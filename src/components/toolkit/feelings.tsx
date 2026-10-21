"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TalkCta, toolHref, useToolContext } from "./shared";

type Cluster = {
  key: string;
  name: string;
  hue: number;
  words: string[];
  meaning: string;
  underneath: string[];
  tryThis: { text: string; tool?: string; toolLabel?: string };
};

const CLUSTERS: Cluster[] = [
  {
    key: "heavy",
    name: "Heavy",
    hue: 220,
    words: ["empty", "numb", "drained", "flat", "hopeless", "low"],
    meaning: "This often sounds like sadness, exhaustion or low mood — the kind that builds after a long stretch of pressure or loss.",
    underneath: ["sadness", "burnout", "grief", "disappointment"],
    tryThis: { text: "Lower the bar for today. Rest counts. A short reset can take the edge off.", tool: "reset", toolLabel: "Bad-day reset" },
  },
  {
    key: "restless",
    name: "Restless",
    hue: 35,
    words: ["overwhelmed", "anxious", "on edge", "scared", "panicky", "can't switch off"],
    meaning: "This sounds like worry or anxiety — your body getting ready for a threat, even if the threat is a deadline or a conversation.",
    underneath: ["fear", "worry", "pressure", "uncertainty"],
    tryThis: { text: "Slow your breathing first, then write the worry down and look at what you actually know.", tool: "untangle", toolLabel: "Untangle a thought" },
  },
  {
    key: "hot",
    name: "Hot",
    hue: 5,
    words: ["angry", "frustrated", "irritated", "resentful", "jealous", "betrayed"],
    meaning: "Anger usually points at something that feels unfair, or a line that's been crossed. It's information, not a flaw.",
    underneath: ["hurt", "injustice", "feeling disrespected", "powerlessness"],
    tryThis: { text: "Move your body before you reply to anyone. Then work out what you'd like to say calmly.", tool: "say-it", toolLabel: "What should I say?" },
  },
  {
    key: "alone",
    name: "Alone",
    hue: 260,
    words: ["lonely", "left out", "misunderstood", "invisible", "ignored", "different"],
    meaning: "This sounds like loneliness or not belonging. It can happen even when you're surrounded by people.",
    underneath: ["loneliness", "rejection", "longing to be understood"],
    tryThis: { text: "Reach out to one person — even a small message. Or explore what's going on with friends.", tool: "situations", toolLabel: "Friends, family & bullying" },
  },
  {
    key: "tangled",
    name: "Tangled",
    hue: 300,
    words: ["confused", "stuck", "guilty", "ashamed", "embarrassed", "torn"],
    meaning: "This sounds like being pulled in different directions, or being hard on yourself about something.",
    underneath: ["guilt", "shame", "self-doubt", "conflicting needs"],
    tryThis: { text: "Write it out without sending it. Getting it onto paper often shows you what really matters.", tool: "letters", toolLabel: "Letters you won't send" },
  },
  {
    key: "light",
    name: "Lighter",
    hue: 150,
    words: ["okay", "calm", "hopeful", "relieved", "proud", "grateful"],
    meaning: "There's some lightness here too — worth noticing. Feelings can be mixed, and that's normal.",
    underneath: ["relief", "hope", "connection"],
    tryThis: { text: "Notice what helped you feel this way, so you can come back to it on harder days." },
  },
];

export function FeelingsTool() {
  const context = useToolContext();
  const [picked, setPicked] = useState<string[]>([]);
  const [show, setShow] = useState(false);

  const ranked = useMemo(() => {
    return CLUSTERS.map((c) => ({ c, n: c.words.filter((w) => picked.includes(w)).length }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n);
  }, [picked]);

  const toggle = (w: string) => setPicked((p) => (p.includes(w) ? p.filter((x) => x !== w) : [...p, w]));

  return (
    <div className="space-y-8">
      {!show ? (
        <>
          <p className="text-[15px] leading-relaxed text-ink-2">
            Tap every word that fits, even a little. Don&apos;t overthink it — there are no wrong answers.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {CLUSTERS.map((c) => (
              <div key={c.key} className="rounded-3xl border border-line bg-surface p-5">
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em]" style={{ color: `hsl(${c.hue} 40% 45%)` }}>
                  {c.name}
                </p>
                <div className="flex flex-wrap gap-2">
                  {c.words.map((w) => {
                    const on = picked.includes(w);
                    return (
                      <button
                        key={w}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(w)}
                        className={cn(
                          "rounded-full border px-3.5 py-1.5 text-sm transition-all duration-200",
                          on ? "scale-[1.03] border-transparent font-medium text-ink shadow-sm" : "border-line-strong text-ink-2 hover:border-ink-3",
                        )}
                        style={on ? { background: `color-mix(in oklab, hsl(${c.hue} 60% 60%) 28%, var(--surface))` } : undefined}
                      >
                        {w}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface/95 p-3 pl-5 shadow-lg backdrop-blur">
            <p className="text-sm text-ink-2">
              {picked.length ? `${picked.length} selected: ${picked.slice(0, 4).join(", ")}${picked.length > 4 ? "…" : ""}` : "Nothing selected yet"}
            </p>
            <Button disabled={!picked.length} onClick={() => setShow(true)}>
              See what this might mean <ArrowRight />
            </Button>
          </div>
        </>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
              <p className="text-sm text-ink-3">You said you feel</p>
              <p className="mt-1 font-display text-2xl leading-snug text-ink sm:text-3xl">{picked.join(", ")}.</p>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
                Naming a feeling is genuinely useful — it makes it a little smaller and easier to deal with. Here&apos;s
                what might be going on.
              </p>
            </div>

            {ranked.map(({ c }, i) => (
              <motion.div
                key={c.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="rounded-3xl border border-line bg-surface p-6"
                style={{ borderLeft: `4px solid hsl(${c.hue} 45% 60%)` }}
              >
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-3">{c.name}</p>
                <p className="mt-2 leading-relaxed text-ink">{c.meaning}</p>
                <p className="mt-3 text-sm text-ink-2">
                  <span className="font-medium text-ink">Possibly underneath:</span> {c.underneath.join(", ")}
                </p>
                <div className="mt-4 rounded-2xl bg-surface-2 p-4 text-sm">
                  <p className="font-medium text-ink">One thing to try</p>
                  <p className="mt-1 leading-relaxed text-ink-2">{c.tryThis.text}</p>
                  {c.tryThis.tool && (
                    <Link href={toolHref(context, c.tryThis.tool)} className="mt-2 inline-flex items-center gap-1 font-medium text-primary hover:underline">
                      Open {c.tryThis.toolLabel} <ArrowRight className="size-3.5" />
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}

            <TalkCta
              category="wellbeing"
              title="Feelings that stick around deserve to be talked about"
              body="If this has been going on for a couple of weeks, or it's getting in the way of daily life, let your counselor know."
            />
            <Button
              variant="secondary"
              onClick={() => {
                setPicked([]);
                setShow(false);
              }}
            >
              <RotateCcw /> Start again
            </Button>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
