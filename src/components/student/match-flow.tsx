"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BadgeCheck, Briefcase, CalendarDays, Check, GraduationCap, HeartHandshake, Loader2, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { findCounselor, type MatchResult } from "@/actions/matching";
import { CONCERNS, type ConcernId } from "@/lib/matching";
import { EXPERTISE, expertiseLabel, type ExpertiseArea } from "@/lib/expertise";
import { PRESENCE } from "@/lib/constants";
import { cn, firstName } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { SafetyNote } from "@/components/shared/safety-note";
import { PresenceDot } from "@/components/shared/counselor-card";

const STEPS = ["Understanding what you shared", "Checking verified counselors", "Looking at expertise and availability"];
const MIN_THINKING_MS = 1600;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Thinking() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 520);
    return () => clearInterval(t);
  }, []);
  return (
    <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center px-6 py-16 text-center">
      <div className="relative size-24">
        <span className="absolute inset-0 animate-spin-slow rounded-full bg-[conic-gradient(from_0deg,var(--primary),var(--lilac),var(--rose),var(--primary))] opacity-80 blur-[1px]" />
        <span className="absolute inset-2 flex items-center justify-center rounded-full bg-surface">
          <Sparkles className="size-8 text-primary" />
        </span>
      </div>
      <p className="mt-6 font-display text-2xl text-ink">Finding the right counselor for you</p>
      <ul className="mt-5 space-y-2 text-left text-sm">
        {STEPS.map((s, i) => (
          <li key={s} className={cn("flex items-center gap-2 transition", i <= step ? "text-ink" : "text-ink-3")}>
            {i < step ? <Check className="size-4 text-ok" /> : i === step ? <Loader2 className="size-4 animate-spin text-primary" /> : <span className="size-4" />}
            {s}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function Result({ result, onRestart, note }: { result: MatchResult; onRestart: () => void; note: string }) {
  const router = useRouter();
  const c = result.counselor;
  const name = firstName(c.full_name);
  const reasons = [
    ...result.matched.slice(0, 3).map((t) => `Specialises in ${expertiseLabel(t).toLowerCase()}`),
    c.experience_years != null && c.experience_years > 0 ? `${c.experience_years} years of experience` : null,
    c.presence === "available" ? "Available right now" : null,
    result.keptCurrent ? "Already your counselor, and a good fit for this" : null,
    "Verified by your school",
  ].filter(Boolean) as string[];

  const write = () => {
    const concern = CONCERNS.find((x) => x.category === result.category) ?? CONCERNS[0];
    try {
      // Keep a draft the student brought from a toolkit tool unless they wrote something new here.
      const existing = JSON.parse(sessionStorage.getItem("btm:draft") ?? "null") as { subject?: string; body?: string } | null;
      const keep = !note.trim() && existing?.body;
      sessionStorage.setItem(
        "btm:draft",
        JSON.stringify({
          subject: keep ? existing?.subject ?? "" : concern.label.replace(/^I'm /, "").replace(/^I /, ""),
          body: keep ? existing?.body : note,
          category: result.category,
        }),
      );
    } catch {}
    router.push(`/student/messages/new?category=${result.category}${result.urgent ? "&urgency=urgent" : ""}`);
  };

  return (
    <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-5 sm:p-8">
      <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-soft-ink">
        <Sparkles className="size-3.5" /> {result.keptCurrent ? "Your counselor is a great fit" : "We found your match"}
      </p>
      {(result.risk === "self_harm" || result.risk === "safety") && <SafetyNote className="mt-4" />}
      <div className="mt-5 flex flex-col gap-5 rounded-3xl border border-line bg-gradient-to-br from-primary-soft/60 via-surface to-lilac-soft/50 p-5 sm:flex-row sm:items-start">
        <Avatar name={c.full_name} hue={c.avatar_hue} size="xl" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-display text-2xl text-ink">
            {c.full_name}
            <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2 py-0.5 font-sans text-xs font-semibold text-ok">
              <BadgeCheck className="size-3.5" /> Verified
            </span>
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-2">
            <PresenceDot presence={c.presence} className="scale-75" /> {c.title ?? "Counselor"} · {PRESENCE[c.presence].label}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-2">
            {c.qualifications && (
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap className="size-4 text-ink-3" /> {c.qualifications}
              </span>
            )}
            {c.experience_years != null && (
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="size-4 text-ink-3" /> {c.experience_years} {c.experience_years === 1 ? "year" : "years"} of experience
              </span>
            )}
          </div>
          {c.expertise.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.expertise.map((e) => (
                <span
                  key={e}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    result.matched.includes(e) ? EXPERTISE[e as ExpertiseArea]?.tone : "bg-surface-2 text-ink-3",
                  )}
                >
                  {result.matched.includes(e) && <Check className="mr-1 inline size-3" />}
                  {expertiseLabel(e)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-line bg-surface p-5">
        <p className="text-sm font-semibold text-ink">Why {name}?</p>
        <ul className="mt-3 space-y-2 text-sm text-ink-2">
          {reasons.map((r) => (
            <li key={r} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {r}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button size="lg" onClick={write}>
          Write to {name} <ArrowRight />
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/student/appointments#book">
            <CalendarDays /> Book a session
          </Link>
        </Button>
        <Button size="lg" variant="ghost" onClick={onRestart}>
          <RotateCcw /> Start again
        </Button>
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-3">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        Matching happens on our own server and looks only at the kind of support you need. Nothing you typed here is saved or shared:
        it&apos;s only copied into your message so you don&apos;t have to write it twice. You can still write anonymously.
      </p>
    </motion.div>
  );
}

export function MatchFlow({ hasCounselor }: { hasCounselor: boolean }) {
  const [concern, setConcern] = useState<ConcernId | null>(null);
  const [details, setDetails] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [pending, start] = useTransition();
  const current = CONCERNS.find((c) => c.id === concern);

  const submit = () =>
    start(async () => {
      if (!concern) return;
      setError(null);
      const [r] = await Promise.all([findCounselor({ concern, details, note }), wait(MIN_THINKING_MS)]);
      if (r.ok) setResult(r.data!);
      else setError(r.error);
    });

  const restart = () => {
    setResult(null);
    setConcern(null);
    setDetails([]);
  };

  return (
    <div className="overflow-hidden rounded-[2rem] border border-line bg-surface shadow-md">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#3b2550] via-primary to-[#8f5fae] px-6 py-6 text-white sm:px-8">
        <div aria-hidden className="arch absolute -bottom-16 right-8 h-40 w-32 bg-white/10" />
        <div aria-hidden className="arch absolute -bottom-20 right-28 h-32 w-24 bg-white/5" />
        <h1 className="relative font-display text-[1.7rem] leading-tight sm:text-[2rem]">How are you feeling today?</h1>
        <p className="relative mt-1 text-sm text-white/80">You don&apos;t have to understand everything you&apos;re feeling. You can start here.</p>
      </div>

      <AnimatePresence mode="wait">
        {pending ? (
          <Thinking />
        ) : result ? (
          <Result result={result} onRestart={restart} note={note} />
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-5 sm:p-8">
            <fieldset>
              <legend className="text-[15px] font-semibold text-ink">What&apos;s going on with you?</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {CONCERNS.map((c) => (
                  <label
                    key={c.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-[15px] transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--ring)]",
                      concern === c.id ? "border-primary bg-primary-soft/60 text-ink shadow-sm" : "border-line hover:border-line-strong",
                    )}
                  >
                    <input
                      type="radio"
                      name="concern"
                      value={c.id}
                      checked={concern === c.id}
                      onChange={() => {
                        setConcern(c.id);
                        setDetails([]);
                      }}
                      className="size-4 accent-[var(--primary)]"
                    />
                    <span aria-hidden className="text-lg">
                      {c.emoji}
                    </span>
                    {c.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <AnimatePresence mode="wait">
              {current && (
                <motion.fieldset
                  key={current.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <legend className="sr-only">{current.question}</legend>
                  <div className="mt-6 rounded-3xl bg-surface-2/70 p-4 sm:p-5">
                    {current.intro && (
                      <div className="mb-4">
                        <p className="font-medium text-ink">{current.intro.title}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-ink-2">{current.intro.body}</p>
                      </div>
                    )}
                    <p className="text-sm font-semibold text-ink">
                      {current.question} <span className="font-normal text-ink-3">Choose any that fit.</span>
                    </p>
                    <div className="mt-3 grid gap-2">
                      {current.details.map((d) => {
                        const on = details.includes(d.id);
                        return (
                          <label
                            key={d.id}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-xl border bg-surface px-3.5 py-2.5 text-sm transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--ring)]",
                              on ? "border-primary text-ink" : "border-line text-ink-2 hover:border-line-strong",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => setDetails((x) => (on ? x.filter((y) => y !== d.id) : [...x, d.id]))}
                              className="size-4 accent-[var(--primary)]"
                            />
                            {d.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </motion.fieldset>
              )}
            </AnimatePresence>

            <label className="mt-6 block">
              <span className="text-[15px] font-semibold text-ink">
                Want to share anything else? <span className="font-normal text-ink-3">(Optional)</span>
              </span>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
                placeholder="Write whatever is on your mind, in English or Roman Urdu…"
                className="mt-2 min-h-24"
              />
            </label>

            {error && (
              <p className="mt-4 rounded-2xl bg-warn-soft p-3 text-sm text-warn" role="alert">
                {error}
              </p>
            )}

            <Button size="lg" className="mt-6 w-full" disabled={!concern} onClick={submit}>
              <HeartHandshake /> {hasCounselor ? "Check who can help with this" : "Find my counselor"}
            </Button>
            <p className="mt-3 text-center text-xs text-ink-3">
              We&apos;ll match you with a verified counselor whose experience fits what you&apos;re going through.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
