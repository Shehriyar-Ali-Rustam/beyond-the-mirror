import Link from "next/link";
import { CalendarDays, ExternalLink, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MODES } from "@/lib/constants";
import { dayLabel, formatDate, timeRange } from "@/lib/time";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status";
import { NotesPanel } from "./notes-panel";

/** Server component: everything a counselor may see about one student. RLS enforces access. */
export async function StudentPanel({ studentId, currentConversationId, tz }: { studentId: string; currentConversationId?: string; tz: string }) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [{ data: student }, { data: conversations }, { data: sessions }, { data: notes }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, username, email, grade, section, student_number, avatar_hue, created_at").eq("id", studentId).maybeSingle(),
    supabase.from("conversations").select("id, subject, status, last_message_at").eq("student_id", studentId).order("last_message_at", { ascending: false }).limit(20),
    supabase
      .from("appointments")
      .select("id, status, slot:availability_slots!inner(starts_at, ends_at, mode)")
      .eq("student_id", studentId)
      .eq("status", "confirmed")
      .gt("slot.ends_at", now)
      .limit(5),
    supabase.from("case_notes").select("*").eq("student_id", studentId).order("created_at", { ascending: false }).limit(50),
  ]);
  if (!student) return null;
  const others = (conversations ?? []).filter((c) => c.id !== currentConversationId);

  return (
    <div className="space-y-6 p-5">
      <div className="flex flex-col items-center pt-4 text-center">
        <Avatar name={student.full_name} hue={student.avatar_hue} size="xl" />
        <p className="mt-3 font-display text-xl text-ink">{student.full_name}</p>
        <p className="text-sm text-ink-2">@{student.username}</p>
        {(student.grade || student.section || student.student_number) && (
          <p className="mt-1 text-xs text-ink-3">
            {[student.grade, student.section, student.student_number && `ID ${student.student_number}`].filter(Boolean).join(" · ")}
          </p>
        )}
        {student.email && (
          <a href={`mailto:${student.email}`} className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-3 hover:text-primary">
            <Mail className="size-3" /> {student.email}
          </a>
        )}
        <Link href={`/counselor/students/${student.id}`} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Full profile <ExternalLink className="size-3" />
        </Link>
      </div>

      <section>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-ink-3">Upcoming sessions</p>
        {sessions && sessions.length ? (
          <ul className="space-y-2">
            {sessions
              .sort((a, b) => a.slot.starts_at.localeCompare(b.slot.starts_at))
              .map((s) => (
                <li key={s.id} className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                  <CalendarDays className="size-4 text-primary" />
                  <span className="text-ink">
                    {dayLabel(s.slot.starts_at, tz)}, {timeRange(s.slot.starts_at, s.slot.ends_at, tz)}
                    <span className="block text-xs text-ink-3">{MODES[s.slot.mode]}</span>
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-3">None booked.</p>
        )}
      </section>

      <section>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-ink-3">Other conversations</p>
        {others.length ? (
          <ul className="space-y-1">
            {others.map((c) => (
              <li key={c.id}>
                <Link href={`/counselor/inbox/${c.id}`} className="block rounded-xl px-2.5 py-2 transition hover:bg-surface-2">
                  <p className="truncate text-sm text-ink">{c.subject}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge status={c.status} />
                    <span className="text-xs text-ink-3">{formatDate(c.last_message_at, tz)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-3">This is their only conversation.</p>
        )}
      </section>

      <NotesPanel studentId={student.id} initialNotes={notes ?? []} tz={tz} />
    </div>
  );
}
