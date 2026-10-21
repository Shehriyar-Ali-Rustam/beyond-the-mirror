"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Plus, RotateCcw, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CopyButton, Step, useSendToCounselor, useToolContext } from "./shared";

const SMALL_STEPS = [
  "Write down the one question I'd ask if I could",
  "Talk to one person I trust about it",
  "Do 25 minutes on the thing I'm avoiding",
  "Check the facts (ask, look it up, re-read the message)",
  "Take a break and come back to it tomorrow",
];

function Scale({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={label} className="text-sm text-ink-2">
          {label}
        </label>
        <span className="font-display text-2xl tabular-nums text-ink">{value}/10</span>
      </div>
      <input
        id={label}
        type="range"
        min={0}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--primary)]"
      />
      <div className="flex justify-between text-xs text-ink-3">
        <span>Barely there</span>
        <span>Taking over</span>
      </div>
    </div>
  );
}

function ListBuilder({
  items,
  setItems,
  placeholder,
  tone,
}: {
  items: string[];
  setItems: (v: string[]) => void;
  placeholder: string;
  tone: "fact" | "fear";
}) {
  const [value, setValue] = useState("");
  const add = () => {
    const v = value.trim();
    if (v) setItems([...items, v]);
    setValue("");
  };
  return (
    <div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <motion.li
            key={`${it}-${i}`}
            initial={{ opacity: 0, x: tone === "fact" ? -6 : 6 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "flex items-start justify-between gap-2 rounded-xl px-3 py-2 text-sm",
              tone === "fact" ? "bg-ok-soft text-ink" : "bg-warn-soft text-ink",
            )}
          >
            <span>{it}</span>
            <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Remove" className="text-ink-3 hover:text-ink">
              <X className="size-3.5" />
            </button>
          </motion.li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="h-10 text-sm"
        />
        <Button type="button" variant="secondary" size="icon" onClick={add} aria-label="Add">
          <Plus />
        </Button>
      </div>
    </div>
  );
}

export function UntangleTool() {
  const context = useToolContext();
  const send = useSendToCounselor();
  const [thought, setThought] = useState("");
  const [before, setBefore] = useState(7);
  const [facts, setFacts] = useState<string[]>([]);
  const [fears, setFears] = useState<string[]>([]);
  const [friend, setFriend] = useState("");
  const [step, setStep] = useState("");
  const [after, setAfter] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const summary = [
    `The thought: ${thought}`,
    facts.length ? `What I know for sure:\n${facts.map((f) => `• ${f}`).join("\n")}` : "",
    fears.length ? `What I'm afraid of:\n${fears.map((f) => `• ${f}`).join("\n")}` : "",
    friend ? `What I'd tell a friend: ${friend}` : "",
    step ? `My next small step: ${step}` : "",
    `How strong it felt: ${before}/10${after !== null ? ` → ${after}/10 afterwards` : ""}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const reset = () => {
    setThought("");
    setFacts([]);
    setFears([]);
    setFriend("");
    setStep("");
    setAfter(null);
    setDone(false);
    setBefore(7);
  };

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
          <p className="text-sm text-ink-3">You untangled</p>
          <p className="mt-1 font-display text-2xl leading-snug text-ink">“{thought}”</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-ok-soft p-4">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-ok">What you know</p>
              <ul className="mt-2 space-y-1 text-sm text-ink">{facts.length ? facts.map((f, i) => <li key={i}>• {f}</li>) : <li className="text-ink-3">Nothing certain yet — that&apos;s worth noticing.</li>}</ul>
            </div>
            <div className="rounded-2xl bg-warn-soft p-4">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-warn">What you fear</p>
              <ul className="mt-2 space-y-1 text-sm text-ink">{fears.length ? fears.map((f, i) => <li key={i}>• {f}</li>) : <li className="text-ink-3">—</li>}</ul>
            </div>
          </div>
          {friend && (
            <p className="mt-5 border-l-2 border-primary pl-4 italic leading-relaxed text-ink-2">“{friend}”</p>
          )}
          {step && (
            <p className="mt-5 text-[15px] text-ink">
              <span className="font-semibold">Your next step:</span> {step}
            </p>
          )}
          <div className="mt-6 border-t border-line pt-5">
            <Scale value={after ?? before} onChange={setAfter} label="How strong does the thought feel now?" />
            {after !== null && after < before && (
              <p className="mt-3 text-sm text-ok">Down {before - after} points. That&apos;s real progress.</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {context === "student" && (
            <Button onClick={() => send({ subject: "Something I keep overthinking", body: summary, category: "wellbeing" })}>
              <Send /> Send this to my counselor
            </Button>
          )}
          <CopyButton text={summary} label="Copy summary" />
          <Button variant="ghost" onClick={reset}>
            <RotateCcw /> Start over
          </Button>
        </div>
        <p className="text-xs text-ink-3">Nothing here has been saved. Closing this page clears it.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-10">
      <Step n={1} title="What's the thought that keeps coming back?">
        <Textarea
          value={thought}
          onChange={(e) => setThought(e.target.value)}
          placeholder="e.g. Everyone in my group is annoyed with me and I've ruined it"
          rows={3}
          maxLength={400}
        />
        <div className="mt-5">
          <Scale value={before} onChange={setBefore} label="How strong does it feel right now?" />
        </div>
      </Step>

      {thought.trim().length > 3 && (
        <>
          <Step n={2} title="Separate what you know from what you fear">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-3xl border border-line bg-surface p-5">
                <p className="font-medium text-ink">Facts</p>
                <p className="mb-3 text-sm text-ink-3">Things you could prove — that someone else would agree happened.</p>
                <ListBuilder items={facts} setItems={setFacts} placeholder="e.g. She didn't reply yesterday" tone="fact" />
              </div>
              <div className="rounded-3xl border border-line bg-surface p-5">
                <p className="font-medium text-ink">Fears &amp; assumptions</p>
                <p className="mb-3 text-sm text-ink-3">The stories your mind is adding — the what-ifs.</p>
                <ListBuilder items={fears} setItems={setFears} placeholder="e.g. She hates me now" tone="fear" />
              </div>
            </div>
          </Step>

          <Step n={3} title="If a friend told you this, what would you say to them?">
            <Textarea
              value={friend}
              onChange={(e) => setFriend(e.target.value)}
              placeholder="e.g. One unanswered message doesn't mean she's angry. She might just be busy."
              rows={3}
              maxLength={400}
            />
          </Step>

          <Step n={4} title="Pick one small thing you can do next">
            <div className="flex flex-wrap gap-2">
              {SMALL_STEPS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStep(s)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition",
                    step === s ? "border-primary bg-primary text-primary-ink" : "border-line-strong text-ink-2 hover:border-ink-3",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <Input value={step} onChange={(e) => setStep(e.target.value)} placeholder="…or write your own" className="mt-3" maxLength={200} />
          </Step>

          <Button size="lg" onClick={() => setDone(true)}>
            See it all together <ArrowRight />
          </Button>
        </>
      )}
    </div>
  );
}
