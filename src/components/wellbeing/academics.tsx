"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, Circle, HeartHandshake, Pause, Pencil, Play, Plus, RotateCcw, Sparkles, Timer, Trash2, Wand2, X } from "lucide-react";
import { deleteTask, logStudySession, saveAcademicReview, saveTask } from "@/actions/wellbeing";
import { ACADEMIC_PRESSURES, addDays, fromKey, shortDay, TASK_KINDS, toKey, weekStart } from "@/lib/wellbeing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip, SectionCard } from "./shell";

type Kind = keyof typeof TASK_KINDS;
type Step = { id: string; label: string; done: boolean };
export type AcademicTask = {
  id: string;
  title: string;
  kind: Kind;
  subject: string | null;
  due_on: string;
  est_hours: number;
  importance: number;
  progress: number;
  steps: Step[];
  done_at: string | null;
};
export type StudySession = { id: string; task_id: string | null; minutes: number; completed_at: string };
export type AcademicReview = {
  id: string;
  kind: "checkin" | "weekly";
  week_start: string;
  pressures: (keyof typeof ACADEMIC_PRESSURES)[];
  level: number | null;
  went_well: string | null;
  difficult: string | null;
  improve: string | null;
  note: string | null;
  created_at: string;
};

const IMPORTANCE = ["Low", "Medium", "High"];
const SUGGESTED_STEPS: Record<Kind, string[]> = {
  assignment: ["Read the brief and marking criteria", "Collect notes and sources", "Write an outline", "Write the first draft", "Check, improve and submit"],
  project: ["Agree the scope and deadline milestones", "Research and gather materials", "Build the main part", "Test or review with someone", "Finish and present"],
  exam: ["List every topic that's examined", "Make short summary notes per topic", "Practise questions on weak topics", "Do a past paper under timed conditions", "Review mistakes and re-test"],
  presentation: ["Decide the three key points", "Make the slides", "Write speaker notes", "Rehearse out loud and time it", "Final run-through"],
  reading: ["Skim headings and summary", "Read the first half and note key ideas", "Read the second half", "Write a five-line summary"],
  other: ["Clarify exactly what's needed", "Do the first small part", "Finish the main work", "Review and wrap up"],
};
const uid = () => Math.random().toString(36).slice(2, 10);
const daysBetween = (a: string, b: string) => Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000);
const remainingHours = (t: AcademicTask) => Math.max(0, Number(t.est_hours) * (1 - t.progress / 100));

/** Priority: sooner deadlines and more important tasks first. */
const priority = (t: AcademicTask, today: string) => {
  const days = Math.max(0, daysBetween(today, t.due_on));
  return t.importance * 10 - days * 1.5 + (days <= 2 ? 20 : 0);
};

/** Spreads the remaining work for each task over the days before it's due, within a daily limit. */
function buildPlan(tasks: AcademicTask[], today: string, hoursPerDay: number, restDay: number) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const key = toKey(addDays(fromKey(today), i));
    return { key, rest: fromKey(key).getDay() === restDay, left: fromKey(key).getDay() === restDay ? 0 : hoursPerDay, blocks: [] as { task: AcademicTask; hours: number }[] };
  });
  let unplanned = 0;
  const open = tasks.filter((t) => !t.done_at && remainingHours(t) > 0).sort((a, b) => a.due_on.localeCompare(b.due_on) || b.importance - a.importance);
  for (const t of open) {
    let need = remainingHours(t);
    // Exams and presentations: finish the day before. Others can be finished on the day.
    const lastIndex = Math.min(6, daysBetween(today, t.due_on) - (t.kind === "exam" || t.kind === "presentation" ? 1 : 0));
    const window = days.slice(0, Math.max(0, lastIndex) + 1).filter((d) => d.left > 0);
    if (lastIndex < 0 || !window.length) {
      unplanned += need;
      continue;
    }
    // Spread evenly, then fill what's left wherever there's space.
    const share = need / window.length;
    for (const d of window) {
      const h = Math.min(d.left, Math.round(share * 2) / 2 || 0.5, need);
      if (h <= 0) continue;
      d.blocks.push({ task: t, hours: h });
      d.left -= h;
      need -= h;
    }
    for (const d of window) {
      if (need <= 0) break;
      const h = Math.min(d.left, need);
      if (h <= 0) continue;
      const existing = d.blocks.find((b) => b.task.id === t.id);
      if (existing) existing.hours += h;
      else d.blocks.push({ task: t, hours: h });
      d.left -= h;
      need -= h;
    }
    if (daysBetween(today, t.due_on) <= 6) unplanned += Math.max(0, need);
  }
  return { days, unplanned: Math.round(unplanned * 10) / 10 };
}

function TaskForm({ today, editing, onDone }: { today: string; editing: AcademicTask | null; onDone: () => void }) {
  const [t, setT] = useState(() =>
    editing
      ? { ...editing, subject: editing.subject ?? "", est_hours: String(editing.est_hours) }
      : { title: "", kind: "assignment" as Kind, subject: "", due_on: toKey(addDays(fromKey(today), 7)), est_hours: "3", importance: 2, progress: 0, steps: [] as Step[] },
  );
  const [step, setStep] = useState("");
  const [pending, start] = useTransition();
  const set = <K extends keyof typeof t>(k: K, v: (typeof t)[K]) => setT((x) => ({ ...x, [k]: v }));
  const save = () =>
    start(async () => {
      const r = await saveTask({
        id: editing?.id,
        title: t.title,
        kind: t.kind,
        subject: t.subject,
        due_on: t.due_on,
        est_hours: Number(t.est_hours) || 1,
        importance: t.importance,
        progress: t.progress,
        steps: t.steps,
        done: !!editing?.done_at,
      });
      if (!r.ok) return void toast.error(r.error);
      toast.success(editing ? "Task updated" : "Task added");
      onDone();
    });
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
        <Field label="Task" htmlFor="t-title">
          <Input id="t-title" value={t.title} onChange={(e) => set("title", e.target.value)} maxLength={120} placeholder="e.g. Physics lab report" />
        </Field>
        <Field label="Type" htmlFor="t-kind">
          <Select id="t-kind" value={t.kind} onChange={(e) => set("kind", e.target.value as Kind)}>
            {(Object.keys(TASK_KINDS) as Kind[]).map((k) => (
              <option key={k} value={k}>
                {TASK_KINDS[k]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Subject" htmlFor="t-subj" optional className="sm:col-span-2">
          <Input id="t-subj" value={t.subject} onChange={(e) => set("subject", e.target.value)} maxLength={60} />
        </Field>
        <Field label="Due" htmlFor="t-due">
          <Input id="t-due" type="date" value={t.due_on} onChange={(e) => set("due_on", e.target.value)} />
        </Field>
        <Field label="Hours needed" htmlFor="t-h">
          <Input id="t-h" type="number" min={0.5} max={200} step={0.5} value={t.est_hours} onChange={(e) => set("est_hours", e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-ink">Importance</span>
        {IMPORTANCE.map((label, i) => (
          <Chip key={label} on={t.importance === i + 1} onClick={() => set("importance", i + 1)} className="py-1 text-xs">
            {label}
          </Chip>
        ))}
      </div>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-ink">Break it into steps</p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => set("steps", [...t.steps, ...SUGGESTED_STEPS[t.kind].filter((s) => !t.steps.some((x) => x.label === s)).map((label) => ({ id: uid(), label, done: false }))].slice(0, 20))}
          >
            <Wand2 /> Suggest steps
          </Button>
        </div>
        <ul className="mt-2 space-y-1.5">
          {t.steps.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2 rounded-xl bg-surface-2/70 px-3 py-2 text-sm">
              <span className="text-xs text-ink-3">{i + 1}.</span>
              <span className="flex-1 text-ink">{s.label}</span>
              <button type="button" aria-label="Remove step" className="text-ink-3 hover:text-danger" onClick={() => set("steps", t.steps.filter((x) => x.id !== s.id))}>
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-2">
          <Input
            value={step}
            onChange={(e) => setStep(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && step.trim()) {
                e.preventDefault();
                set("steps", [...t.steps, { id: uid(), label: step.trim(), done: false }].slice(0, 20));
                setStep("");
              }
            }}
            maxLength={160}
            placeholder="Add a step and press Enter"
            aria-label="New step"
            className="h-10"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={save} loading={pending} disabled={t.title.trim().length < 2}>
          {editing ? "Save changes" : "Add task"}
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function TaskCard({ t, today, onEdit }: { t: AcademicTask; today: string; onEdit: () => void }) {
  const [pending, start] = useTransition();
  const days = daysBetween(today, t.due_on);
  const overdue = !t.done_at && days < 0;
  const update = (patch: Partial<AcademicTask> & { done?: boolean }) =>
    start(async () => {
      const next = { ...t, ...patch };
      const steps = next.steps;
      const progress = patch.steps && steps.length ? Math.round((steps.filter((s) => s.done).length / steps.length) * 100) : next.progress;
      const r = await saveTask({ id: t.id, title: t.title, kind: t.kind, subject: t.subject ?? "", due_on: t.due_on, est_hours: Number(t.est_hours), importance: t.importance, progress, steps, done: patch.done ?? (!!t.done_at || progress === 100) });
      if (!r.ok) toast.error(r.error);
    });
  return (
    <li className={cn("rounded-2xl border p-4", overdue ? "border-danger/30 bg-danger-soft/30" : "border-line", t.done_at && "opacity-60")}>
      <div className="flex items-start gap-3">
        <button type="button" aria-label={t.done_at ? "Mark as not done" : "Mark as done"} disabled={pending} onClick={() => update({ done: !t.done_at, progress: t.done_at ? Math.min(t.progress, 90) : 100 })} className="mt-0.5">
          {t.done_at ? <CheckCircle2 className="size-5 text-ok" /> : <Circle className="size-5 text-ink-3 hover:text-primary" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className={cn("font-medium text-ink", t.done_at && "line-through")}>{t.title}</p>
          <p className="mt-0.5 text-xs text-ink-3">
            {TASK_KINDS[t.kind]}
            {t.subject ? ` · ${t.subject}` : ""} · {IMPORTANCE[t.importance - 1]} importance · {Number(t.est_hours)}h
          </p>
          <p className={cn("mt-1 text-xs font-medium", overdue ? "text-danger" : days <= 2 && !t.done_at ? "text-warn" : "text-ink-2")}>
            {t.done_at ? "Completed" : overdue ? `Overdue by ${-days} ${-days === 1 ? "day" : "days"}` : days === 0 ? "Due today" : `Due ${shortDay(t.due_on)} (${days} ${days === 1 ? "day" : "days"})`}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-sun transition-[width]" style={{ width: `${t.done_at ? 100 : t.progress}%` }} />
          </div>
          {t.steps.length > 0 && (
            <ul className="mt-3 space-y-1">
              {t.steps.map((s) => (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
                    <input
                      type="checkbox"
                      checked={s.done}
                      disabled={pending}
                      onChange={() => update({ steps: t.steps.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)) })}
                      className="size-4 accent-[var(--primary)]"
                    />
                    <span className={cn(s.done && "text-ink-3 line-through")}>{s.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {!t.steps.length && !t.done_at && (
            <label className="mt-2 flex items-center gap-2 text-xs text-ink-3">
              Progress
              <input type="range" min={0} max={100} step={10} defaultValue={t.progress} onMouseUp={(e) => update({ progress: Number(e.currentTarget.value) })} onTouchEnd={(e) => update({ progress: Number(e.currentTarget.value) })} onKeyUp={(e) => update({ progress: Number(e.currentTarget.value) })} className="flex-1 accent-[var(--sun)]" aria-label="Progress" />
            </label>
          )}
        </div>
        <span className="flex shrink-0">
          <Button size="icon-sm" variant="ghost" aria-label="Edit task" onClick={onEdit}>
            <Pencil />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Delete task"
            disabled={pending}
            onClick={() => {
              if (!confirm("Delete this task?")) return;
              start(async () => {
                const r = await deleteTask(t.id);
                if (!r.ok) toast.error(r.error);
              });
            }}
          >
            <Trash2 />
          </Button>
        </span>
      </div>
    </li>
  );
}

const now = () => Date.now();

function StudyTimer({ tasks, minutesThisWeek }: { tasks: AcademicTask[]; minutesThisWeek: number }) {
  const [focus, setFocus] = useState(25);
  const [rest, setRest] = useState(5);
  const [taskId, setTaskId] = useState<string>("");
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const endsAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const secs = Math.max(0, Math.round((endsAt.current - now()) / 1000));
      setLeft(secs);
      if (secs > 0) return;
      setRunning(false);
      if (phase === "focus") {
        void logStudySession({ taskId: taskId || null, minutes: focus }).then((r) => r.ok && toast.success(`Nice work: ${focus} minutes logged. Time for a ${rest} minute break.`));
        setPhase("break");
        setLeft(rest * 60);
      } else {
        toast("Break over. Ready for the next session?");
        setPhase("focus");
        setLeft(focus * 60);
      }
    }, 500);
    return () => clearInterval(t);
  }, [running, phase, focus, rest, taskId]);

  const toggle = () => {
    if (running) setRunning(false);
    else {
      endsAt.current = now() + left * 1000;
      setRunning(true);
    }
  };
  const reset = (f = focus) => {
    setRunning(false);
    setPhase("focus");
    setLeft(f * 60);
  };
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <SectionCard title="Study session" description={`${Math.round(minutesThisWeek / 6) / 10} hours studied this week`}>
      <div className={cn("rounded-3xl p-5 text-center transition-colors", phase === "focus" ? "bg-sun-soft" : "bg-mint-soft")}>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-2">{phase === "focus" ? "Focus" : "Break: stand up, stretch, drink water"}</p>
        <p className="mt-1 font-display text-5xl tabular-nums text-ink" aria-live="polite">
          {mm}:{ss}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={toggle} className="rounded-full">
            {running ? <Pause /> : <Play />} {running ? "Pause" : "Start"}
          </Button>
          <Button variant="secondary" onClick={() => reset()} className="rounded-full" aria-label="Reset timer">
            <RotateCcw />
          </Button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field label="Focus" htmlFor="tm-f">
          <Select
            id="tm-f"
            value={focus}
            disabled={running}
            onChange={(e) => {
              setFocus(Number(e.target.value));
              reset(Number(e.target.value));
            }}
          >
            {[25, 35, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Break" htmlFor="tm-b">
          <Select id="tm-b" value={rest} disabled={running} onChange={(e) => setRest(Number(e.target.value))}>
            {[5, 10, 15].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Working on" htmlFor="tm-t" className="mt-3">
        <Select id="tm-t" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
          <option value="">General study</option>
          {tasks.filter((t) => !t.done_at).map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </Select>
      </Field>
    </SectionCard>
  );
}

function CheckIn({ week, latest }: { week: string; latest: AcademicReview | undefined }) {
  const [pressures, setPressures] = useState<(keyof typeof ACADEMIC_PRESSURES)[]>([]);
  const [level, setLevel] = useState(3);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <SectionCard title="Academic stress check-in" description={latest ? `Last check-in: ${shortDay(latest.created_at.slice(0, 10))}, pressure ${latest.level}/5` : "How is academic life feeling right now?"}>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(ACADEMIC_PRESSURES) as (keyof typeof ACADEMIC_PRESSURES)[]).map((p) => (
          <Chip key={p} on={pressures.includes(p)} onClick={() => setPressures((x) => (x.includes(p) ? x.filter((y) => y !== p) : [...x, p]))} className="py-1 text-xs">
            {ACADEMIC_PRESSURES[p]}
          </Chip>
        ))}
      </div>
      <p className="mt-4 text-sm font-medium text-ink">
        Overall pressure: <span className="font-normal text-ink-2">{level} of 5</span>
      </p>
      <input type="range" min={1} max={5} value={level} onChange={(e) => setLevel(Number(e.target.value))} className="mt-2 w-full accent-[var(--sun)]" aria-label="Overall pressure" />
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="What is making it difficult? (optional)" className="mt-3 min-h-16" />
      <Button
        className="mt-3"
        size="sm"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await saveAcademicReview({ kind: "checkin", week_start: week, pressures, level, note, went_well: "", difficult: "", improve: "" });
            if (!r.ok) return void toast.error(r.error);
            toast.success("Check-in saved");
            setPressures([]);
            setNote("");
          })
        }
      >
        Save check-in
      </Button>
    </SectionCard>
  );
}

function WeeklyReview({ week, review }: { week: string; review: AcademicReview | undefined }) {
  const [f, setF] = useState({ went_well: review?.went_well ?? "", difficult: review?.difficult ?? "", improve: review?.improve ?? "" });
  const [pending, start] = useTransition();
  return (
    <SectionCard title="Weekly academic review" description={`Week of ${shortDay(week)}`}>
      <div className="space-y-3">
        {(
          [
            ["went_well", "What went well this week?"],
            ["difficult", "What was difficult?"],
            ["improve", "What would you like to do differently next week?"],
          ] as const
        ).map(([k, q]) => (
          <label key={k} className="block">
            <span className="text-sm text-ink-2">{q}</span>
            <Textarea value={f[k]} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} maxLength={1000} className="mt-1.5 min-h-16" />
          </label>
        ))}
        <Button
          variant="secondary"
          size="sm"
          loading={pending}
          onClick={() =>
            start(async () => {
              const r = await saveAcademicReview({ id: review?.id, kind: "weekly", week_start: week, pressures: [], level: null, note: "", ...f });
              if (r.ok) toast.success("Weekly review saved");
              else toast.error(r.error);
            })
          }
        >
          Save review
        </Button>
      </div>
    </SectionCard>
  );
}

export function Academics({ tasks, sessions, reviews }: { tasks: AcademicTask[]; sessions: StudySession[]; reviews: AcademicReview[] }) {
  const [today, setToday] = useState<string | null>(null);
  const [form, setForm] = useState<AcademicTask | "new" | null>(null);
  const [hoursPerDay, setHoursPerDay] = useState(2.5);
  const [restDay, setRestDay] = useState(5);
  const [showDone, setShowDone] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dates follow the device's own calendar
    setToday(toKey(new Date()));
  }, []);

  const sorted = useMemo(
    () => (today ? [...tasks].filter((t) => !t.done_at).sort((a, b) => priority(b, today) - priority(a, today)) : []),
    [tasks, today],
  );
  const doneTasks = tasks.filter((t) => t.done_at);
  const plan = useMemo(() => (today ? buildPlan(tasks, today, hoursPerDay, restDay) : null), [tasks, today, hoursPerDay, restDay]);
  if (!today || !plan) return <div className="h-96 animate-pulse rounded-3xl bg-surface-2" />;

  const week = toKey(weekStart(fromKey(today)));
  const minutesThisWeek = sessions.filter((s) => s.completed_at.slice(0, 10) >= week).reduce((a, s) => a + s.minutes, 0);
  const overdue = sorted.filter((t) => t.due_on < today).length;
  const dueSoon = sorted.filter((t) => t.due_on >= today && daysBetween(today, t.due_on) <= 7).length;
  const completedThisWeek = doneTasks.filter((t) => (t.done_at ?? "").slice(0, 10) >= week).length;
  const latestCheckin = reviews.find((r) => r.kind === "checkin");
  const weekly = reviews.find((r) => r.kind === "weekly" && r.week_start === week);
  const needSupport = (latestCheckin?.level ?? 0) >= 4 || overdue >= 3 || plan.unplanned >= 4;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Due in the next 7 days", value: dueSoon, icon: CalendarDays, tone: "text-[#a26a00]" },
          { label: "Overdue", value: overdue, icon: AlertTriangle, tone: overdue ? "text-danger" : "text-ink-3" },
          { label: "Completed this week", value: completedThisWeek, icon: CheckCircle2, tone: "text-ok" },
          { label: "Hours studied this week", value: Math.round(minutesThisWeek / 6) / 10, icon: Timer, tone: "text-primary" },
        ].map((s) => (
          <div key={s.label} className="rounded-3xl border border-line bg-surface p-4 shadow-sm">
            <s.icon className={cn("size-5", s.tone)} />
            <p className="mt-2 font-display text-3xl tabular-nums text-ink">{s.value}</p>
            <p className="text-xs text-ink-2">{s.label}</p>
          </div>
        ))}
      </div>

      {needSupport && (
        <div className="flex flex-col gap-3 rounded-3xl border-2 border-primary/25 bg-primary-soft/50 p-5 sm:flex-row sm:items-center">
          <HeartHandshake className="size-6 shrink-0 text-primary" />
          <p className="flex-1 text-sm leading-relaxed text-ink-2">
            <span className="font-medium text-ink">Academic pressure looks high right now.</span> It can help to talk to a teacher about priorities or deadlines,
            to a parent or guardian about how you&apos;re finding it, or to your counselor.
          </p>
          <Button asChild size="sm">
            <Link href="/student/match">
              Talk to a counselor <ArrowRight />
            </Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <SectionCard
            title="Tasks and deadlines"
            description="Sorted by priority: the closest and most important first."
            action={
              <Button size="sm" onClick={() => setForm("new")}>
                <Plus /> Add task
              </Button>
            }
          >
            {form && (
              <div className="mb-5 rounded-2xl bg-surface-2/60 p-4">
                <TaskForm key={form === "new" ? "new" : form.id} today={today} editing={form === "new" ? null : form} onDone={() => setForm(null)} />
              </div>
            )}
            {sorted.length ? (
              <ul className="space-y-2.5">
                {sorted.map((t) => (
                  <TaskCard key={t.id + t.progress + t.steps.map((s) => +s.done).join("")} t={t} today={today} onEdit={() => setForm(t)} />
                ))}
              </ul>
            ) : (
              <EmptyState compact illustration="studying" title="No open tasks" description="Add assignments, exams and presentations to see them organised by priority." />
            )}
            {doneTasks.length > 0 && (
              <div className="mt-4">
                <button onClick={() => setShowDone((v) => !v)} className="text-sm font-medium text-primary hover:underline">
                  {showDone ? "Hide" : "Show"} completed ({doneTasks.length})
                </button>
                {showDone && (
                  <ul className="mt-3 space-y-2.5">
                    {doneTasks.map((t) => (
                      <TaskCard key={t.id + "done"} t={t} today={today} onEdit={() => setForm(t)} />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Your plan for the next 7 days"
            description="Built from your tasks, deadlines and the time you have. Adjust it to fit your week."
          >
            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-ink-2">
                Study time per day: <span className="font-semibold text-ink">{hoursPerDay}h</span>
                <input type="range" min={1} max={6} step={0.5} value={hoursPerDay} onChange={(e) => setHoursPerDay(Number(e.target.value))} className="mt-2 w-full accent-[var(--sun)]" />
              </label>
              <label className="text-sm text-ink-2">
                Rest day
                <Select value={restDay} onChange={(e) => setRestDay(Number(e.target.value))} className="mt-1.5 h-10">
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            {plan.unplanned > 0 && (
              <p className="mb-4 flex gap-2 rounded-2xl bg-warn-soft p-3 text-sm text-warn">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                About {plan.unplanned} hours of work due this week doesn&apos;t fit into your available time. Consider asking a teacher which parts matter most, or whether a deadline can move.
              </p>
            )}
            <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {plan.days.map((d) => (
                <li key={d.key} className={cn("rounded-2xl border p-3", d.key === today ? "border-sun bg-sun-soft/40" : "border-line")}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">{d.key === today ? "Today" : shortDay(d.key)}</p>
                  {d.rest ? (
                    <p className="mt-1 text-sm text-ink-2">Rest day 🌿</p>
                  ) : d.blocks.length ? (
                    <ul className="mt-1.5 space-y-1">
                      {d.blocks.map((b) => (
                        <li key={b.task.id} className="flex justify-between gap-2 text-sm">
                          <span className="truncate text-ink">{b.task.title}</span>
                          <span className="shrink-0 tabular-nums text-ink-3">{b.hours}h</span>
                        </li>
                      ))}
                      <li className="text-[11px] text-ink-3">Work in blocks of 25 to 45 minutes with short breaks.</li>
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-ink-3">Nothing planned</p>
                  )}
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>

        <aside className="space-y-6">
          <StudyTimer tasks={tasks} minutesThisWeek={minutesThisWeek} />
          <CheckIn week={week} latest={latestCheckin} />
          <WeeklyReview key={weekly?.id ?? week} week={week} review={weekly} />
          <p className="px-1 text-xs leading-relaxed text-ink-3">
            <Sparkles className="mr-1 inline size-3.5 align-[-2px]" />
            Tip: open the <Link href="/student/toolkit/exams" className="text-primary hover:underline">Exam stress kit</Link> for calming routines before tests.
          </p>
        </aside>
      </div>
    </div>
  );
}
