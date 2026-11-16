"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, ChevronRight, Pencil, SkipForward, Trash2, X } from "lucide-react";
import { deleteReflection, saveReflection } from "@/actions/wellbeing";
import { dailyQuestion, REFLECTION_CATEGORIES, REFLECTION_QUESTIONS, shortDay, toKey, weekStart } from "@/lib/wellbeing";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "./shell";

export type ReflectionEntry = {
  id: string;
  entry_on: string;
  question_id: string;
  category: keyof typeof REFLECTION_CATEGORIES;
  question: string;
  answer: string | null;
  followups: { q: string; a: string }[];
  skipped: boolean;
};

const WEEKLY = ["What did you learn about yourself this week?", "What felt heavy, and what helped?", "What would you like to carry into next week?"];

function Followups({ entry }: { entry: ReflectionEntry }) {
  const base = dailyQuestionById(entry.question_id)?.followups ?? [];
  const [answers, setAnswers] = useState<string[]>(base.map((q) => entry.followups.find((f) => f.q === q)?.a ?? ""));
  const [pending, start] = useTransition();
  if (!base.length) return null;
  const save = () =>
    start(async () => {
      const r = await saveReflection({
        ...entry,
        followups: base.map((q, i) => ({ q, a: answers[i] ?? "" })).filter((f) => f.a.trim()),
        answer: entry.answer ?? "",
      });
      if (r.ok) toast.success("Saved to your journal");
      else toast.error(r.error);
    });
  return (
    <div className="mt-5 space-y-4 border-t border-line pt-5">
      <p className="text-sm font-medium text-ink">Want to go a little deeper? (Optional)</p>
      {base.map((q, i) => (
        <label key={q} className="block">
          <span className="text-sm text-ink-2">{q}</span>
          <Textarea
            value={answers[i]}
            onChange={(e) => setAnswers((a) => a.map((x, j) => (j === i ? e.target.value : x)))}
            maxLength={2000}
            className="mt-1.5 min-h-20"
          />
        </label>
      ))}
      <Button variant="secondary" size="sm" loading={pending} onClick={save}>
        Save follow-up answers
      </Button>
    </div>
  );
}

const dailyQuestionById = (id: string) => REFLECTION_QUESTIONS.find((q) => q.id === id) ?? null;

function JournalItem({ e }: { e: ReflectionEntry }) {
  const [editing, setEditing] = useState(false);
  const [answer, setAnswer] = useState(e.answer ?? "");
  const [pending, start] = useTransition();
  return (
    <li className="rounded-2xl border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
        <span>
          {shortDay(e.entry_on)} · {REFLECTION_CATEGORIES[e.category]}
        </span>
        <span className="flex gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => setEditing((v) => !v)}>
            {editing ? <X /> : <Pencil />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Delete"
            disabled={pending}
            onClick={() => {
              if (!confirm("Delete this reflection? This can't be undone.")) return;
              start(async () => {
                const r = await deleteReflection(e.id);
                if (!r.ok) toast.error(r.error);
              });
            }}
          >
            <Trash2 />
          </Button>
        </span>
      </div>
      <p className="mt-1.5 font-medium text-ink">{e.question}</p>
      {editing ? (
        <div className="mt-2 space-y-2">
          <Textarea value={answer} onChange={(x) => setAnswer(x.target.value)} maxLength={4000} />
          <Button
            size="sm"
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await saveReflection({ ...e, answer });
                if (r.ok) setEditing(false);
                else toast.error(r.error);
              })
            }
          >
            Save
          </Button>
        </div>
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{e.answer}</p>
      )}
      {e.followups.map((f) => (
        <div key={f.q} className="mt-3 border-l-2 border-line pl-3">
          <p className="text-xs font-medium text-ink-3">{f.q}</p>
          <p className="whitespace-pre-wrap text-sm text-ink-2">{f.a}</p>
        </div>
      ))}
    </li>
  );
}

function WeeklyReflection({ week, today, entry }: { week: string; today: string; entry: ReflectionEntry | undefined }) {
  const [answers, setAnswers] = useState(() => [entry?.answer ?? "", ...WEEKLY.slice(1).map((q) => entry?.followups.find((f) => f.q === q)?.a ?? "")]);
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const r = await saveReflection({
        id: entry?.id,
        entry_on: today,
        question_id: `weekly-${week}`,
        category: "weekly",
        question: "Weekly reflection",
        answer: answers[0],
        followups: WEEKLY.slice(1).map((q, i) => ({ q, a: answers[i + 1] })).filter((f) => f.a.trim()),
        skipped: false,
      });
      if (r.ok) toast.success("Weekly reflection saved");
      else toast.error(r.error);
    });
  return (
    <SectionCard title="Weekly reflection" description={`Week of ${shortDay(week)}`}>
      <div className="space-y-4">
        {WEEKLY.map((q, i) => (
          <label key={q} className="block">
            <span className="text-sm text-ink-2">{q}</span>
            <Textarea value={answers[i]} onChange={(e) => setAnswers((w) => w.map((x, j) => (j === i ? e.target.value : x)))} maxLength={2000} className="mt-1.5 min-h-20" />
          </label>
        ))}
        <Button variant="secondary" onClick={save} loading={pending} disabled={!answers[0].trim()} className="w-full">
          Save weekly reflection
        </Button>
      </div>
    </SectionCard>
  );
}

export function Reflections({ entries, seed }: { entries: ReflectionEntry[]; seed: string }) {
  const [today, setToday] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- "today" depends on the device's own date
    setToday(toKey(new Date()));
  }, []);

  const todays = entries.filter((e) => e.entry_on === today && e.category !== "weekly");
  const answered = todays.find((e) => !e.skipped);
  const skips = todays.filter((e) => e.skipped).length;
  const card = today ? dailyQuestion(today, seed, skips) : null;
  const week = today ? toKey(weekStart(new Date())) : null;
  const weeklyEntry = entries.find((e) => e.question_id === `weekly-${week}`);
  const journal = useMemo(
    () => entries.filter((e) => !e.skipped && (filter === "all" || e.category === filter)),
    [entries, filter],
  );

  const submit = (skipped: boolean) =>
    start(async () => {
      if (!card || !today) return;
      const r = await saveReflection({ entry_on: today, question_id: card.id, category: card.category, question: card.q, answer: skipped ? "" : answer, followups: [], skipped });
      if (r.ok) {
        setAnswer("");
        if (!skipped) toast.success("Saved to your private journal");
      } else toast.error(r.error);
    });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-lilac-soft via-surface to-rose-soft p-6 shadow-sm ring-1 ring-line sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-lilac">Today&apos;s reflection card</p>
          {!card ? (
            <div className="mt-4 h-28 animate-pulse rounded-2xl bg-surface/60" />
          ) : answered ? (
            <div className="mt-3">
              <p className="text-sm text-ink-3">{REFLECTION_CATEGORIES[answered.category]}</p>
              <h2 className="mt-1 font-display text-2xl leading-snug text-ink sm:text-[1.7rem]">{answered.question}</h2>
              <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-surface/80 p-4 text-[15px] leading-relaxed text-ink-2">{answered.answer}</p>
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-ok">
                <Check className="size-4" /> Done for today. A new card arrives tomorrow.
              </p>
              <Followups key={answered.id} entry={answered} />
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-ink-3">{REFLECTION_CATEGORIES[card.category]}</p>
              <h2 className="mt-1 font-display text-2xl leading-snug text-ink sm:text-[1.8rem]">{card.q}</h2>
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                maxLength={4000}
                placeholder="Write as much or as little as you like. Only you can see this."
                className="mt-4 min-h-36 bg-surface/90"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => submit(false)} loading={pending} disabled={!answer.trim()}>
                  Save reflection
                </Button>
                <Button variant="ghost" onClick={() => submit(true)} disabled={pending}>
                  <SkipForward /> Skip this question
                </Button>
              </div>
              {skips > 0 && <p className="mt-2 text-xs text-ink-3">You can skip any question you&apos;re not comfortable with.</p>}
            </div>
          )}
        </section>

        <SectionCard
          title="Your journal"
          description="Every card you've answered, kept privately."
          action={
            <div className="flex flex-wrap gap-1.5">
              {["all", "weekly", "emotional", "self", "relationships", "academic", "growth", "challenges", "gratitude"].map((c) => (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  aria-pressed={filter === c}
                  className={`rounded-full px-2.5 py-1 text-xs transition ${filter === c ? "bg-ink text-white" : "bg-surface-2 text-ink-2 hover:text-ink"}`}
                >
                  {c === "all" ? "All" : REFLECTION_CATEGORIES[c as keyof typeof REFLECTION_CATEGORIES].split(" ")[0]}
                </button>
              ))}
            </div>
          }
        >
          {journal.length ? (
            <ul className="space-y-3">
              {journal.map((e) => (
                <JournalItem key={e.id + (e.answer ?? "")} e={e} />
              ))}
            </ul>
          ) : (
            <EmptyState compact illustration="letter" title="Nothing here yet" description="Your answers will collect here, so you can look back and notice how you've changed." />
          )}
        </SectionCard>
      </div>

      <aside className="space-y-6">
        {week && today && <WeeklyReflection key={week + (weeklyEntry?.id ?? "")} week={week} today={today} entry={weeklyEntry} />}
        <div className="rounded-3xl border border-line bg-surface p-5 text-sm leading-relaxed text-ink-2 shadow-sm">
          <p className="font-medium text-ink">How to use these cards</p>
          <ul className="mt-2 space-y-1.5">
            <li className="flex gap-2"><ChevronRight className="mt-0.5 size-4 shrink-0 text-lilac" /> There are no right answers. Honest is more useful than polished.</li>
            <li className="flex gap-2"><ChevronRight className="mt-0.5 size-4 shrink-0 text-lilac" /> A few sentences is enough. Consistency matters more than length.</li>
            <li className="flex gap-2"><ChevronRight className="mt-0.5 size-4 shrink-0 text-lilac" /> If something you write worries you, your counselor is there to talk.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
