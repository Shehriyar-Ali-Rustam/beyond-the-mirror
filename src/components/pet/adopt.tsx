"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Dices, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SPECIES, SPECIES_LIST } from "./species";
import type { Pattern, PetLook, SpeciesId } from "./types";

export type Draft = { species: SpeciesId; look: PetLook; name: string };

const PATTERN_NAMES: Record<Pattern, string> = { solid: "Plain", spots: "Spots", patches: "Patches", stripes: "Stripes", socks: "Socks" };
const pickIndex = (n: number) => Math.floor(Math.random() * n);

export function Adopt({ draft, setDraft, onAdopt }: { draft: Draft; setDraft: (d: Draft) => void; onAdopt: () => void }) {
  const [step, setStep] = useState(0);
  const spec = SPECIES[draft.species];
  const name = draft.name.trim();
  const steps = ["Choose", "Colours", "Name"];
  return (
    <motion.section
      aria-label="Adopt a pet"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={cn(
        "pointer-events-auto absolute inset-x-2 bottom-2 z-30 flex max-h-[58%] flex-col overflow-hidden rounded-3xl bg-white/92 shadow-lg ring-1 ring-black/5 backdrop-blur-md",
        "sm:inset-x-auto sm:bottom-3 sm:left-3 sm:top-3 sm:max-h-none sm:w-[360px]",
      )}
    >
      <header className="px-4 pt-4">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <PawPrint className="size-3.5" aria-hidden /> Adoption centre
        </p>
        <h3 className="mt-1 font-display text-xl leading-tight text-ink">{step === 0 ? "Choose your new best friend" : step === 1 ? `Make ${name || "them"} yours` : "What's their name?"}</h3>
        <ol className="mt-2 flex gap-1.5" aria-label="Steps">
          {steps.map((s, i) => (
            <li key={s} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-black/10")}>
              <span className="sr-only">
                {s} {i < step ? "done" : i === step ? "current step" : ""}
              </span>
            </li>
          ))}
        </ol>
      </header>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {step === 0 && (
          <>
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-3">
              {SPECIES_LIST.map((s) => {
                const on = s.id === draft.species;
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setDraft({ species: s.id, look: s.defaultLook, name: draft.name })}
                    className={cn("relative flex flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-center transition", on ? "bg-primary-soft ring-2 ring-primary" : "bg-black/[0.04] hover:bg-black/[0.07]")}
                  >
                    <span className="text-2xl leading-none" aria-hidden>
                      {s.emoji}
                    </span>
                    <span className="text-[11px] font-semibold leading-tight text-ink">{s.name}</span>
                    {on && <Check className="absolute right-1 top-1 size-3.5 text-primary" aria-hidden />}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 rounded-2xl bg-sun-soft px-3 py-2 text-[13px] leading-snug text-ink">
              <span className="font-semibold">{spec.name}:</span> {spec.blurb}
            </p>
          </>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-ink-2">Main colour</p>
              <div className="flex flex-wrap gap-2">
                {spec.bodyColors.map((c) => (
                  <button key={c} type="button" aria-label={`Main colour ${c}`} aria-pressed={draft.look.body === c} onClick={() => setDraft({ ...draft, look: { ...draft.look, body: c } })} className={cn("size-8 rounded-full shadow-sm ring-2 transition hover:scale-110", draft.look.body === c ? "ring-primary ring-offset-2" : "ring-white")} style={{ background: c }} />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-ink-2">{spec.accentLabel}</p>
              <div className="flex flex-wrap gap-2">
                {spec.accentColors.map((c) => (
                  <button key={c} type="button" aria-label={`${spec.accentLabel} ${c}`} aria-pressed={draft.look.accent === c} onClick={() => setDraft({ ...draft, look: { ...draft.look, accent: c } })} className={cn("size-8 rounded-full shadow-sm ring-2 transition hover:scale-110", draft.look.accent === c ? "ring-primary ring-offset-2" : "ring-white")} style={{ background: c }} />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-ink-2">Pattern</p>
              <div className="flex flex-wrap gap-1.5">
                {spec.patterns.map((p) => (
                  <button key={p} type="button" aria-pressed={draft.look.pattern === p} onClick={() => setDraft({ ...draft, look: { ...draft.look, pattern: p } })} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition", draft.look.pattern === p ? "bg-primary text-white" : "bg-black/5 text-ink-2 hover:bg-black/10")}>
                    {PATTERN_NAMES[p]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (name) onAdopt();
            }}
          >
            <label htmlFor="pet-name" className="mb-2 block text-xs font-semibold text-ink-2">
              Your {spec.name.toLowerCase()}&apos;s name
            </label>
            <div className="flex gap-2">
              <input
                id="pet-name"
                value={draft.name}
                maxLength={20}
                autoComplete="off"
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Type a name"
                className="h-11 min-w-0 flex-1 rounded-2xl border border-line-strong bg-white px-4 text-base text-ink outline-none placeholder:text-ink-3 focus:border-primary"
              />
              <button type="button" aria-label="Random name" title="Random name" onClick={() => setDraft({ ...draft, name: spec.names[pickIndex(spec.names.length)] })} className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sun-soft text-sun transition hover:scale-105">
                <Dices className="size-5" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {spec.names.slice(0, 6).map((n) => (
                <button key={n} type="button" onClick={() => setDraft({ ...draft, name: n })} className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-ink-2 transition hover:bg-black/10 hover:text-ink">
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-3">You can rename them, change their colours and dress them up whenever you like.</p>
            <button type="submit" className="sr-only">
              Adopt
            </button>
          </form>
        )}
      </div>
      <footer className="flex items-center gap-2 border-t border-line bg-white/60 px-4 py-3">
        {step > 0 && (
          <Button variant="ghost" size="md" onClick={() => setStep(step - 1)}>
            <ArrowLeft /> Back
          </Button>
        )}
        <div className="flex-1" />
        {step < 2 ? (
          <Button size="md" className="rounded-full" onClick={() => setStep(step + 1)}>
            Next <ArrowRight />
          </Button>
        ) : (
          <Button size="md" className="rounded-full" disabled={!name} onClick={onAdopt}>
            <PawPrint /> Bring {name || "them"} home
          </Button>
        )}
      </footer>
    </motion.section>
  );
}
