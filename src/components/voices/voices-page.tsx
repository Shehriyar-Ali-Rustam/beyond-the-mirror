"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Clock3, Headphones, Mic, Shuffle, Trash2, X } from "lucide-react";
import { countVoicePlay, deleteVoiceNote, randomVoiceNote } from "@/actions/voices";
import type { MyVoiceNote, QueueVoiceNote, VoiceNote } from "@/lib/voices";
import { VOICE_CATEGORIES, VOICE_LANGUAGES, voiceCategory, type VoiceCategory, type VoiceLanguage } from "@/lib/voice-meta";
import type { Role } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHero } from "@/components/visual/page-hero";
import { Tabs } from "@/components/toolkit/shared";
import { VoicePlayer } from "./voice-player";
import { Recorder } from "./recorder";
import { ReviewQueue } from "./review-queue";

type Tab = "listen" | "record" | "mine" | "review";

function CategoryPill({ id }: { id: string }) {
  const c = voiceCategory(id);
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", c.tone)}>
      <span aria-hidden>{c.emoji}</span> {c.title}
    </span>
  );
}

function LanguagePill({ id }: { id: string }) {
  return <Badge tone="outline">{VOICE_LANGUAGES.find((l) => l.id === id)?.native ?? id}</Badge>;
}

function VoiceCard({ note, highlight, autoPlay, onClose }: { note: VoiceNote; highlight?: boolean; autoPlay?: boolean; onClose?: () => void }) {
  const c = voiceCategory(note.category);
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-3xl border bg-surface p-5 shadow-sm transition hover:shadow-md",
        highlight ? "border-transparent shadow-lg" : "border-line",
      )}
      style={highlight ? { boxShadow: `0 0 0 2px ${c.color}, var(--shadow-lg)` } : undefined}
    >
      <div aria-hidden className="absolute -right-10 -top-10 size-32 rounded-full opacity-20 blur-2xl" style={{ background: c.color }} />
      {onClose && (
        <button onClick={onClose} className="absolute right-3 top-3 rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Close">
          <X className="size-4" />
        </button>
      )}
      <div className="relative flex flex-wrap items-center gap-1.5">
        <CategoryPill id={note.category} />
        <LanguagePill id={note.language} />
        {note.is_mine && <Badge tone="primary">Yours</Badge>}
      </div>
      <h3 className="relative mt-3 font-display text-lg leading-snug text-ink" dir="auto">
        {note.title}
      </h3>
      <p className="relative mt-0.5 text-[13px] text-ink-3">
        {note.speaker ? `${note.speaker} from your school` : "Someone from your school"} · {relativeTime(note.created_at)}
      </p>
      <VoicePlayer
        id={note.id}
        src={note.url}
        duration={note.duration_seconds}
        color={c.deep}
        autoPlay={autoPlay}
        onFirstPlay={() => void countVoicePlay(note.id)}
        className="relative mt-4"
      />
      <p className="relative mt-2 flex items-center gap-1 text-[11px] text-ink-3">
        <Headphones className="size-3" /> {note.play_count} {note.play_count === 1 ? "listen" : "listens"}
      </p>
    </article>
  );
}

const STATUS: Record<string, { label: string; tone: "pending" | "resolved" | "danger" }> = {
  pending: { label: "Waiting for review", tone: "pending" },
  approved: { label: "Live", tone: "resolved" },
  rejected: { label: "Not published", tone: "danger" },
};

function MyNotes({ notes }: { notes: MyVoiceNote[] }) {
  const [busy, start] = useTransition();
  if (!notes.length)
    return (
      <EmptyState
        illustration="audio-conversation"
        title="You haven't recorded anything yet"
        description="A 20 second voice note could be exactly what someone needs to hear today."
      />
    );
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {notes.map((n) => {
        const c = voiceCategory(n.category);
        const s = STATUS[n.status];
        return (
          <li key={n.id} className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={s.tone} dot>
                {s.label}
              </Badge>
              <CategoryPill id={n.category} />
              <LanguagePill id={n.language} />
            </div>
            <h3 className="mt-3 font-display text-lg text-ink" dir="auto">
              {n.title}
            </h3>
            <p className="text-[13px] text-ink-3">
              Recorded {relativeTime(n.created_at)}
              {n.status === "approved" && ` · ${n.play_count} ${n.play_count === 1 ? "listen" : "listens"}`}
            </p>
            {n.status === "rejected" && n.review_note && (
              <p className="mt-3 rounded-2xl bg-danger-soft/60 p-3 text-sm text-ink-2">
                <span className="font-medium text-ink">Counselor&apos;s note: </span>
                {n.review_note}
              </p>
            )}
            <VoicePlayer id={`mine-${n.id}`} src={n.url} duration={n.duration_seconds} color={c.deep} className="mt-4" />
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-danger hover:text-danger"
              disabled={busy}
              onClick={() => {
                if (!confirm("Delete this voice note? This can't be undone.")) return;
                start(async () => {
                  const r = await deleteVoiceNote(n.id);
                  if (r.ok) toast.success("Voice note deleted");
                  else toast.error(r.error);
                });
              }}
            >
              <Trash2 /> Delete
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

export function VoicesPage({
  role,
  firstName,
  library,
  mine,
  queue,
}: {
  role: Role;
  firstName: string;
  library: VoiceNote[];
  mine: MyVoiceNote[];
  queue: QueueVoiceNote[] | null;
}) {
  const params = useSearchParams();
  const requested = params.get("tab") as Tab | null;
  const tab: Tab = requested && ["listen", "record", "mine", "review"].includes(requested) && (requested !== "review" || queue) ? requested : "listen";
  const setTab = useCallback((t: Tab) => window.history.replaceState(null, "", t === "listen" ? "?" : `?tab=${t}`), []);

  const toMine = useCallback(() => setTab("mine"), [setTab]);
  const [category, setCategory] = useState<VoiceCategory | "all">("all");
  const [language, setLanguage] = useState<VoiceLanguage | "all">("all");
  const [surprise, setSurprise] = useState<VoiceNote | null>(null);
  const [shuffling, startShuffle] = useTransition();

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of library) m.set(n.category, (m.get(n.category) ?? 0) + 1);
    return m;
  }, [library]);
  const shown = library.filter((n) => (category === "all" || n.category === category) && (language === "all" || n.language === language));

  const surpriseMe = () =>
    startShuffle(async () => {
      const note = await randomVoiceNote(category === "all" ? undefined : category);
      if (!note) {
        toast("No voice notes here yet", { description: "Why not record the first one?" });
        return;
      }
      setSurprise(note);
    });

  const tabs: { value: Tab; label: string }[] = [
    { value: "listen", label: "Listen" },
    { value: "record", label: "Record" },
    { value: "mine", label: `My voice notes${mine.length ? ` (${mine.length})` : ""}` },
    ...(queue ? [{ value: "review" as Tab, label: `Review${queue.length ? ` (${queue.length})` : ""}` }] : []),
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHero
        eyebrow="Voice notes from students like you 🎧"
        title="A Voice That Understands"
        description="Short, real voice notes recorded by other students for the moments that feel heavy. Every one is listened to by a counselor before it's shared. In English and Urdu."
        illustration="podcast-listener"
        tone="lavender"
        actions={
          <>
            <Button size="lg" onClick={surpriseMe} loading={shuffling} className="rounded-full">
              {!shuffling && <Shuffle />} Play me something
            </Button>
            <Button size="lg" variant="secondary" className="rounded-full" onClick={() => setTab("record")}>
              <Mic /> Record a voice note
            </Button>
          </>
        }
      />

      <div className="mb-6">
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
      </div>

      <AnimatePresence>
        {surprise && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-6">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-ink-2">
              <Shuffle className="size-4 text-lilac" /> Picked just for you
            </p>
            <VoiceCard key={surprise.id} note={surprise} highlight autoPlay onClose={() => setSurprise(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {tab === "listen" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {VOICE_CATEGORIES.map((c) => {
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(active ? "all" : c.id)}
                  aria-pressed={active}
                  className={cn(
                    "group flex flex-col items-start gap-2 rounded-3xl border bg-surface p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                    active ? "border-transparent" : "border-line",
                  )}
                  style={active ? { boxShadow: `0 0 0 2px ${c.color}`, background: `${c.color}14` } : undefined}
                >
                  <span className={cn("flex size-11 items-center justify-center rounded-2xl text-xl transition group-hover:scale-110", c.tone)}>{c.emoji}</span>
                  <span className="text-sm font-semibold leading-snug text-ink">{c.title}</span>
                  <span className="text-xs text-ink-3" lang="ur" dir="rtl">
                    {c.urdu}
                  </span>
                  <span className="mt-auto text-[11px] font-medium text-ink-3">
                    {counts.get(c.id) ?? 0} {(counts.get(c.id) ?? 0) === 1 ? "voice note" : "voice notes"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-2">
              {category === "all" ? "All voice notes" : voiceCategory(category).title}
              <span className="text-ink-3"> · {shown.length}</span>
            </p>
            <div className="inline-flex rounded-xl bg-surface-2 p-1" role="radiogroup" aria-label="Language">
              {[{ id: "all" as const, native: "All" }, ...VOICE_LANGUAGES].map((l) => (
                <button
                  key={l.id}
                  role="radio"
                  aria-checked={language === l.id}
                  onClick={() => setLanguage(l.id)}
                  className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition", language === l.id ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink")}
                >
                  {l.native}
                </button>
              ))}
            </div>
          </div>

          {shown.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shown.map((n) => (
                <VoiceCard key={n.id} note={n} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-line-strong bg-surface/70">
              <EmptyState
                illustration="recording"
                title={library.length ? "Nothing here yet" : "Be the first voice"}
                description={
                  library.length
                    ? "No voice notes match these filters yet. Try another category or language, or record one yourself."
                    : "No voice notes have been shared yet. Record 20 to 60 seconds of encouragement and a counselor will review it."
                }
                action={
                  <Button onClick={() => setTab("record")} className="rounded-full">
                    <Mic /> Record a voice note
                  </Button>
                }
              />
            </div>
          )}

          <p className="flex items-start gap-2 rounded-2xl bg-surface/80 p-4 text-[13px] leading-relaxed text-ink-3">
            <Clock3 className="mt-0.5 size-4 shrink-0" />
            These are messages of support from other students, not professional advice. If you&apos;re struggling, your counselor is
            here to talk.
          </p>
        </div>
      )}

      {tab === "record" && <Recorder firstName={firstName} onSubmitted={toMine} />}
      {tab === "mine" && <MyNotes notes={mine} />}
      {tab === "review" && queue && <ReviewQueue queue={queue} role={role} />}
    </div>
  );
}
