import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, VenetianMask } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTz } from "@/lib/tz";
import { formatLongDate } from "@/lib/time";
import { COUNSELOR_QUICK_REPLIES } from "@/lib/content";
import { Avatar } from "@/components/ui/avatar";
import { ChatThread } from "@/components/shared/chat-thread";
import { LiveRefresh } from "@/components/shared/live-refresh";
import { ConversationControls } from "@/components/counselor/conversation-controls";
import { StudentPanel } from "@/components/counselor/student-panel";
import { DetailsDrawer } from "@/components/counselor/details-drawer";
import { AnonymousPanel } from "@/components/counselor/anonymous-panel";

export const metadata: Metadata = { title: "Conversation" };

export default async function CounselorConversation({ params }: PageProps<"/counselor/inbox/[id]">) {
  const viewer = await requireRole("counselor");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const tz = await getTz();

  const { data: c } = await supabase
    .from("conversations")
    .select("*, student:profiles!conversations_student_id_fkey(id, full_name, avatar_hue, grade, created_at)")
    .eq("id", id)
    .maybeSingle();
  if (!c || c.counselor_id !== viewer.id) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(1000);

  const student = c.student;
  const anonymousStudent = { name: "Anonymous student", hue: 265 };
  const people: Record<string, { name: string; hue: number }> = {
    [viewer.id]: { name: viewer.full_name, hue: viewer.avatar_hue },
  };
  if (student) people[student.id] = { name: student.full_name, hue: student.avatar_hue };
  const panel = student ? (
    <StudentPanel studentId={student.id} currentConversationId={c.id} tz={tz} />
  ) : (
    <AnonymousPanel />
  );

  return (
    <div className="flex min-h-0 flex-1">
      <LiveRefresh channel={`conversation-meta:${c.id}`} table="conversations" filter={`id=eq.${c.id}`} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="space-y-3 border-b border-line px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/counselor/inbox" className="-ml-1 rounded-lg p-1.5 text-ink-2 hover:bg-surface-2 lg:hidden" aria-label="Back to inbox">
              <ArrowLeft className="size-5" />
            </Link>
            {student ? (
              <Avatar name={student.full_name} hue={student.avatar_hue} />
            ) : (
              <span className="arch-sm flex size-10 shrink-0 items-center justify-center bg-lilac-soft text-lilac">
                <VenetianMask className="size-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              {student ? (
                <Link href={`/counselor/students/${student.id}`} className="block truncate font-medium text-ink hover:text-primary">
                  {student.full_name}
                  {student.grade && <span className="font-normal text-ink-3"> · {student.grade}</span>}
                </Link>
              ) : (
                <p className="truncate font-medium text-ink">Anonymous student</p>
              )}
              <h1 className="truncate text-sm text-ink-2">{c.subject}</h1>
            </div>
            <DetailsDrawer>{panel}</DetailsDrawer>
          </div>
          <ConversationControls conversationId={c.id} status={c.status} urgency={c.urgency} category={c.category} />
        </header>
        <ChatThread
          conversationId={c.id}
          viewerId={viewer.id}
          side="counselor"
          anonymousStudent={anonymousStudent}
          tz={tz}
          initialMessages={messages ?? []}
          people={people}
          otherLastReadAt={c.student_last_read_at}
          otherReadField="student_last_read_at"
          placeholder={student ? `Reply to ${student.full_name.split(" ")[0]}…` : "Reply…"}
          quickReplies={COUNSELOR_QUICK_REPLIES}
          intro={
            <div className="mb-4 flex justify-center">
              <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs text-ink-3">
                <Lock className="size-3" /> Opened {formatLongDate(c.created_at, tz)} · visible only to you and {student ? student.full_name.split(" ")[0] : "the student"}
              </span>
            </div>
          }
        />
      </div>
      <aside className="scrollbar-thin hidden w-[320px] shrink-0 overflow-y-auto border-l border-line 2xl:block">{panel}</aside>
    </div>
  );
}
