import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  ClipboardList,
  Eye,
  Flag,
  GraduationCap,
  HeartHandshake,
  Heart,
  Inbox,
  LifeBuoy,
  Lock,
  MessagesSquare,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  VenetianMask,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion } from "@/components/ui/accordion";
import { HeroMirror } from "@/components/marketing/hero-mirror";
import { ArchPhoto, Photo } from "@/components/visual/arch-photo";
import { Illustration } from "@/components/visual/illustration";
import { FloatingShapes } from "@/components/illustrations/scenes";
import { Reveal } from "@/components/marketing/reveal";
import { CATEGORIES } from "@/lib/constants";
import { STUDENT_FAQ } from "@/lib/content";
import { TOOLS } from "@/lib/toolkit";
import { cn } from "@/lib/utils";

const FAQ = [
  ...STUDENT_FAQ.slice(0, 4),
  {
    q: "How do counselors get access?",
    a: "Counselors create an account and the school administrator approves it. Until then, they can't see any student information.",
  },
  {
    q: "What can school administrators see?",
    a: "Admins manage accounts and assignments and see aggregate numbers: how many requests were opened, typical response times, which topics come up most. They can't open conversations, read messages, or see counselors' private notes.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* ------------------------------------------------------------ Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[700px] bg-[radial-gradient(45%_45%_at_80%_25%,var(--lilac-soft),transparent_70%),radial-gradient(35%_40%_at_60%_70%,var(--sun-soft),transparent_70%),radial-gradient(30%_35%_at_95%_75%,var(--sky-soft),transparent_70%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:pb-28">
          <div>
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3.5 py-1.5 text-[13px] text-ink-2 backdrop-blur">
                <span className="size-1.5 rounded-full bg-ok" /> Student support, for the whole school
              </p>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="mt-6 font-display text-[2.9rem] leading-[1.02] text-ink sm:text-6xl lg:text-[4.6rem]">
                Say what the mirror <em className="text-primary">doesn&apos;t</em> show.
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
                A private, secure space where students reach their school counselor to ask, to vent, to book time, or
                just to be heard. And a calm, organised inbox that helps counselors actually keep up.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/register">
                    <GraduationCap /> I&apos;m a student
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                  <Link href="/register?role=counselor">
                    <HeartHandshake /> I&apos;m a counselor
                  </Link>
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <ul className="mt-10 grid max-w-xl gap-4 text-sm text-ink-2 sm:grid-cols-3">
                {[
                  { icon: Lock, text: "Only your counselor reads your messages" },
                  { icon: Eye, text: "See when it's read and what's next" },
                  { icon: Sparkles, text: "Free self-help tools, no login" },
                ].map((i) => (
                  <li key={i.text} className="flex items-start gap-2.5">
                    <i.icon className="mt-0.5 size-4 shrink-0 text-primary" />
                    {i.text}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <Reveal delay={0.1} y={24}>
            <div className="relative">
              <FloatingShapes className="absolute -inset-10 h-[calc(100%+5rem)] w-[calc(100%+5rem)]" />
              <HeroMirror />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------ The gap */}
      <section className="relative overflow-hidden border-y border-line bg-gradient-to-br from-sun-soft/70 via-surface to-coral-soft/50">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <Reveal>
              <p className="max-w-3xl font-display text-[1.9rem] leading-snug text-ink sm:text-[2.5rem] sm:leading-[1.2]">
                Lots of students who are struggling never ask for help. Not because they don&apos;t want it, but because the
                first step feels too big. <span className="text-coral">We made that first step smaller.</span>
              </p>
            </Reveal>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {[
                { n: "01", title: "Write, don't walk in", body: "Typing it out is easier than knocking on a door. Students reach out when it's on their mind, not only when they're brave enough.", tone: "bg-coral-soft text-coral" },
                { n: "02", title: "Never left on read", body: "Every request has a clear status. Students see when it's been read; counselors see what's waiting and what's urgent.", tone: "bg-sky-soft text-sky" },
                { n: "03", title: "Support between sessions", body: "Practical tools for overthinking, exam stress and hard conversations, so help doesn't stop when the office closes.", tone: "bg-mint-soft text-[#1f8a6b]" },
              ].map((p, i) => (
                <Reveal key={p.n} delay={i * 0.08}>
                  <span className={`inline-flex size-9 items-center justify-center rounded-xl font-display text-sm font-semibold ${p.tone}`}>{p.n}</span>
                  <h3 className="mt-3 text-lg font-semibold text-ink">{p.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{p.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal delay={0.1} className="relative mx-auto h-[440px] w-full max-w-[420px]">
            <ArchPhoto name="sunrisePerson" tone="sun" sizes="300px" className="absolute left-0 top-0 h-[380px] w-[260px]" />
            <ArchPhoto name="writing" tone="sky" sizes="200px" className="absolute bottom-0 right-0 h-[230px] w-[170px] rotate-3" />
            <div className="absolute bottom-16 left-6 flex items-center gap-2 rounded-2xl border border-line bg-surface/95 px-3.5 py-2.5 text-xs font-medium text-ink shadow-md backdrop-blur">
              <span className="flex size-7 items-center justify-center rounded-lg bg-coral-soft text-coral">
                <Heart className="size-3.5" />
              </span>
              The first step,
              <br />
              made smaller
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------- How it works */}
      <section id="how" className="scroll-mt-16 bg-gradient-to-b from-surface via-sky-soft/40 to-surface">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-medium text-primary">How it works</p>
            <h2 className="mt-2 font-display text-4xl leading-tight text-ink sm:text-5xl">Three steps. No waiting room.</h2>
          </Reveal>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {/* Step 1 */}
            <Reveal className="relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface p-6 pt-7 shadow-sm transition-transform duration-300 hover:-translate-y-1">
              <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-sun to-coral" />
              <div className="flex-1 rounded-2xl bg-surface-2 p-4" aria-hidden>
                <div className="flex flex-wrap gap-1.5">
                  {(["wellbeing", "exams", "friendship", "family", "bullying"] as const).map((c, i) => {
                    const Icon = CATEGORIES[c].icon;
                    return (
                      <span key={c} className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs", i === 1 ? "border-primary bg-primary text-primary-ink" : "border-line-strong bg-surface text-ink-2")}>
                        <Icon className="size-3" /> {CATEGORIES[c].label}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-3 rounded-xl border border-line bg-surface p-3 text-[13px] leading-relaxed text-ink-2">
                  Mocks are in two weeks and I freeze every time I open my notes…
                  <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-ink align-middle" />
                </div>
              </div>
              <p className="mt-6 font-display text-sm text-clay">Step 1</p>
              <h3 className="mt-1 text-lg font-semibold text-ink">Write it how it comes</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">Pick a topic, say how soon you need a reply, and write. No perfect words needed.</p>
            </Reveal>

            {/* Step 2 */}
            <Reveal delay={0.08} className="relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface p-6 pt-7 shadow-sm transition-transform duration-300 hover:-translate-y-1">
              <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-sky to-grape" />
              <div className="flex-1 rounded-2xl bg-surface-2 p-4" aria-hidden>
                <ol className="space-y-3">
                  {[
                    { t: "Sent", d: "Mon 16:42", done: true },
                    { t: "Seen by counselor", d: "Mon 17:05", done: true },
                    { t: "Counselor replied", d: "Mon 17:11", done: true },
                    { t: "Resolved", d: "", done: false },
                  ].map((s, i, arr) => (
                    <li key={s.t} className="relative flex items-center gap-3">
                      {i < arr.length - 1 && <span className={cn("absolute left-[8px] top-5 h-4 w-px", arr[i + 1].done ? "bg-primary" : "bg-line-strong")} />}
                      {s.done ? <CheckCircle2 className="size-[17px] text-primary" /> : <Circle className="size-[17px] text-line-strong" />}
                      <span className={cn("flex-1 text-[13px]", s.done ? "font-medium text-ink" : "text-ink-3")}>{s.t}</span>
                      <span className="text-[11px] text-ink-3">{s.d}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="mt-6 font-display text-sm text-clay">Step 2</p>
              <h3 className="mt-1 text-lg font-semibold text-ink">Your counselor replies</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">You&apos;ll see when it&apos;s been read and get a notification the moment they reply.</p>
            </Reveal>

            {/* Step 3 */}
            <Reveal delay={0.16} className="relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface p-6 pt-7 shadow-sm transition-transform duration-300 hover:-translate-y-1">
              <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-mint to-sky" />
              <div className="flex-1 rounded-2xl bg-surface-2 p-4" aria-hidden>
                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">Tuesday</p>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {["09:30", "10:00", "11:15", "13:00", "14:30", "15:00"].map((t, i) => (
                    <span key={t} className={cn("rounded-lg border px-2 py-1.5 text-center text-xs tabular-nums", i === 1 ? "border-primary bg-primary-soft font-medium text-primary-soft-ink" : "border-line bg-surface text-ink-2")}>
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-xs text-ink">
                  <CalendarDays className="size-3.5 text-primary" /> Booked · Tue 10:00, Counseling room
                </div>
              </div>
              <p className="mt-6 font-display text-sm text-clay">Step 3</p>
              <h3 className="mt-1 text-lg font-semibold text-ink">Keep going, your way</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">Book a session, keep messaging, or use the toolkit in between. Rate how it went.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ Portals */}
      <section id="portals" className="scroll-mt-16 bg-bg-deep/70">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-medium text-primary">One platform, three views</p>
            <h2 className="mt-2 font-display text-4xl leading-tight text-ink sm:text-5xl">Built for everyone in the room.</h2>
          </Reveal>

          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            <Reveal className="rounded-3xl border border-line bg-surface p-7 shadow-sm sm:p-9">
              <div className="flex items-start justify-between gap-4">
                <span className="arch-sm flex h-12 w-11 items-center justify-center bg-primary-soft text-primary-soft-ink">
                  <GraduationCap className="size-5" />
                </span>
                <Illustration name="studying" className="-mt-2 w-36 sm:w-44" />
              </div>
              <h3 className="mt-2 font-display text-3xl text-ink">For students</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">A quiet, private corner of the school that&apos;s yours.</p>
              <ul className="mt-6 space-y-3.5">
                {[
                  { icon: MessagesSquare, t: "Private conversations with your counselor", d: "Every request in one place, with replies in real time." },
                  { icon: Bell, t: "Know where things stand", d: "Sent, seen, in progress, resolved, plus a notification when they reply." },
                  { icon: CalendarDays, t: "Book a session in two taps", d: "In person, online, or by phone, from their open times." },
                  { icon: Sparkles, t: "A toolkit for in between", d: "Name a feeling, untangle a worry, plan revision, find the right words." },
                ].map((f) => (
                  <li key={f.t} className="flex gap-3.5">
                    <f.icon className="mt-0.5 size-5 shrink-0 text-primary" />
                    <span>
                      <span className="block font-medium text-ink">{f.t}</span>
                      <span className="block text-sm leading-relaxed text-ink-2">{f.d}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-8">
                <Link href="/register">
                  Create a student account <ArrowRight />
                </Link>
              </Button>
            </Reveal>

            <Reveal delay={0.08} className="relative overflow-hidden rounded-3xl bg-primary p-7 text-primary-ink shadow-md sm:p-9">
              <div className="paper-grain absolute inset-0 opacity-40" aria-hidden />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <span className="arch-sm flex h-12 w-11 items-center justify-center bg-white/10">
                    <HeartHandshake className="size-5" />
                  </span>
                  <ArchPhoto name="conversation" tone="teal" offset={false} sizes="150px" className="-mt-2 h-36 w-28 sm:h-40 sm:w-32" />
                </div>
                <h3 className="mt-2 font-display text-3xl">For counselors</h3>
                <p className="mt-2 text-[15px] leading-relaxed opacity-75">Less chasing, more counseling.</p>
                <ul className="mt-6 space-y-3.5">
                  {[
                    { icon: Inbox, t: "One inbox, sorted by what matters", d: "Filter by status, topic and urgency. Urgent requests rise to the top." },
                    { icon: Flag, t: "Status on everything", d: "Pending, in progress, resolved, so nothing slips through the cracks." },
                    { icon: NotebookPen, t: "Private case notes", d: "Notes only you can see. Not the student, not admins." },
                    { icon: Zap, t: "Quick replies, availability & insights", d: "Open booking slots, reuse thoughtful replies, track response times and feedback." },
                  ].map((f) => (
                    <li key={f.t} className="flex gap-3.5">
                      <f.icon className="mt-0.5 size-5 shrink-0 opacity-80" />
                      <span>
                        <span className="block font-medium">{f.t}</span>
                        <span className="block text-sm leading-relaxed opacity-70">{f.d}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <Button asChild variant="secondary" className="mt-8 border-transparent">
                  <Link href="/register?role=counselor">
                    Request counselor access <ArrowRight />
                  </Link>
                </Button>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1} className="mt-5 flex flex-col gap-5 rounded-3xl border border-line bg-surface p-7 shadow-sm sm:flex-row sm:items-center sm:p-8">
            <Illustration name="safe" className="w-24 shrink-0 sm:w-28" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-ink">For school administrators</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-ink-2">
                Approve counselor accounts, balance caseloads, and see how the service is used: response times, topics,
                session numbers. All in aggregate. Never a single message.
              </p>
            </div>
            <div className="flex gap-6 text-sm text-ink-2">
              <span className="flex items-center gap-2"><ClipboardList className="size-4 text-clay" /> Assignments</span>
              <span className="flex items-center gap-2"><BarChart3 className="size-4 text-clay" /> Insights</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------ Toolkit */}
      <section id="toolkit" className="scroll-mt-16 bg-gradient-to-b from-surface via-grape-soft/40 to-surface">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <Reveal className="max-w-2xl">
              <p className="text-sm font-medium text-primary">The toolkit</p>
              <h2 className="mt-2 font-display text-4xl leading-tight text-ink sm:text-5xl">Help for the moments in between.</h2>
              <p className="mt-4 text-[17px] leading-relaxed text-ink-2">Seven short activities anyone can use. No account needed. Nothing you type is stored.</p>
            </Reveal>
            <Reveal>
              <Button asChild variant="secondary">
                <Link href="/toolkit">
                  Open the toolkit <ArrowRight />
                </Link>
              </Button>
            </Reveal>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((t, i) => (
              <Reveal key={t.slug} delay={i * 0.05} className={cn(i === 0 && "lg:col-span-2 lg:row-span-2", i >= 5 && "lg:col-span-2")}>
                <Link
                  href={`/toolkit/${t.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg"
                >
                  <div className={cn("relative w-full overflow-hidden", i === 0 ? "h-56 lg:h-80" : "h-36")}>
                    <Photo name={t.slug} className="h-full w-full" imgClassName="transition-transform duration-700 group-hover:scale-105" sizes={i === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"} />
                    <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
                    <span className={`absolute bottom-3 left-3 inline-flex size-9 items-center justify-center rounded-xl shadow-sm ${t.tone}`}>
                      <t.icon className="size-4" />
                    </span>
                  </div>
                  <div className={cn("flex flex-1 flex-col", i === 0 ? "p-6 lg:p-8" : "p-5")}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className={cn("font-display text-ink", i === 0 ? "text-3xl" : "text-lg")}>{t.title}</h3>
                      <ArrowUpRight className="size-4 shrink-0 text-ink-3 transition group-hover:text-primary" />
                    </div>
                    <p className={cn("mt-1 text-ink-2", i === 0 ? "max-w-sm text-[15px] leading-relaxed" : "text-sm")}>{i === 0 ? t.description : t.tagline}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ Privacy */}
      <section id="community" className="scroll-mt-16 px-5 pb-20 sm:px-8 sm:pb-28">
        <Reveal className="relative mx-auto grid max-w-7xl items-center gap-10 overflow-hidden rounded-[2rem] bg-gradient-to-br from-sun-soft via-rose-soft to-sky-soft p-8 sm:p-12 lg:grid-cols-2">
          <FloatingShapes className="absolute -right-10 -top-10 size-80 opacity-70" />
          <div className="relative">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-surface/80 px-3 py-1 text-xs font-semibold text-coral backdrop-blur">
              <Sparkles className="size-3.5" /> New: Community board
            </p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-ink sm:text-5xl">You&apos;re not the only one.</h2>
            <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-ink-2">
              Ask other students for advice, share a small win or a photo that made your day, and get thoughtful replies,
              including from counselors. Post with your name or anonymously.
            </p>
            <ul className="mt-6 space-y-2.5 text-[15px] text-ink-2">
              {[
                { icon: Heart, text: "Send support with one tap", tone: "bg-rose-soft text-rose" },
                { icon: VenetianMask, text: "Anonymous to other students when you need it", tone: "bg-lilac-soft text-lilac" },
                { icon: ShieldCheck, text: "Moderated by counselors, with easy reporting", tone: "bg-mint-soft text-[#1f8a6b]" },
              ].map((f) => (
                <li key={f.text} className="flex items-center gap-3">
                  <span className={`flex size-8 items-center justify-center rounded-xl ${f.tone}`}>
                    <f.icon className="size-4" />
                  </span>
                  {f.text}
                </li>
              ))}
            </ul>
            <div className="relative mt-8 hidden h-40 sm:block">
              <ArchPhoto name="friendsBench" tone="sun" sizes="120px" className="absolute left-0 top-0 h-40 w-28 -rotate-3" />
              <ArchPhoto name="heartHands" tone="rose" sizes="110px" className="absolute left-36 top-4 h-36 w-24 rotate-3" />
              <ArchPhoto name="situations" tone="sky" sizes="110px" className="absolute left-[17rem] top-0 h-40 w-28 -rotate-2" />
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md space-y-3">
            {[
              { name: "Anonymous", text: "Made my study corner a bit calmer this week. Any other tips?", photo: true, tag: "Asking for advice", tagTone: "bg-sun-soft text-[#8a5a00]", replies: "6 suggestions", rotate: "-rotate-1" },
              { name: "Ms. Hassan", counselor: true, text: "Lay out everything you need the evening before, then do something unrelated for an hour. Your brain needs the break.", tag: "Reply", tagTone: "bg-primary-soft text-primary", replies: "24 support", rotate: "rotate-1 translate-x-6" },
            ].map((c, i) => (
              <div key={i} className={cn("rounded-3xl border border-line bg-surface p-4 shadow-md transition-transform duration-500 hover:rotate-0", c.rotate)}>
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-medium text-ink">
                    {c.counselor ? (
                      <span className="arch-sm flex size-8 items-center justify-center bg-primary-soft text-xs font-semibold text-primary">MH</span>
                    ) : (
                      <span className="arch-sm flex size-8 items-center justify-center bg-lilac-soft text-lilac">
                        <VenetianMask className="size-4" />
                      </span>
                    )}
                    {c.name}
                    {c.counselor && <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">Counselor</span>}
                  </p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.tagTone}`}>{c.tag}</span>
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-ink">{c.text}</p>
                {c.photo && <Photo name="plantsWindow" className="mt-3 h-40 w-full rounded-2xl" sizes="420px" />}
                <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-3">
                  <Heart className="size-3.5 fill-rose text-rose" /> {c.replies}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section id="privacy" className="scroll-mt-16 border-y border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <p className="text-sm font-medium text-primary">Privacy &amp; confidentiality</p>
            <Illustration name="secure-login" className="mb-6 w-44" />
            <h2 className="mt-2 font-display text-4xl leading-tight text-ink sm:text-5xl">Private by design. Honest about the limits.</h2>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-2">
              Access rules live in the database itself, not just the interface, so a student can only ever see their own
              conversations, and a counselor only the ones assigned to them.
            </p>
            <div className="mt-8 space-y-4">
              <div className="flex gap-3.5 rounded-2xl bg-surface-2 p-5">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                <p className="text-[15px] leading-relaxed text-ink-2">
                  <span className="font-semibold text-ink">The one exception.</span> If a counselor believes someone is at
                  serious risk of harm, they may need to involve others to keep them safe. Whenever they can, they&apos;ll talk
                  to the student first.
                </p>
              </div>
              <div className="flex gap-3.5 rounded-2xl bg-danger-soft/60 p-5">
                <LifeBuoy className="mt-0.5 size-5 shrink-0 text-danger" />
                <p className="text-[15px] leading-relaxed text-ink-2">
                  <span className="font-semibold text-ink">Not an emergency service.</span> Messages aren&apos;t monitored
                  24/7. In danger right now? Contact emergency services or a trusted adult.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="overflow-hidden rounded-3xl border border-line">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Who can see what</caption>
                <thead className="bg-surface-2">
                  <tr>
                    <th scope="col" className="px-5 py-4 font-medium text-ink-2">Who can see…</th>
                    {["Student", "Their counselor", "School admin"].map((h) => (
                      <th key={h} scope="col" className="px-3 py-4 text-center font-medium text-ink">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[
                    { what: "Messages in a conversation", v: [true, true, false] },
                    { what: "Request subject & topic", v: [true, true, false] },
                    { what: "Name, username & year", v: [true, true, true] },
                    { what: "Who sent an anonymous message", v: [true, false, false] },
                    { what: "Counselor's private notes", v: [false, true, false] },
                    { what: "Toolkit activities & letters", v: [true, false, false] },
                    { what: "Overall usage numbers", v: [false, "own", true] },
                  ].map((r) => (
                    <tr key={r.what}>
                      <th scope="row" className="px-5 py-4 font-normal text-ink">
                        {r.what}
                      </th>
                      {r.v.map((v, i) => (
                        <td key={i} className="px-3 py-4 text-center">
                          {v === true ? (
                            <span className="inline-flex size-6 items-center justify-center rounded-full bg-ok-soft text-ok">
                              <Check className="size-3.5" aria-label="Yes" />
                            </span>
                          ) : v === false ? (
                            <span className="inline-flex size-6 items-center justify-center rounded-full bg-surface-2 text-ink-3">
                              <X className="size-3.5" aria-label="No" />
                            </span>
                          ) : (
                            <span className="text-xs text-ink-2">Their own</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-ink-3">
              Toolkit activities run in your browser and aren&apos;t sent to our servers. Letters stay on your device.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------- FAQ */}
      <section id="faq" className="scroll-mt-16">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1fr_1.6fr]">
          <Reveal>
            <p className="text-sm font-medium text-primary">Questions</p>
            <h2 className="mt-2 font-display text-4xl leading-tight text-ink sm:text-5xl">Good to know.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <Accordion items={FAQ} />
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------- CTA */}
      <section className="px-5 pb-20 sm:px-8 sm:pb-28">
        <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-ink px-6 py-16 text-center text-white sm:px-12 sm:py-24">
          <Photo name="friendsLaughing" className="absolute inset-0" sizes="100vw" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#102e2a]/95 via-[#1d5b51]/80 to-[#1d5b51]/40" />
          <div aria-hidden className="arch absolute -bottom-24 left-1/2 h-72 w-56 -translate-x-1/2 border border-white/10 bg-white/[0.03]">
            <div className="glass-sheen arch absolute inset-0 opacity-30" />
          </div>
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-4xl leading-tight sm:text-5xl">The reflection isn&apos;t the whole story.</h2>
            <p className="mx-auto mt-4 max-w-lg text-[17px] leading-relaxed text-white/85">Whatever&apos;s behind it, there&apos;s someone here whose job is to listen.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-bg text-ink hover:bg-surface-2">
                <Link href="/register">Get started, it&apos;s free</Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="text-white hover:bg-white/15 hover:text-white">
                <Link href="/toolkit">Try the toolkit first</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
