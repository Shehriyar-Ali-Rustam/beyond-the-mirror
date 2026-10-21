import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MessagesSquare, Plus, SearchX } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isUnreadFor, sentLastBy } from "@/lib/queries";
import { getTz } from "@/lib/tz";
import { ilikeTerm } from "@/lib/search";
import { PageHeader } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ConversationRow } from "@/components/shared/conversation-row";
import { ListFilters } from "@/components/shared/list-filters";
import { LiveRefresh } from "@/components/shared/live-refresh";

export const metadata: Metadata = { title: "Messages" };

export default async function StudentMessages({ searchParams }: PageProps<"/student/messages">) {
  const viewer = await requireRole("student");
  const sp = await searchParams;
  const status = sp.status === "open" || sp.status === "resolved" ? sp.status : "all";
  const q = typeof sp.q === "string" ? sp.q : "";
  const supabase = await createClient();
  const tz = await getTz();

  let query = supabase
    .from("conversations")
    .select("*")
    .order("last_message_at", { ascending: false })
    .limit(100);
  if (status === "open") query = query.neq("status", "resolved");
  if (status === "resolved") query = query.eq("status", "resolved");
  const term = ilikeTerm(q);
  if (term) query = query.or(`subject.ilike.${term},last_message_preview.ilike.${term}`);

  const [{ data: conversations }, { data: all }] = await Promise.all([
    query,
    supabase.from("conversations").select("status"),
  ]);
  const counts = {
    all: all?.length ?? 0,
    open: all?.filter((c) => c.status !== "resolved").length ?? 0,
    resolved: all?.filter((c) => c.status === "resolved").length ?? 0,
  };

  return (
    <div className="mx-auto max-w-4xl">
      <LiveRefresh channel={`student-convs:${viewer.id}`} table="conversations" />
      <PageHeader
        title="Messages"
        description="Every conversation with your counselor, in one place."
        actions={
          <Button asChild>
            <Link href="/student/messages/new">
              <Plus /> New message
            </Link>
          </Button>
        }
      />
      <Suspense>
        <ListFilters
          tabs={[
            { value: "all", label: "All", count: counts.all },
            { value: "open", label: "Open", count: counts.open },
            { value: "resolved", label: "Resolved", count: counts.resolved },
          ]}
          searchPlaceholder="Search your messages"
        />
      </Suspense>
      <Card className="mt-5 p-2 sm:p-3">
        {conversations && conversations.length > 0 ? (
          <div className="space-y-0.5">
            {conversations.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                href={`/student/messages/${c.id}`}
                unread={isUnreadFor(viewer, c)}
                tz={tz}
                audience="student"
                youSentLast={sentLastBy(viewer, c)}
              />
            ))}
          </div>
        ) : q ? (
          <EmptyState icon={<SearchX />} title="No matches" description={`Nothing matches "${q}". Try a different word.`} />
        ) : (
          <EmptyState
            icon={<MessagesSquare />}
            title={status === "resolved" ? "No resolved conversations yet" : "Your inbox is empty"}
            description="Write to your counselor about anything: school, friends, home, or how you're feeling."
            action={
              <Button asChild>
                <Link href="/student/messages/new">Write your first message</Link>
              </Button>
            }
          />
        )}
      </Card>
    </div>
  );
}
