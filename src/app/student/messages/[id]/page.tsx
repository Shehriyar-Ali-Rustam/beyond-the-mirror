import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, Lock } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCounselor } from "@/lib/queries";
import { getTz } from "@/lib/tz";
import { messageTime, formatLongDate } from "@/lib/time";
import { CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ChatThread } from "@/components/shared/chat-thread";
import { LiveRefresh } from "@/components/shared/live-refresh";
import { StatusBadge, CategoryIcon } from "@/components/shared/status";
import { CounselorCard } from "@/components/shared/counselor-card";
import { StudentConversationActions } from "@/components/student/conversation-actions";
import { FeedbackForm } from "@/components/student/feedback-form";
import { SentToast } from "@/components/student/sent-toast";

export const metadata: Metadata = { title: "Conversation" };

export default async function StudentConversation({ params, searchParams }: PageProps<"/student/messages/[id]">) {
  const viewer = await requireRole("student");
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const tz = await getTz();
  const { data: conversation } = await supabase.from("conversations").select("*").eq("id", id).maybeSingle();
  if (!conversation || conversation.student_id !== viewer.id) notFound();

  const [{ data: messages }, counselor, { data: feedback }] = await Promise.all([
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true }).limit(1000),
    getCounselor(conversation.counselor_id),
    supabase.from("feedback").select("id, rating").eq("conversation_id", id).maybeSingle(),
  ]);

  const people: Record<string, { name: string; hue: number }> = {
    [viewer.id]: { name: viewer.full_name, hue: viewer.avatar_hue },
  };
  if (counselor) people[counselor.id] = { name: counselor.full_name, hue: counselor.avatar_hue };

  // counselor_last_read_at is the *latest* read; never show "seen" after the first reply.
  const seen =
    conversation.first_response_at && conversation.counselor_last_read_at && conversation.counselor_last_read_at > conversation.first_response_at
      ? conversation.first_response_at
      : conversation.counselor_last_read_at;
  const steps = [
    { label: "Sent", done: true, at: conversation.created_at },
    { label: "Seen by counselor", done: Boolean(seen), at: seen },
    { label: "Counselor replied", done: Boolean(conversation.first_response_at), at: conversation.first_response_at },
    { label: "Resolved", done: conversation.status === "resolved", at: conversation.resolved_at },
  ];

  return (
    <div className="mx-auto grid max-w-6xl gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      {sp.sent && <SentToast />}
      <LiveRefresh channel={`conversation-meta:${conversation.id}`} table="conversations" filter={`id=eq.${conversation.id}`} />
      <section className="flex h-[calc(100dvh-7.5rem)] min-h-[480px] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-sm sm:h-[calc(100dvh-8.5rem)]">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3.5 sm:px-6">
          <Link href="/student/messages" className="-ml-1 rounded-lg p-1.5 text-ink-2 hover:bg-surface-2 hover:text-ink" aria-label="Back to messages">
            <ArrowLeft className="size-5" />
          </Link>
          <CategoryIcon category={conversation.category} className="hidden sm:flex" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-medium text-ink">{conversation.subject}</h1>
            <p className="truncate text-xs text-ink-3">
              {CATEGORIES[conversation.category].label} · {counselor ? `with ${counselor.full_name}` : "Awaiting counselor"}
            </p>
          </div>
          <StatusBadge status={conversation.status} audience="student" />
        </header>

        <ChatThread
          conversationId={conversation.id}
          viewerId={viewer.id}
          tz={tz}
          initialMessages={messages ?? []}
          people={people}
          otherLastReadAt={conversation.counselor_last_read_at}
          otherReadField="counselor_last_read_at"
          placeholder={conversation.status === "resolved" ? "Write to reopen this conversation…" : "Write a reply…"}
          intro={
            <div className="mb-4 flex flex-col items-center text-center">
              <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs text-ink-3">
                <Lock className="size-3" /> Private conversation · started {formatLongDate(conversation.created_at, tz)}
              </span>
            </div>
          }
          closedNotice={
            conversation.status === "resolved" ? (
              <p className="mb-2.5 px-2 text-xs text-ink-3">
                This conversation is resolved. Sending a new message will reopen it.
              </p>
            ) : null
          }
        />
      </section>

      <aside className="space-y-4">
        <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-3">Progress</p>
          <ol className="mt-4 space-y-0">
            {steps.map((s, i) => (
              <li key={s.label} className="relative flex gap-3 pb-5 last:pb-0">
                {i < steps.length - 1 && (
                  <span className={cn("absolute left-[9px] top-6 h-[calc(100%-20px)] w-px", s.done && steps[i + 1].done ? "bg-primary" : "bg-line")} />
                )}
                {s.done ? <CheckCircle2 className="relative size-[19px] text-primary" /> : <Circle className="relative size-[19px] text-line-strong" />}
                <div className="-mt-0.5">
                  <p className={cn("text-sm", s.done ? "font-medium text-ink" : "text-ink-3")}>{s.label}</p>
                  {s.done && s.at && <p className="text-xs text-ink-3">{messageTime(s.at, tz)}</p>}
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-5 border-t border-line pt-4">
            <StudentConversationActions conversationId={conversation.id} status={conversation.status} />
          </div>
        </div>

        {conversation.status === "resolved" && !feedback && counselor && (
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
            <p className="font-medium text-ink">Did this help?</p>
            <p className="mt-1 text-sm text-ink-2">Only {counselor.full_name.split(" ")[0]} sees your rating.</p>
            <div className="mt-4">
              <FeedbackForm conversationId={conversation.id} />
            </div>
          </div>
        )}

        {counselor && <CounselorCard counselor={counselor} variant="compact" className="hidden xl:block" />}
      </aside>
    </div>
  );
}
