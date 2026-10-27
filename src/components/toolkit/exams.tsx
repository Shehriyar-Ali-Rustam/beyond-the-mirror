"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Breathing } from "./reset";
import { CopyButton, Tabs, TalkCta } from "./shared";

/* ----------------------------------------------------------- revision plan */
type Subject = { id: number; name: string; date: string; confidence: 1 | 2 | 3 };

const CONF = { 1: "Shaky", 2: "Okay", 3: "Confident" } as const;

/** Parses "YYYY-MM-DD" as a local date (new Date(str) would treat it as UTC). */
function parseLocal(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function buildPlan(subjects: Subject[], hoursPerDay: number, restDay: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const valid = subjects.filter((s) => s.name.trim() && s.date);
  if (!valid.length) return [];
  const last = new Date(Math.max(...valid.map((s) => parseLocal(s.date).getTime())));
  const days: { date: Date; blocks: string[]; rest: boolean; exams: string[] }[] = [];
  const blocksPerDay = Math.max(1, Math.round((hoursPerDay * 60) / 55)); // 45 min + 10 min break

  for (let d = new Date(today); d <= last && days.length < 70; d.setDate(d.getDate() + 1)) {
    const date = new Date(d);
    const exams = valid.filter((s) => parseLocal(s.date).toDateString() === date.toDateString()).map((s) => s.name);
    const rest = date.getDay() === restDay && !exams.length;
    const upcoming = valid.filter((s) => parseLocal(s.date) > date);
    const blocks: string[] = [];
    if (!rest && upcoming.length) {
      // Weight: weaker subjects and closer exams get more blocks.
      const weights = upcoming.map((s) => {
        const daysLeft = Math.max(1, (parseLocal(s.date).getTime() - date.getTime()) / 86_400_000);
        return { s, w: (4 - s.confidence) * (1 + 6 / daysLeft) };
      });
      const total = weights.reduce((a, b) => a + b.w, 0);
      const alloc = weights.map((x) => ({ ...x, n: (x.w / total) * blocksPerDay }));
      const counts = alloc.map((a) => Math.floor(a.n));
      let left = blocksPerDay - counts.reduce((a, b) => a + b, 0);
      alloc
        .map((a, i) => ({ i, r: a.n - Math.floor(a.n) }))
        .sort((a, b) => b.r - a.r)
        .forEach(({ i }) => {
          if (left > 0) {
            counts[i]++;
            left--;
          }
        });
      // Interleave subjects instead of stacking the same one back to back.
      const queue = alloc.flatMap((a, i) => Array(counts[i]).fill(a.s.name) as string[]);
      while (queue.length) {
        const prev = blocks[blocks.length - 1];
        const idx = queue.findIndex((q) => q !== prev);
        blocks.push(queue.splice(idx === -1 ? 0 : idx, 1)[0]);
      }
    }
    days.push({ date, blocks, rest, exams });
  }
  return days;
}

function Planner() {
  const [subjects, setSubjects] = useState<Subject[]>([
    { id: 1, name: "", date: "", confidence: 2 },
    { id: 2, name: "", date: "", confidence: 2 },
  ]);
  const [hours, setHours] = useState(2);
  const [restDay, setRestDay] = useState(5);
  const [show, setShow] = useState(false);
  const plan = useMemo(() => (show ? buildPlan(subjects, hours, restDay) : []), [show, subjects, hours, restDay]);
  const update = (id: number, patch: Partial<Subject>) => {
    setShow(false);
    setSubjects((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };
  const minDate = new Date().toISOString().slice(0, 10);

  const text = plan
    .map((d) => `${d.date.toDateString()}: ${d.exams.length ? `EXAM: ${d.exams.join(", ")}` : d.rest ? "Rest day" : d.blocks.join(" → ") || "Light review"}`)
    .join("\n");

  return (
    <div className="space-y-6 py-6">
      <p className="text-[15px] leading-relaxed text-ink-2">
        A realistic plan beats a perfect one. Add your exams, be honest about how you feel about each subject, and
        we&apos;ll spread your time out, with breaks and a rest day built in.
      </p>
      <div className="space-y-2">
        {subjects.map((s) => (
          <div key={s.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center">
            <Input aria-label="Subject" placeholder="Subject" value={s.name} onChange={(e) => update(s.id, { name: e.target.value })} className="col-span-2 h-10 sm:col-span-1" />
            <Input aria-label="Exam date" type="date" min={minDate} value={s.date} onChange={(e) => update(s.id, { date: e.target.value })} className="h-10" />
            <Select aria-label="Confidence" value={s.confidence} onChange={(e) => update(s.id, { confidence: Number(e.target.value) as 1 | 2 | 3 })} className="h-10">
              {([1, 2, 3] as const).map((c) => (
                <option key={c} value={c}>
                  {CONF[c]}
                </option>
              ))}
            </Select>
            <Button variant="ghost" size="icon" aria-label="Remove subject" onClick={() => setSubjects((x) => x.filter((y) => y.id !== s.id))} disabled={subjects.length === 1}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={() => setSubjects((s) => [...s, { id: Date.now(), name: "", date: "", confidence: 2 }])}>
          <Plus /> Add subject
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-ink-2">
          Hours I can realistically study per day: <span className="font-semibold text-ink">{hours}h</span>
          <input type="range" min={1} max={6} step={0.5} value={hours} onChange={(e) => { setHours(Number(e.target.value)); setShow(false); }} className="mt-2 w-full accent-[var(--primary)]" />
        </label>
        <label className="text-sm text-ink-2">
          My rest day
          <Select value={restDay} onChange={(e) => { setRestDay(Number(e.target.value)); setShow(false); }} className="mt-1.5 h-10">
            {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <Button onClick={() => setShow(true)} disabled={!subjects.some((s) => s.name.trim() && s.date)}>
        <Wand2 /> Build my plan
      </Button>

      {show && plan.length > 0 && (
        <div className="animate-fade-up space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-ink">Your plan · {plan.length} days</p>
            <CopyButton text={text} label="Copy plan" />
          </div>
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {plan.map((d) => (
              <li
                key={d.date.toISOString()}
                className={cn(
                  "rounded-2xl border p-3.5",
                  d.exams.length ? "border-clay/40 bg-clay-soft" : d.rest ? "border-line bg-surface-2" : "border-line bg-surface",
                )}
              >
                <p className="text-xs font-medium text-ink-3">
                  {d.date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
                </p>
                {d.exams.length ? (
                  <p className="mt-1 text-sm font-semibold text-clay">Exam: {d.exams.join(", ")}. You&apos;ve got this!</p>
                ) : d.rest ? (
                  <p className="mt-1 text-sm text-ink-2">Rest day. Genuinely rest, it helps memory.</p>
                ) : (
                  <ul className="mt-1.5 space-y-1">
                    {d.blocks.map((b, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-ink">
                        <span className="size-1.5 rounded-full bg-primary" /> 45 min · {b}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
          <p className="text-xs text-ink-3">Each block is 45 minutes of focus followed by a 10-minute break away from your screen.</p>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- talk to family */
const SCRIPTS = [
  {
    title: "Before results come out",
    text: "Results come out next week and I'm honestly nervous. Whatever happens, can we talk about it calmly together? It would really help to know you're on my side.",
  },
  {
    title: "When the marks are lower than expected",
    text: "I got my results and they're lower than I hoped. I'm disappointed too. I've been thinking about what went wrong and I'd like to make a plan. Can we talk about what support might help?",
  },
  {
    title: "When the pressure feels like too much",
    text: "I know you want the best for me, and I want to do well. But lately the pressure is making it harder to focus, not easier. Could we talk about expectations that feel realistic?",
  },
  {
    title: "Asking for help with studying",
    text: "I'm struggling with a couple of subjects and I don't think I can catch up alone. Could we look into some extra help, or could you help me make a schedule?",
  },
];

function FamilyScripts() {
  return (
    <div className="space-y-4 py-6">
      <p className="text-[15px] leading-relaxed text-ink-2">
        Parents often react to marks out of worry, not anger. Starting the conversation yourself, calmly and at a good
        time, usually goes better than waiting for them to ask.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {SCRIPTS.map((s) => (
          <div key={s.title} className="flex flex-col rounded-2xl border border-line p-4">
            <p className="text-sm font-medium text-ink">{s.title}</p>
            <p className="mt-2 flex-1 text-sm italic leading-relaxed text-ink-2">“{s.text}”</p>
            <CopyButton text={s.text} className="mt-3 self-start" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-surface-2 p-4 text-sm leading-relaxed text-ink-2">
        <p className="font-medium text-ink">Tips that help</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Pick a calm moment, not right before school or during an argument.</li>
          <li>Lead with how you feel, then what you need.</li>
          <li>Bring a plan, even a small one. It shows you&apos;re taking it seriously.</li>
          <li>If it&apos;s hard to say, write it as a message or letter first.</li>
        </ul>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- calm down */
function CalmNow() {
  return (
    <div className="grid gap-6 py-4 lg:grid-cols-2 lg:items-center">
      <Breathing compact />
      <div className="space-y-3 text-[15px] leading-relaxed text-ink-2">
        <p className="font-display text-xl text-ink">Some things worth remembering</p>
        {[
          "One exam measures one day, not who you are or what you'll become.",
          "Feeling nervous means you care. A bit of stress can actually sharpen focus.",
          "You don't need to feel ready to start. Five minutes is enough to begin.",
          "Sleep is part of revision. Memories are stored while you sleep.",
          "There's almost always another route: resits, other courses, other paths.",
        ].map((t) => (
          <p key={t} className="flex gap-3">
            <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-clay" />
            {t}
          </p>
        ))}
      </div>
    </div>
  );
}

export function ExamsTool() {
  const [tab, setTab] = useState<"calm" | "plan" | "family">("calm");
  // Other tools link straight to the planner with #plan.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the hash is only readable after mount
    if (window.location.hash === "#plan") setTab("plan");
  }, []);
  return (
    <div className="space-y-6">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "calm", label: "Calm down now" },
          { value: "plan", label: "Plan my revision" },
          { value: "family", label: "Talking to family" },
        ]}
      />
      <div className="rounded-3xl border border-line bg-surface px-5 sm:px-8">
        {tab === "calm" && <CalmNow />}
        {tab === "plan" && <Planner />}
        {tab === "family" && <FamilyScripts />}
      </div>
      <TalkCta category="exams" title="Results or pressure weighing on you?" body="Your counselor can help with study plans, subject choices, and talking to your family." />
    </div>
  );
}
