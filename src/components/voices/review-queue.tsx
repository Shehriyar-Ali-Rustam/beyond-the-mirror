"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, ShieldCheck, Trash2, VenetianMask, X } from "lucide-react";
import { deleteVoiceNote, reviewVoiceNote } from "@/actions/voices";
import type { QueueVoiceNote } from "@/lib/voices";
import { VOICE_LANGUAGES, voiceCategory } from "@/lib/voice-meta";
import type { Role } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { VoicePlayer } from "./voice-player";

const CHECKS = [
  "It's kind and supportive, and doesn't shame or pressure anyone.",
  "No names, places or details that could identify the speaker or anyone else.",
  "No medical advice, diagnoses or anything about self-harm methods.",
  "If the speaker sounds distressed themselves, follow up with them privately.",
];

function QueueItem({ note }: { note: QueueVoiceNote }) {
  const [heard, setHeard] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, start] = useTransition();
  const c = voiceCategory(note.category);

  const decide = (approve: boolean) =>
    start(async () => {
      const r = await reviewVoiceNote({ id: note.id, approve, note: reason });
      if (r.ok) toast.success(approve ? "Approved: it's now live for students" : "Declined. The student has been told.");
      else toast.error(r.error);
    });

  return (
    <li className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.tone}`}>
          {c.emoji} {c.title}
        </span>
        <Badge tone="outline">{VOICE_LANGUAGES.find((l) => l.id === note.language)?.native}</Badge>
        {note.is_anonymous && (
          <Badge tone="lilac">
            <VenetianMask /> Name hidden from students
          </Badge>
        )}
      </div>
      <h3 className="mt-3 font-display text-lg text-ink" dir="auto">
        {note.title}
      </h3>
      <p className="text-[13px] text-ink-3">
        Recorded by <span className="font-medium text-ink-2">{note.author_name}</span> (@{note.author_username})
        {!note.is_anonymous && note.speaker_name && <> · shown as “{note.speaker_name}”</>} · {relativeTime(note.created_at)}
      </p>
      <VoicePlayer id={`q-${note.id}`} src={note.url} duration={note.duration_seconds} color={c.deep} onFirstPlay={() => setHeard(true)} className="mt-4" />
      <Input
        className="mt-4 h-10 text-sm"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={300}
        placeholder="Optional note to the student (shown if you decline)"
        aria-label="Note to the student"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => decide(true)} disabled={busy || !heard} title={heard ? undefined : "Listen first"}>
          <Check /> Approve
        </Button>
        <Button size="sm" variant="secondary" onClick={() => decide(false)} disabled={busy}>
          <X /> Decline
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-danger hover:text-danger"
          disabled={busy}
          onClick={() => {
            if (!confirm("Delete this recording permanently?")) return;
            start(async () => {
              const r = await deleteVoiceNote(note.id);
              if (r.ok) toast.success("Deleted");
              else toast.error(r.error);
            });
          }}
        >
          <Trash2 /> Delete
        </Button>
      </div>
      {!heard && <p className="mt-2 text-xs text-ink-3">Play the voice note to enable approval.</p>}
    </li>
  );
}

export function ReviewQueue({ queue, role }: { queue: QueueVoiceNote[]; role: Role }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        {queue.length ? (
          <ul className="space-y-4">
            {queue.map((n) => (
              <QueueItem key={n.id} note={n} />
            ))}
          </ul>
        ) : (
          <div className="rounded-3xl border border-line bg-surface">
            <EmptyState illustration="listening" title="All caught up" description="New voice notes will appear here. You'll get a notification when one arrives." />
          </div>
        )}
      </div>
      <aside className="h-fit rounded-3xl border border-line bg-surface p-5 shadow-sm lg:sticky lg:top-24">
        <p className="flex items-center gap-2 font-medium text-ink">
          <ShieldCheck className="size-4 text-primary" /> Review checklist
        </p>
        <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink-2">
          {CHECKS.map((c) => (
            <li key={c} className="flex gap-2">
              <Check className="mt-1 size-3.5 shrink-0 text-ok" /> {c}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-ink-3">
          {role === "admin" ? "Admins and counselors" : "Counselors and admins"} can see who recorded each note. Students only see the name the
          speaker chose, or nothing at all.
        </p>
      </aside>
    </div>
  );
}
