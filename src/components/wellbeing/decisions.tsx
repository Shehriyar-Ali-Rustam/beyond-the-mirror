"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Info, Plus, Trash2, X } from "lucide-react";
import { deleteDecision, saveDecision } from "@/actions/wellbeing";
import { DECISION_AREAS, PRIORITY_SUGGESTIONS } from "@/lib/wellbeing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip, SectionCard } from "./shell";

type Area = keyof typeof DECISION_AREAS;
type Option = { id: string; label: string; pros: string[]; cons: string[]; outcome: string; risks: string; scores: Record<string, number> };
type Priority = { id: string; label: string; weight: number };
export type Decision = {
  id: string;
  title: string;
  area: Area;
  situation: string | null;
  options: Option[];
  priorities: Priority[];
  reflection: string | null;
  next_step: string | null;
  chosen: string | null;
  status: "open" | "decided";
  updated_at: string;
};
type Draft = Omit<Decision, "id" | "updated_at"> & { id?: string };

const uid = () => Math.random().toString(36).slice(2, 10);
const STEPS = ["Situation", "Options", "Pros and cons", "Outcomes", "Priorities", "Compare", "Reflect"];
const empty = (): Draft => ({ title: "", area: "education", situation: "", options: [], priorities: [], reflection: "", next_step: "", chosen: null, status: "open" });

/** Weighted score as a percentage, so options with different numbers of priorities stay comparable. */
const score = (o: Option, priorities: Priority[]) => {
  const max = priorities.reduce((a, p) => a + p.weight * 5, 0);
  if (!max) return 0;
  return Math.round((priorities.reduce((a, p) => a + p.weight * (o.scores[p.id] ?? 0), 0) / max) * 100);
};

function ListEditor({ items, onChange, placeholder, tone }: { items: string[]; onChange: (v: string[]) => void; placeholder: string; tone: string }) {
  const [v, setV] = useState("");
  const add = () => {
    if (!v.trim()) return;
    onChange([...items, v.trim()].slice(0, 10));
    setV("");
  };
  return (
    <div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className={cn("flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-sm", tone)}>
            <span className="flex-1">{it}</span>
            <button type="button" aria-label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))} className="opacity-60 hover:opacity-100">
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-1.5 flex gap-1.5">
        <Input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} maxLength={200} placeholder={placeholder} aria-label={placeholder} className="h-9 text-sm" />
        <Button type="button" size="icon-sm" variant="secondary" onClick={add} aria-label="Add">
          <Plus />
        </Button>
      </div>
    </div>
  );
}

function Wizard({ initial, onClose }: { initial: Draft; onClose: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [step, setStep] = useState(initial.id ? (initial.status === "decided" ? 6 : 5) : 0);
  const [optionName, setOptionName] = useState("");
  const [customPriority, setCustomPriority] = useState("");
  const [pending, start] = useTransition();
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const setOption = (id: string, patch: Partial<Option>) => set("options", d.options.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  const persist = (next?: number, close = false) =>
    start(async () => {
      const r = await saveDecision({ ...d, situation: d.situation ?? "", reflection: d.reflection ?? "", next_step: d.next_step ?? "" });
      if (!r.ok) return void toast.error(r.error);
      setD((x) => ({ ...x, id: r.data!.id }));
      if (close) {
        toast.success("Saved");
        onClose();
      } else if (next != null) setStep(next);
    });

  const canNext = [d.title.trim().length >= 3, d.options.length >= 2, true, true, d.priorities.length >= 1, true, true][step];
  const ranked = [...d.options].sort((a, b) => score(b, d.priorities) - score(a, d.priorities));

  return (
    <SectionCard
      title={d.title || "New decision"}
      action={
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X /> Close
        </Button>
      }
    >
      <ol className="mb-6 flex gap-1 overflow-x-auto pb-1" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} className="min-w-[78px] flex-1">
            <button
              type="button"
              disabled={i > step && !d.id}
              onClick={() => setStep(i)}
              className={cn("w-full rounded-full px-2 py-1.5 text-[11px] font-medium transition", i === step ? "bg-ink text-white" : i < step ? "bg-sky-soft text-[#246aa6]" : "bg-surface-2 text-ink-3")}
              aria-current={i === step ? "step" : undefined}
            >
              {i + 1}. {s}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-4">
          <Field label="What do you need to decide?" htmlFor="d-title">
            <Input id="d-title" value={d.title} onChange={(e) => set("title", e.target.value)} maxLength={120} placeholder="e.g. Should I join the debate team this term?" />
          </Field>
          <Field label="What is it about?" htmlFor="d-area">
            <Select id="d-area" value={d.area} onChange={(e) => set("area", e.target.value as Area)}>
              {(Object.keys(DECISION_AREAS) as Area[]).map((a) => (
                <option key={a} value={a}>
                  {DECISION_AREAS[a]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Describe the situation" htmlFor="d-sit" hint="What's happening, why it's difficult, and by when you need to decide.">
            <Textarea id="d-sit" value={d.situation ?? ""} onChange={(e) => set("situation", e.target.value)} maxLength={2000} className="min-h-28" />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-ink-2">List the options you are considering. Include doing nothing or waiting, if that&apos;s realistic. Two to six options work best.</p>
          <ul className="space-y-2">
            {d.options.map((o, i) => (
              <li key={o.id} className="flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky-soft text-xs font-semibold text-[#246aa6]">{String.fromCharCode(65 + i)}</span>
                <Input value={o.label} onChange={(e) => setOption(o.id, { label: e.target.value })} maxLength={120} aria-label={`Option ${i + 1}`} className="h-10" />
                <Button type="button" size="icon-sm" variant="ghost" aria-label="Remove option" onClick={() => set("options", d.options.filter((x) => x.id !== o.id))}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
          {d.options.length < 6 && (
            <div className="flex gap-2">
              <Input
                value={optionName}
                onChange={(e) => setOptionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && optionName.trim()) {
                    e.preventDefault();
                    set("options", [...d.options, { id: uid(), label: optionName.trim(), pros: [], cons: [], outcome: "", risks: "", scores: {} }]);
                    setOptionName("");
                  }
                }}
                maxLength={120}
                placeholder="Add an option and press Enter"
                aria-label="New option"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (!optionName.trim()) return;
                  set("options", [...d.options, { id: uid(), label: optionName.trim(), pros: [], cons: [], outcome: "", risks: "", scores: {} }]);
                  setOptionName("");
                }}
              >
                <Plus /> Add
              </Button>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-4 md:grid-cols-2">
          {d.options.map((o, i) => (
            <div key={o.id} className="rounded-2xl border border-line p-4">
              <p className="font-medium text-ink">
                {String.fromCharCode(65 + i)}. {o.label}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ok">Benefits</p>
              <ListEditor items={o.pros} onChange={(v) => setOption(o.id, { pros: v })} placeholder="Add a benefit" tone="bg-ok-soft text-ink" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-danger">Challenges</p>
              <ListEditor items={o.cons} onChange={(v) => setOption(o.id, { cons: v })} placeholder="Add a challenge" tone="bg-danger-soft/60 text-ink" />
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {d.options.map((o, i) => (
            <div key={o.id} className="rounded-2xl border border-line p-4">
              <p className="font-medium text-ink">
                {String.fromCharCode(65 + i)}. {o.label}
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field label="What would probably happen?" htmlFor={`o-${o.id}`}>
                  <Textarea id={`o-${o.id}`} value={o.outcome} onChange={(e) => setOption(o.id, { outcome: e.target.value })} maxLength={600} className="min-h-20" />
                </Field>
                <Field label="Risks and uncertainties" htmlFor={`r-${o.id}`}>
                  <Textarea id={`r-${o.id}`} value={o.risks} onChange={(e) => setOption(o.id, { risks: e.target.value })} maxLength={600} className="min-h-20" />
                </Field>
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <p className="text-sm text-ink-2">What matters most to you in this situation? Choose a few, then set how much each one matters.</p>
          <div className="flex flex-wrap gap-1.5">
            {PRIORITY_SUGGESTIONS.filter((p) => !d.priorities.some((x) => x.label === p)).map((p) => (
              <Chip key={p} on={false} onClick={() => d.priorities.length < 8 && set("priorities", [...d.priorities, { id: uid(), label: p, weight: 3 }])} className="py-1 text-xs">
                <Plus className="size-3" /> {p}
              </Chip>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={customPriority} onChange={(e) => setCustomPriority(e.target.value)} maxLength={60} placeholder="Something else that matters to you" aria-label="Custom priority" className="h-10" />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!customPriority.trim() || d.priorities.length >= 8) return;
                set("priorities", [...d.priorities, { id: uid(), label: customPriority.trim(), weight: 3 }]);
                setCustomPriority("");
              }}
            >
              Add
            </Button>
          </div>
          <ul className="space-y-2">
            {d.priorities.map((p) => (
              <li key={p.id} className="grid items-center gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[1fr_240px_auto]">
                <span className="text-sm font-medium text-ink">{p.label}</span>
                <label className="flex items-center gap-2 text-xs text-ink-3">
                  Matters
                  <input type="range" min={1} max={5} value={p.weight} onChange={(e) => set("priorities", d.priorities.map((x) => (x.id === p.id ? { ...x, weight: Number(e.target.value) } : x)))} className="flex-1 accent-[var(--sky)]" aria-label={`How much ${p.label} matters`} />
                  <span className="w-14 text-ink-2">{["a little", "somewhat", "moderately", "a lot", "most"][p.weight - 1]}</span>
                </label>
                <Button type="button" size="icon-sm" variant="ghost" aria-label="Remove priority" onClick={() => set("priorities", d.priorities.filter((x) => x.id !== p.id))}>
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5">
          <p className="text-sm text-ink-2">Rate how well each option supports each priority, from 0 (not at all) to 5 (completely).</p>
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-surface-2/70 text-left text-xs text-ink-3">
                <tr>
                  <th className="px-3 py-2 font-medium">Priority</th>
                  {d.options.map((o, i) => (
                    <th key={o.id} className="px-3 py-2 font-medium">
                      {String.fromCharCode(65 + i)}. {o.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {d.priorities.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 text-ink">{p.label}</td>
                    {d.options.map((o) => (
                      <td key={o.id} className="px-3 py-2">
                        <select
                          value={o.scores[p.id] ?? 0}
                          onChange={(e) => setOption(o.id, { scores: { ...o.scores, [p.id]: Number(e.target.value) } })}
                          className="rounded-lg border border-line-strong bg-surface px-2 py-1 text-sm"
                          aria-label={`${o.label}: ${p.label}`}
                        >
                          {[0, 1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3">
            {ranked.map((o) => {
              const s = score(o, d.priorities);
              return (
                <div key={o.id} className="rounded-2xl border border-line p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium text-ink">{o.label}</p>
                    <p className="tabular-nums text-sm text-ink-2">{s}% fit with your priorities</p>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-sky transition-[width] duration-500" style={{ width: `${s}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-ink-3">
                    {o.pros.length} {o.pros.length === 1 ? "benefit" : "benefits"} · {o.cons.length} {o.cons.length === 1 ? "challenge" : "challenges"}
                    {o.risks ? " · risks noted" : ""}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="flex gap-2 rounded-2xl bg-sky-soft/60 p-3 text-xs leading-relaxed text-ink-2">
            <Info className="mt-0.5 size-3.5 shrink-0 text-[#246aa6]" />
            This comparison is your own thinking laid out side by side, not an answer. If the result surprises you, that is useful information too: ask yourself why.
          </p>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-4">
          <Field label="What have you learned from thinking this through?" htmlFor="d-ref">
            <Textarea id="d-ref" value={d.reflection ?? ""} onChange={(e) => set("reflection", e.target.value)} maxLength={2000} className="min-h-24" />
          </Field>
          <Field label="A possible next step" htmlFor="d-next" hint="Something small and specific, like asking someone for information.">
            <Input id="d-next" value={d.next_step ?? ""} onChange={(e) => set("next_step", e.target.value)} maxLength={300} />
          </Field>
          <div>
            <p className="text-sm font-medium text-ink">Have you decided? (Optional)</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip on={!d.chosen} onClick={() => setD((x) => ({ ...x, chosen: null, status: "open" }))}>
                Not yet
              </Chip>
              {d.options.map((o) => (
                <Chip key={o.id} on={d.chosen === o.id} onClick={() => setD((x) => ({ ...x, chosen: o.id, status: "decided" }))}>
                  {o.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-line pt-4">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || pending}>
          <ArrowLeft /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => persist(step + 1)} disabled={!canNext} loading={pending}>
            Save and continue <ArrowRight />
          </Button>
        ) : (
          <Button onClick={() => persist(undefined, true)} loading={pending}>
            <Check /> Save
          </Button>
        )}
      </div>
    </SectionCard>
  );
}

export function Decisions({ decisions }: { decisions: Decision[] }) {
  const [open, setOpen] = useState<Draft | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        {open ? (
          <Wizard key={open.id ?? "new"} initial={open} onClose={() => setOpen(null)} />
        ) : (
          <SectionCard
            title="Your decisions"
            description="Pick up where you left off, or start a new one."
            action={
              <Button size="sm" onClick={() => setOpen(empty())}>
                <Plus /> New decision
              </Button>
            }
          >
            {decisions.length ? (
              <ul className="space-y-2.5">
                {decisions.map((d) => {
                  const chosen = d.options.find((o) => o.id === d.chosen);
                  return (
                    <li key={d.id} className="flex items-start gap-3 rounded-2xl border border-line p-4">
                      <button className="min-w-0 flex-1 text-left" onClick={() => setOpen({ ...d })}>
                        <p className="font-medium text-ink hover:underline">{d.title}</p>
                        <p className="mt-0.5 text-xs text-ink-3">
                          {DECISION_AREAS[d.area]} · {d.options.length} options · {d.status === "decided" && chosen ? `Decided: ${chosen.label}` : "Still thinking"}
                        </p>
                        {d.next_step && <p className="mt-1.5 text-sm text-ink-2">Next step: {d.next_step}</p>}
                      </button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Delete decision"
                        disabled={pending}
                        onClick={() => {
                          if (!confirm("Delete this decision?")) return;
                          start(async () => {
                            const r = await deleteDecision(d.id);
                            if (!r.ok) toast.error(r.error);
                          });
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState compact illustration="sorting-thoughts" title="No decisions yet" description="When a choice feels overwhelming, start one here. It saves as you go." action={<Button onClick={() => setOpen(empty())}>Start a decision</Button>} />
            )}
          </SectionCard>
        )}
      </div>
      <aside className="space-y-4">
        <div className="rounded-3xl border border-line bg-surface p-5 text-sm leading-relaxed text-ink-2 shadow-sm">
          <p className="font-medium text-ink">How this works</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5">
            <li>Describe the situation.</li>
            <li>List your realistic options.</li>
            <li>Note benefits and challenges for each.</li>
            <li>Think through likely outcomes and risks.</li>
            <li>Decide what matters most to you.</li>
            <li>Compare the options side by side.</li>
            <li>Reflect and choose a next step.</li>
          </ol>
          <p className="mt-3 text-xs text-ink-3">The assistant never decides for you. It helps you see your own reasoning clearly.</p>
        </div>
        <div className="rounded-3xl bg-sky-soft/60 p-5 text-sm leading-relaxed text-ink-2">
          <p className="font-medium text-ink">Example</p>
          <p className="mt-1">Unsure whether to join an extracurricular activity with exams coming up? Compare your interest, the time available, your academic responsibilities and alternatives such as joining after exams.</p>
        </div>
      </aside>
    </div>
  );
}
