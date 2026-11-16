"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, HeartHandshake, Info, Pencil, Send, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { deleteStressEntry, saveStressEntry } from "@/actions/wellbeing";
import { stressInsights, type StressEntry } from "@/lib/insights";
import { COPING, IMPACT_LEVELS, shortDay, STRESS_FREQUENCY, STRESS_IMPACTS, STRESS_SOURCES, toKey, type StressSource } from "@/lib/wellbeing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip, Meter, SectionCard } from "./shell";

const INTENSITY = ["Mild", "Noticeable", "Moderate", "Strong", "Overwhelming"];
type ImpactKey = (typeof STRESS_IMPACTS)[number]["key"];

const blank = (today: string) => ({
  entry_on: today,
  sources: [] as StressSource[],
  other_source: "",
  intensity: 3,
  frequency: "sometimes" as keyof typeof STRESS_FREQUENCY,
  impact_concentration: 0,
  impact_sleep: 0,
  impact_motivation: 0,
  impact_relationships: 0,
  impact_daily: 0,
  triggers: "",
  helped: "",
});

function EntryForm({ today, editing, onDone }: { today: string; editing: StressEntry | null; onDone: () => void }) {
  const [f, setF] = useState(() =>
    editing ? { ...editing, frequency: editing.frequency as keyof typeof STRESS_FREQUENCY, other_source: editing.other_source ?? "", triggers: editing.triggers ?? "", helped: editing.helped ?? "" } : blank(today),
  );
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const toggle = (s: StressSource) => set("sources", f.sources.includes(s) ? f.sources.filter((x) => x !== s) : [...f.sources, s]);
  const save = () =>
    start(async () => {
      const r = await saveStressEntry({ id: editing?.id, ...f });
      if (!r.ok) return void toast.error(r.error);
      toast.success(editing ? "Entry updated" : "Entry saved");
      setF(blank(today));
      onDone();
    });
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-ink">What is causing stress?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(STRESS_SOURCES) as StressSource[]).map((s) => (
            <Chip key={s} on={f.sources.includes(s)} onClick={() => toggle(s)}>
              {STRESS_SOURCES[s]}
            </Chip>
          ))}
        </div>
        {f.sources.includes("other") && <Input className="mt-2" value={f.other_source} onChange={(e) => set("other_source", e.target.value)} maxLength={80} placeholder="Describe it briefly" aria-label="Other source" />}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-ink">
            How strong is it? <span className="font-normal text-ink-2">{INTENSITY[f.intensity - 1]}</span>
          </p>
          <input type="range" min={1} max={5} value={f.intensity} onChange={(e) => set("intensity", Number(e.target.value))} className="mt-3 w-full accent-[var(--coral)]" aria-label="Intensity" />
        </div>
        <Field label="Date" htmlFor="s-date">
          <Input id="s-date" type="date" max={today} value={f.entry_on} onChange={(e) => set("entry_on", e.target.value)} />
        </Field>
      </div>
      <div>
        <p className="text-sm font-medium text-ink">How often does this happen?</p>
        <div className="mt-2 grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1 sm:grid-cols-4">
          {(Object.keys(STRESS_FREQUENCY) as (keyof typeof STRESS_FREQUENCY)[]).map((k) => (
            <button key={k} type="button" onClick={() => set("frequency", k)} aria-pressed={f.frequency === k} className={cn("rounded-xl px-2 py-2 text-xs font-medium transition", f.frequency === k ? "bg-surface text-ink shadow-sm" : "text-ink-2")}>
              {STRESS_FREQUENCY[k]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-ink">How much is it affecting…</p>
        <div className="mt-2 space-y-2">
          {STRESS_IMPACTS.map((i) => (
            <div key={i.key} className="grid items-center gap-2 sm:grid-cols-[140px_1fr]">
              <span className="text-sm text-ink-2">{i.label}</span>
              <div className="grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1">
                {IMPACT_LEVELS.map((label, n) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => set(i.key as ImpactKey, n)}
                    aria-pressed={f[i.key as ImpactKey] === n}
                    aria-label={`${i.label}: ${label}`}
                    className={cn("rounded-lg px-1 py-1.5 text-[11px] font-medium transition", f[i.key as ImpactKey] === n ? "bg-surface text-ink shadow-sm" : "text-ink-2")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <Field label="What seems to set it off?" htmlFor="s-trig" optional>
        <Textarea id="s-trig" value={f.triggers} onChange={(e) => set("triggers", e.target.value)} maxLength={500} className="min-h-16" placeholder="Particular situations, times, people or thoughts" />
      </Field>
      <Field label="What helped, if anything?" htmlFor="s-help" optional>
        <Textarea id="s-help" value={f.helped} onChange={(e) => set("helped", e.target.value)} maxLength={500} className="min-h-16" />
      </Field>
      <div className="flex gap-2">
        <Button onClick={save} loading={pending} disabled={!f.sources.length}>
          {editing ? "Save changes" : "Save entry"}
        </Button>
        {editing && (
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export function StressAnalysis({ entries }: { entries: StressEntry[] }) {
  const router = useRouter();
  const [today, setToday] = useState<string | null>(null);
  const [editing, setEditing] = useState<StressEntry | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dates follow the device's own calendar
    setToday(toKey(new Date()));
  }, []);
  const insight = useMemo(() => stressInsights(entries), [entries]);
  const coping = insight.ranked.slice(0, 2).map(([s]) => s);

  const share = () => {
    const lines = [
      "I've been using the Stress Pattern Analysis and wanted to share a summary.",
      "",
      ...insight.summary.map((s) => `• ${s}`),
      insight.recentAvg != null ? `• Average intensity in my recent entries: ${insight.recentAvg} out of 5.` : "",
      "",
      "Could we talk about it?",
    ].filter((l, i, a) => l || a[i - 1]);
    try {
      sessionStorage.setItem("btm:draft", JSON.stringify({ subject: "My stress summary", body: lines.join("\n"), category: "wellbeing" }));
    } catch {}
    router.push("/student/messages/new?category=wellbeing");
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-6">
        <SectionCard title={editing ? "Edit entry" : "Record a stressful moment"} description="A quick entry each time stress shows up builds a clear picture over a few weeks.">
          {today ? <EntryForm key={editing?.id ?? "new"} today={today} editing={editing} onDone={() => setEditing(null)} /> : <div className="h-72 animate-pulse rounded-2xl bg-surface-2" />}
        </SectionCard>

        <SectionCard title="Stress history">
          {entries.length ? (
            <ul className="space-y-2.5">
              {entries.map((e) => (
                <li key={e.id} className="rounded-2xl border border-line p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 flex-col items-center justify-center rounded-xl bg-coral-soft text-[#b4452f]" title={INTENSITY[e.intensity - 1]}>
                      <span className="text-sm font-semibold leading-none">{e.intensity}</span>
                      <span className="text-[9px]">/5</span>
                    </span>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="text-xs text-ink-3">
                        {shortDay(e.entry_on)} · {STRESS_FREQUENCY[e.frequency as keyof typeof STRESS_FREQUENCY]}
                      </p>
                      <p className="mt-0.5 font-medium text-ink">{e.sources.map((s) => (s === "other" && e.other_source ? e.other_source : STRESS_SOURCES[s])).join(", ")}</p>
                      {e.triggers && <p className="mt-1 text-ink-2"><span className="text-ink-3">Triggers: </span>{e.triggers}</p>}
                      {e.helped && <p className="mt-1 text-ink-2"><span className="text-ink-3">Helped: </span>{e.helped}</p>}
                    </div>
                    <span className="flex shrink-0">
                      <Button size="icon-sm" variant="ghost" aria-label="Edit entry" onClick={() => setEditing(e)}>
                        <Pencil />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Delete entry"
                        disabled={pending}
                        onClick={() => {
                          if (!confirm("Delete this entry?")) return;
                          start(async () => {
                            const r = await deleteStressEntry(e.id);
                            if (!r.ok) toast.error(r.error);
                          });
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact illustration="in-thought" title="No entries yet" description="Your history will show here, so you can see which stressors keep coming back." />
          )}
        </SectionCard>
      </div>

      <aside className="space-y-6">
        <SectionCard title="Your summary" description={entries.length ? `From ${entries.length} ${entries.length === 1 ? "entry" : "entries"}` : undefined}>
          {entries.length >= 2 ? (
            <div className="space-y-4">
              <ul className="space-y-2 text-sm leading-relaxed text-ink-2">
                {insight.summary.map((s) => (
                  <li key={s} className="flex gap-2">
                    {s.includes("more intense") ? <TrendingUp className="mt-0.5 size-4 shrink-0 text-warn" /> : s.includes("less intense") ? <TrendingDown className="mt-0.5 size-4 shrink-0 text-ok" /> : <Info className="mt-0.5 size-4 shrink-0 text-sky" />}
                    {s}
                  </li>
                ))}
              </ul>
              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Recurring sources</p>
                {insight.ranked.slice(0, 5).map(([s, n]) => (
                  <Meter key={s} label={STRESS_SOURCES[s]} value={n} max={insight.ranked[0][1]} color="#ef7d67" />
                ))}
              </div>
              <div className="space-y-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Average effect (0 to 3)</p>
                {Object.entries(insight.impacts).map(([k, v]) => (
                  <Meter key={k} label={k} value={v} max={3} color="#8b68d6" />
                ))}
              </div>
              <Button variant="secondary" className="w-full" onClick={share}>
                <Send /> Share this summary with a counselor
              </Button>
            </div>
          ) : (
            <p className="text-sm text-ink-3">Add two or more entries to see your patterns.</p>
          )}
        </SectionCard>

        {insight.suggestSupport && (
          <div className="flex gap-3 rounded-3xl border-2 border-primary/25 bg-primary-soft/50 p-5">
            <HeartHandshake className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-medium text-ink">This looks like a lot to carry</p>
              <p className="mt-1 leading-relaxed text-ink-2">Your entries show frequent or strong stress. Talking to a counselor, teacher or another adult you trust can help.</p>
              <Link href="/student/match" className="mt-2 inline-flex items-center gap-1 font-medium text-primary hover:underline">
                Talk to a counselor <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        )}

        {coping.length > 0 && (
          <SectionCard title="Approaches that may help" description="Based on your most frequent sources.">
            <div className="space-y-4">
              {coping.map((s) => (
                <div key={s}>
                  <p className="text-sm font-medium text-ink">{COPING[s].title}</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink-2">
                    {COPING[s].tips.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  {COPING[s].link && (
                    <Link href={COPING[s].link!.href} className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                      {COPING[s].link!.label} <ArrowRight className="size-3.5" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        <p className="flex gap-2 px-1 text-xs leading-relaxed text-ink-3">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          This is a self-reflection tool, not a clinical stress assessment or a mental health diagnosis.
        </p>
      </aside>
    </div>
  );
}
