"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Feather, Flame, Lock, PenLine, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Letter = { id: string; to: string; body: string; updated: number };
const KEY = "btm:letters";

const PROMPTS = [
  "What I wish you knew about me is…",
  "The thing I never got to say is…",
  "I'm angry because…",
  "Thank you for…",
  "Dear me, a year from now…",
  "What I need from you is…",
];

function load(): Letter[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Letter[];
  } catch {
    return [];
  }
}

export function LettersTool() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [active, setActive] = useState<Letter | null>(null);
  const [burning, setBurning] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage is only available after mount */
    setLetters(load());
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const persist = (next: Letter[]) => {
    setLetters(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };

  const save = (l: Letter) => {
    const exists = letters.some((x) => x.id === l.id);
    const next = exists ? letters.map((x) => (x.id === l.id ? l : x)) : [l, ...letters];
    persist(next.filter((x) => x.body.trim() || x.to.trim()));
  };

  const burn = (id: string) => {
    setBurning(id);
    setTimeout(() => {
      persist(letters.filter((x) => x.id !== id));
      setActive(null);
      setBurning(null);
    }, 900);
  };

  const startNew = (prompt?: string) =>
    setActive({ id: crypto.randomUUID(), to: "", body: prompt ? `${prompt} ` : "", updated: Date.now() });

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl bg-lilac-soft p-4 text-sm leading-relaxed text-ink-2">
        <Lock className="mt-0.5 size-4 shrink-0 text-lilac" />
        <p>
          <span className="font-medium text-ink">These letters never leave this device.</span> They aren&apos;t uploaded,
          your counselor can&apos;t see them, and they&apos;re gone if you clear your browser data. On a shared computer,
          burn them when you&apos;re done.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {active ? (
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 10 }}
            animate={burning === active.id ? { opacity: 0, y: -30, scale: 0.96, filter: "blur(6px)" } : { opacity: 1, y: 0 }}
            transition={{ duration: burning ? 0.9 : 0.3 }}
            className="rounded-3xl border border-line bg-surface p-6 shadow-sm sm:p-8"
            style={{ backgroundImage: "repeating-linear-gradient(transparent, transparent 31px, var(--line) 32px)", backgroundPositionY: "8px" }}
          >
            <div className="flex items-center gap-2 bg-surface">
              <span className="font-display text-xl text-ink-2">Dear</span>
              <Input
                autoFocus={!active.to}
                value={active.to}
                onChange={(e) => setActive({ ...active, to: e.target.value })}
                onBlur={() => save({ ...active, updated: Date.now() })}
                placeholder="someone"
                maxLength={60}
                className="h-10 border-0 bg-transparent px-1 font-display text-xl shadow-none focus:ring-0"
              />
            </div>
            <textarea
              value={active.body}
              onChange={(e) => setActive({ ...active, body: e.target.value })}
              onBlur={() => save({ ...active, updated: Date.now() })}
              autoFocus={!!active.to || !!active.body}
              placeholder="Write whatever you need to. No one will read this."
              className="mt-2 min-h-[320px] w-full resize-y bg-transparent text-[17px] leading-8 text-ink placeholder:text-ink-3 focus:outline-none"
              aria-label="Letter"
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 bg-surface pt-2">
              <p className="text-xs text-ink-3">Saved on this device as you write.</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { save({ ...active, updated: Date.now() }); setActive(null); }}>
                  Close
                </Button>
                <Button variant="danger-soft" size="sm" onClick={() => burn(active.id)}>
                  <Flame /> Let it go
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div>
              <p className="mb-3 text-sm font-medium text-ink">Start with a prompt, or a blank page</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => startNew()}>
                  <Plus /> Blank letter
                </Button>
                {PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => startNew(p)}
                    className="rounded-full border border-line-strong bg-surface px-3.5 py-2 text-sm italic text-ink-2 transition hover:border-primary hover:text-ink"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            {ready && letters.length > 0 && (
              <div>
                <p className="mb-3 text-sm font-medium text-ink">Your letters</p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {letters.map((l) => (
                    <li key={l.id}>
                      <button
                        onClick={() => setActive(l)}
                        className={cn("group w-full rounded-2xl border border-line bg-surface p-4 text-left transition hover:border-line-strong hover:shadow-sm")}
                      >
                        <p className="flex items-center justify-between font-display text-lg text-ink">
                          Dear {l.to || "…"}
                          <PenLine className="size-4 text-ink-3 opacity-0 transition group-hover:opacity-100" />
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-ink-2">{l.body || "Empty"}</p>
                        <p className="mt-2 text-xs text-ink-3">{new Date(l.updated).toLocaleDateString()}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ready && letters.length === 0 && (
              <div className="flex items-center gap-3 text-sm text-ink-3">
                <Feather className="size-4" /> Writing to someone — even someone who&apos;ll never read it — can make a feeling easier to carry.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
