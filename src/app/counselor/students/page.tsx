import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, SearchX, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTz } from "@/lib/tz";
import { shortStamp } from "@/lib/time";
import { PageHeader } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ListFilters } from "@/components/shared/list-filters";

export const metadata: Metadata = { title: "Students" };

export default async function CounselorStudents({ searchParams }: PageProps<"/counselor/students">) {
  const viewer = await requireRole("counselor");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.toLowerCase().trim() : "";
  const filter = sp.status === "open" || sp.status === "quiet" ? sp.status : "all";
  const supabase = await createClient();
  const tz = await getTz();

  const [{ data: students }, { data: convs }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, username, grade, section, avatar_hue").eq("counselor_id", viewer.id).order("full_name").limit(500),
    supabase.from("conversations").select("student_id, status, last_message_at").eq("counselor_id", viewer.id).limit(2000),
  ]);

  const byStudent = new Map<string, { open: number; total: number; last: string | null }>();
  for (const c of convs ?? []) {
    const s = byStudent.get(c.student_id) ?? { open: 0, total: 0, last: null };
    s.total++;
    if (c.status !== "resolved") s.open++;
    if (!s.last || c.last_message_at > s.last) s.last = c.last_message_at;
    byStudent.set(c.student_id, s);
  }
  const rows = (students ?? [])
    .map((s) => ({ ...s, ...(byStudent.get(s.id) ?? { open: 0, total: 0, last: null }) }))
    .filter((s) => (filter === "open" ? s.open > 0 : filter === "quiet" ? s.total === 0 : true))
    .filter((s) => !q || s.full_name.toLowerCase().includes(q) || s.username.includes(q) || (s.grade ?? "").toLowerCase().includes(q));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Students" description="Students assigned to you. Open a profile for their history, sessions and your private notes." />
      <Suspense>
        <ListFilters
          tabs={[
            { value: "all", label: "All", count: students?.length ?? 0 },
            { value: "open", label: "With open requests" },
            { value: "quiet", label: "Haven't reached out" },
          ]}
          searchPlaceholder="Search name, username or year"
        />
      </Suspense>
      <Card className="mt-5 overflow-hidden">
        {rows.length ? (
          <ul className="divide-y divide-line">
            {rows.map((s) => (
              <li key={s.id}>
                <Link href={`/counselor/students/${s.id}`} className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-surface-2 sm:px-6">
                  <Avatar name={s.full_name} hue={s.avatar_hue} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{s.full_name}</p>
                    <p className="truncate text-sm text-ink-3">
                      @{s.username}
                      {s.grade || s.section ? ` · ${[s.grade, s.section].filter(Boolean).join(", ")}` : ""}
                    </p>
                  </div>
                  <div className="hidden items-center gap-3 sm:flex">
                    {s.open > 0 ? <Badge tone="pending">{s.open} open</Badge> : s.total > 0 ? <Badge>{s.total} resolved</Badge> : <Badge tone="outline">No requests</Badge>}
                    <span className="w-24 text-right text-xs text-ink-3">{s.last ? shortStamp(s.last, tz) : "—"}</span>
                  </div>
                  <ChevronRight className="size-4 text-ink-3" />
                </Link>
              </li>
            ))}
          </ul>
        ) : q ? (
          <EmptyState icon={<SearchX />} title="No matches" description="Try a different name." />
        ) : (
          <EmptyState icon={<Users />} title="No students here yet" description="Students are assigned by an administrator, or automatically when they send their first message." />
        )}
      </Card>
    </div>
  );
}
