"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Lock, Trash2 } from "lucide-react";
import { addNote, deleteNote } from "@/actions/notes";
import { Button } from "@/components/ui/button";
import { messageTime } from "@/lib/time";
import type { CaseNote } from "@/lib/types";

export function NotesPanel({ studentId, initialNotes, tz }: { studentId: string; initialNotes: CaseNote[]; tz: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const res = await addNote({ studentId, body });
      if (!res.ok) return void toast.error(res.error);
      setNotes((n) => [res.data!, ...n]);
      setBody("");
    });

  const remove = (id: string) =>
    start(async () => {
      const prev = notes;
      setNotes((n) => n.filter((x) => x.id !== id));
      const res = await deleteNote(id);
      if (!res.ok) {
        setNotes(prev);
        toast.error(res.error);
      }
    });

  return (
    <section>
      <p className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-ink-3">Private notes</p>
      <p className="mb-3 flex items-center gap-1 text-[11px] text-ink-3">
        <Lock className="size-3" /> Only you can see these. Not the student, not admins.
      </p>
      <div className="rounded-2xl border border-line-strong bg-surface focus-within:border-primary focus-within:ring-4 focus-within:ring-[var(--ring)]">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="e.g. Follow up after mocks; mentioned trouble sleeping"
          aria-label="New private note"
          className="w-full resize-none rounded-2xl bg-transparent px-3 py-2.5 text-sm text-ink placeholder:text-ink-3 focus:outline-none"
        />
        <div className="flex justify-end px-2 pb-2">
          <Button size="sm" onClick={save} disabled={!body.trim()} loading={pending}>
            Save note
          </Button>
        </div>
      </div>
      {notes.length > 0 && (
        <ul className="mt-3 space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="group rounded-xl bg-warn-soft/50 px-3 py-2.5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{n.body}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[11px] text-ink-3">{messageTime(n.created_at, tz)}</span>
                <button onClick={() => remove(n.id)} className="rounded p-1 text-ink-3 opacity-0 transition hover:text-danger focus:opacity-100 group-hover:opacity-100" aria-label="Delete note">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
