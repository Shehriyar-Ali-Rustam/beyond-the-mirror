import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessagesSquare } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTz } from "@/lib/tz";
import { formatDate, timeRange } from "@/lib/time";
import { MODES } from "@/lib/constants";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConversationRow } from "@/components/shared/conversation-row";
import { StudentPanel } from "@/components/counselor/student-panel";

export const metadata: Metadata = { title: "Student" };

export default async function CounselorStudent({ params }: PageProps<"/counselor/students/[id]">) {
  const viewer = await requireRole("counselor");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const tz = await getTz();

  const { data: student } = await supabase.from("profiles").select("id, full_name").eq("id", id).maybeSingle();
  if (!student) notFound(); // RLS returns nothing for students you can't see.

  const [{ data: conversations }, { data: sessions }] = await Promise.all([
    supabase.from("conversations").select("*").eq("student_id", id).eq("counselor_id", viewer.id).order("last_message_at", { ascending: false }),
    supabase
      .from("appointments")
      .select("*, slot:availability_slots(starts_at, ends_at, mode)")
      .eq("student_id", id)
      .eq("counselor_id", viewer.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/counselor/students" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" /> Students
      </Link>
      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="h-fit">
          <StudentPanel studentId={id} tz={tz} />
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Conversations" />
            <CardBody className="pt-3">
              {conversations?.length ? (
                <div className="-mx-3 space-y-0.5">
                  {conversations.map((c) => (
                    <ConversationRow
                      key={c.id}
                      conversation={c}
                      href={`/counselor/inbox/${c.id}`}
                      unread={c.last_message_sender === c.student_id && (!c.counselor_last_read_at || c.last_message_at > c.counselor_last_read_at)}
                      tz={tz}
                      audience="counselor"
                      youSentLast={c.last_message_sender === viewer.id}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState compact icon={<MessagesSquare />} title="No conversations yet" description={`${student.full_name.split(" ")[0]} hasn't opened a request with you.`} />
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Sessions" />
            <CardBody className="pt-3">
              {sessions?.length ? (
                <ul className="divide-y divide-line">
                  {sessions
                    .sort((a, b) => b.slot.starts_at.localeCompare(a.slot.starts_at))
                    .map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                        <span className="text-ink">
                          {formatDate(s.slot.starts_at, tz, true)} · {timeRange(s.slot.starts_at, s.slot.ends_at, tz)}
                          <span className="block text-xs text-ink-3">{MODES[s.slot.mode]}{s.reason ? ` · “${s.reason}”` : ""}</span>
                        </span>
                        <Badge tone={s.status === "completed" ? "resolved" : s.status === "cancelled" ? "neutral" : "progress"}>{s.status}</Badge>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-2">No sessions yet.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
