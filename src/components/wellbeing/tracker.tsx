"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Info, Lightbulb, Pencil, Plus, Target, Trash2, X } from "lucide-react";
import { deleteBehaviourGoal, deleteBehaviourLog, saveBehaviourGoal, saveBehaviourLog } from "@/actions/wellbeing";
import { behaviourInsights, behaviourReport, type BehaviourLog } from "@/lib/insights";
import { addDays, BEHAVIOURS, FEELINGS, fromKey, IMPACTS, shortDay, toKey, weekStart, type Behaviour, type Feeling } from "@/lib/wellbeing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip, Meter, SectionCard } from "./shell";

export type BehaviourGoal = { id: string; behaviour: Behaviour; title: string; target: string | null; status: "active" | "done" | "dropped" };

const blank = (today: string) => ({
  logged_on: today,
  behaviour: "study" as Behaviour,
  label: "",
  hours: "",
  before_context: "",
  feeling: null as Feeling | null,
  after_effect: "",
  impact: null as number | null,
});

function LogForm({ today, editing, onDone }: { today: string; editing: BehaviourLog | null; onDone: () => void }) {
  const [f, setF] = useState(() =>
    editing
      ? { ...editing, label: editing.label ?? "", hours: editing.hours != null ? String(editing.hours) : "", before_context: editing.before_context ?? "", after_effect: editing.after_effect ?? "" }
      : blank(today),
  );
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = () =>
    start(async () => {
      const r = await saveBehaviourLog({
        id: editing?.id,
        logged_on: f.logged_on,
        behaviour: f.behaviour,
        label: f.label,
        hours: f.hours === "" ? null : Number(f.hours),
        before_context: f.before_context,
        feeling: f.feeling,
        after_effect: f.after_effect,
        impact: f.impact,
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success(editing ? "Entry updated" : "Logged");
      setF(blank(today));
      onDone();
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(BEHAVIOURS) as Behaviour[]).map((b) => (
          <Chip key={b} on={f.behaviour === b} onClick={() => set("behaviour", b)}>
            <span aria-hidden>{BEHAVIOURS[b].emoji}</span> {BEHAVIOURS[b].label}
          </Chip>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px_150px]">
        <Field label="What exactly?" htmlFor="b-label" optional>
          <Input id="b-label" value={f.label} onChange={(e) => set("label", e.target.value)} maxLength={80} placeholder="e.g. Put off the chemistry worksheet" />
        </Field>
        <Field label="Hours" htmlFor="b-hours" optional>
          <Input id="b-hours" type="number" min={0} max={24} step={0.5} value={f.hours} disabled={!BEHAVIOURS[f.behaviour].hours} onChange={(e) => set("hours", e.target.value)} />
        </Field>
        <Field label="Date" htmlFor="b-date">
          <Input id="b-date" type="date" max={today} value={f.logged_on} onChange={(e) => set("logged_on", e.target.value)} />
        </Field>
      </div>
      <Field label="What was happening before?" htmlFor="b-before" optional>
        <Textarea id="b-before" value={f.before_context} onChange={(e) => set("before_context", e.target.value)} maxLength={500} className="min-h-16" placeholder="Where were you, what had just happened, what were you thinking about?" />
      </Field>
      <div>
        <p className="text-sm font-medium text-ink">How were you feeling at the time?</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(Object.keys(FEELINGS) as Feeling[]).map((k) => (
            <Chip key={k} on={f.feeling === k} onClick={() => set("feeling", f.feeling === k ? null : k)} className="py-1 text-xs">
              {FEELINGS[k].label}
            </Chip>
          ))}
        </div>
      </div>
      <Field label="What happened afterwards?" htmlFor="b-after" optional>
        <Textarea id="b-after" value={f.after_effect} onChange={(e) => set("after_effect", e.target.value)} maxLength={500} className="min-h-16" placeholder="How did it turn out? Anything you noticed?" />
      </Field>
      <div>
        <p className="text-sm font-medium text-ink">Afterwards I felt…</p>
        <div className="mt-2 grid grid-cols-5 gap-1 rounded-2xl bg-surface-2 p-1">
          {IMPACTS.map((i) => (
            <button
              key={i.value}
              type="button"
              onClick={() => set("impact", f.impact === i.value ? null : i.value)}
              aria-pressed={f.impact === i.value}
              className={cn("rounded-xl px-1 py-2 text-[11px] font-medium leading-tight transition sm:text-xs", f.impact === i.value ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink")}
            >
              {i.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={save} loading={pending}>
          {editing ? "Save changes" : "Log it"}
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

function Goals({ goals }: { goals: BehaviourGoal[] }) {
  const [adding, setAdding] = useState(false);
  const [g, setG] = useState({ behaviour: "study" as Behaviour, title: "", target: "" });
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.error ?? "Something went wrong.");
    });
  const active = goals.filter((x) => x.status === "active");
  const finished = goals.filter((x) => x.status !== "active");
  return (
    <SectionCard
      title="Small goals"
      description="Realistic changes you choose for yourself."
      action={
        <Button size="sm" variant="secondary" onClick={() => setAdding((a) => !a)}>
          {adding ? <X /> : <Plus />} {adding ? "Close" : "New goal"}
        </Button>
      }
    >
      {adding && (
        <div className="mb-4 space-y-3 rounded-2xl bg-surface-2/70 p-4">
          <div className="grid gap-3 sm:grid-cols-[170px_1fr]">
            <Select aria-label="Area" value={g.behaviour} onChange={(e) => setG({ ...g, behaviour: e.target.value as Behaviour })}>
              {(Object.keys(BEHAVIOURS) as Behaviour[]).map((b) => (
                <option key={b} value={b}>
                  {BEHAVIOURS[b].label}
                </option>
              ))}
            </Select>
            <Input aria-label="Goal" value={g.title} onChange={(e) => setG({ ...g, title: e.target.value })} maxLength={120} placeholder="e.g. Start homework before 6pm on weekdays" />
          </div>
          <Input aria-label="How you'll know" value={g.target} onChange={(e) => setG({ ...g, target: e.target.value })} maxLength={200} placeholder="How will you know it's working? (optional)" />
          <Button
            size="sm"
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await saveBehaviourGoal({ ...g, status: "active" });
                if (!r.ok) return void toast.error(r.error);
                setG({ behaviour: "study", title: "", target: "" });
                setAdding(false);
              })
            }
          >
            Add goal
          </Button>
        </div>
      )}
      {active.length || finished.length ? (
        <ul className="space-y-2">
          {[...active, ...finished].map((x) => (
            <li key={x.id} className={cn("flex items-start gap-3 rounded-2xl border border-line p-3", x.status !== "active" && "opacity-60")}>
              <Target className={cn("mt-0.5 size-4 shrink-0", x.status === "done" ? "text-ok" : "text-[#1f8a6b]")} />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium text-ink", x.status === "done" && "line-through")}>{x.title}</p>
                <p className="text-xs text-ink-3">
                  {BEHAVIOURS[x.behaviour].label}
                  {x.target ? ` · ${x.target}` : ""}
                  {x.status === "dropped" ? " · Let go" : ""}
                </p>
              </div>
              {x.status === "active" ? (
                <span className="flex gap-1">
                  <Button size="icon-sm" variant="ghost" aria-label="Mark as done" disabled={pending} onClick={() => run(() => saveBehaviourGoal({ ...x, target: x.target ?? "", status: "done" }))}>
                    <CheckCircle2 />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Let this goal go" disabled={pending} onClick={() => run(() => saveBehaviourGoal({ ...x, target: x.target ?? "", status: "dropped" }))}>
                    <X />
                  </Button>
                </span>
              ) : (
                <Button size="icon-sm" variant="ghost" aria-label="Delete goal" disabled={pending} onClick={() => run(() => deleteBehaviourGoal(x.id))}>
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-3">No goals yet. Once you notice a pattern, set one small, specific change.</p>
      )}
    </SectionCard>
  );
}

export function Tracker({ logs, goals }: { logs: BehaviourLog[]; goals: BehaviourGoal[] }) {
  const [today, setToday] = useState<string | null>(null);
  const [editing, setEditing] = useState<BehaviourLog | null>(null);
  const [range, setRange] = useState<"week" | "month">("week");
  const [pending, start] = useTransition();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dates follow the device's own calendar
    setToday(toKey(new Date()));
  }, []);

  const insights = useMemo(() => behaviourInsights(logs), [logs]);
  const report = useMemo(() => {
    if (!today) return null;
    const now = fromKey(today);
    const from = range === "week" ? toKey(weekStart(now)) : toKey(new Date(now.getFullYear(), now.getMonth(), 1));
    const prevFrom = range === "week" ? toKey(addDays(weekStart(now), -7)) : toKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const prevTo = toKey(addDays(fromKey(from), -1));
    return { now: behaviourReport(logs, from, today), prev: behaviourReport(logs, prevFrom, prevTo) };
  }, [logs, range, today]);

  const grouped = useMemo(() => {
    const m = new Map<string, BehaviourLog[]>();
    logs.slice(0, 60).forEach((l) => m.set(l.logged_on, [...(m.get(l.logged_on) ?? []), l]));
    return [...m.entries()];
  }, [logs]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-6">
        <SectionCard title={editing ? "Edit entry" : "Log a behaviour"} description="Record what you did and what surrounded it. A few entries a week is enough to see patterns.">
          {today ? <LogForm key={editing?.id ?? "new"} today={today} editing={editing} onDone={() => setEditing(null)} /> : <div className="h-64 animate-pulse rounded-2xl bg-surface-2" />}
        </SectionCard>

        <SectionCard title="Recent entries">
          {grouped.length ? (
            <div className="space-y-5">
              {grouped.map(([day, items]) => (
                <div key={day}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-3">{shortDay(day)}</p>
                  <ul className="space-y-2">
                    {items.map((l) => (
                      <li key={l.id} className="rounded-2xl border border-line p-3">
                        <div className="flex items-start gap-3">
                          <span className="text-xl" aria-hidden>
                            {BEHAVIOURS[l.behaviour].emoji}
                          </span>
                          <div className="min-w-0 flex-1 text-sm">
                            <p className="font-medium text-ink">
                              {l.label || BEHAVIOURS[l.behaviour].label}
                              {l.hours != null && <span className="font-normal text-ink-3"> · {l.hours}h</span>}
                            </p>
                            <p className="mt-0.5 text-xs text-ink-3">
                              {[l.feeling && `Feeling ${FEELINGS[l.feeling].label.toLowerCase()}`, l.impact != null && IMPACTS.find((i) => i.value === l.impact)?.label.toLowerCase() + " afterwards"].filter(Boolean).join(" · ")}
                            </p>
                            {l.before_context && <p className="mt-1.5 text-ink-2"><span className="text-ink-3">Before: </span>{l.before_context}</p>}
                            {l.after_effect && <p className="mt-1 text-ink-2"><span className="text-ink-3">After: </span>{l.after_effect}</p>}
                          </div>
                          <span className="flex shrink-0">
                            <Button size="icon-sm" variant="ghost" aria-label="Edit entry" onClick={() => setEditing(l)}>
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
                                  const r = await deleteBehaviourLog(l.id);
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
                </div>
              ))}
            </div>
          ) : (
            <EmptyState compact illustration="sorting-thoughts" title="No entries yet" description="Start with something simple, like last night's sleep or a task you put off today." />
          )}
        </SectionCard>
      </div>

      <aside className="space-y-6">
        <SectionCard title="Patterns we noticed" description="Based only on your entries.">
          {insights.notes.length ? (
            <ul className="space-y-2.5">
              {insights.notes.map((n) => (
                <li key={n.text} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
                  {n.tone === "warn" ? <AlertCircle className="mt-0.5 size-4 shrink-0 text-warn" /> : n.tone === "good" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" /> : <Info className="mt-0.5 size-4 shrink-0 text-sky" />}
                  {n.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">Log at least three entries and patterns will start to appear here.</p>
          )}
          {insights.questions.length > 0 && (
            <div className="mt-4 rounded-2xl bg-mint-soft/60 p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <Lightbulb className="size-4 text-[#1f8a6b]" /> Questions to reflect on
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
                {insights.questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={range === "week" ? "This week" : "This month"}
          action={
            <div className="inline-flex rounded-xl bg-surface-2 p-1 text-xs">
              {(["week", "month"] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)} aria-pressed={range === r} className={cn("rounded-lg px-2.5 py-1 font-medium transition", range === r ? "bg-surface text-ink shadow-sm" : "text-ink-2")}>
                  {r === "week" ? "Weekly" : "Monthly"}
                </button>
              ))}
            </div>
          }
        >
          {report && report.now.total ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-2">
                {report.now.total} {report.now.total === 1 ? "entry" : "entries"}
                {report.prev.total ? ` (${report.prev.total} the ${range} before)` : ""}.{" "}
                {report.now.better + report.now.worse > 0 && `${report.now.better} left you feeling better, ${report.now.worse} worse.`}
              </p>
              {report.now.counts.map(([b, n]) => (
                <Meter key={b} label={`${BEHAVIOURS[b].emoji} ${BEHAVIOURS[b].label}`} value={n} max={report.now.counts[0][1]} color="#34b892" />
              ))}
              {report.now.sleep != null && <p className="text-xs text-ink-3">Average sleep: {report.now.sleep} hours</p>}
            </div>
          ) : (
            <p className="text-sm text-ink-3">Nothing logged in this period yet.</p>
          )}
        </SectionCard>

        <Goals goals={goals} />
      </aside>
    </div>
  );
}
