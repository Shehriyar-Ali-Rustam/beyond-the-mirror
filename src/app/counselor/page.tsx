import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarDays, Clock, Inbox, MessageCircleReply, Star, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTz } from "@/lib/tz";
import { CATEGORIES, MODES } from "@/lib/constants";
import { dayLabel, timeRange, shortStamp, formatDate } from "@/lib/time";
import { firstName, greeting, minutesLabel } from "@/lib/utils";
import type { Category, Urgency } from "@/lib/types";
import { PageHero } from "@/components/visual/page-hero";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BarList, Stat } from "@/components/shared/stat";
import { StatusBadge, UrgencyBadge } from "@/components/shared/status";
import { PresenceSwitcher } from "@/components/counselor/presence-switcher";
import { LiveRefresh } from "@/components/shared/live-refresh";

export const metadata: Metadata = { title: "Overview" };

type Stats = {
  students: number;
  pending: number;
  in_progress: number;
  urgent_open: number;
  awaiting_reply: number;
  resolved_7d: number;
  median_first_response_minutes: number | null;
  avg_rating: number | null;
  ratings_count: number;
  sessions_upcoming: number;
  by_category: Partial<Record<Category, number>>;
};

const URGENCY_RANK: Record<Urgency, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export default async function CounselorOverview() {
  const viewer = await requireRole("counselor");
  const supabase = await createClient();
  const tz = await getTz();
  const now = new Date().toISOString();

  const [{ data: statsRaw }, { data: open }, { data: sessions }, { data: feedback }] = await Promise.all([
    supabase.rpc("counselor_stats"),
    supabase
      .from("conversations")
      .select("*, student:profiles!conversations_student_id_fkey(id, full_name, avatar_hue, grade)")
      .eq("counselor_id", viewer.id)
      .neq("status", "resolved")
      .order("last_message_at", { ascending: true })
      .limit(50),
    supabase
      .from("appointments")
      .select("*, slot:availability_slots!inner(starts_at, ends_at, mode, location), student:profiles!appointments_student_id_fkey(full_name, avatar_hue)")
      .eq("counselor_id", viewer.id)
      .eq("status", "confirmed")
      .gt("slot.ends_at", now)
      .limit(20),
    supabase.from("feedback").select("rating, comment, created_at").eq("counselor_id", viewer.id).order("created_at", { ascending: false }).limit(3),
  ]);

  const stats = (statsRaw ?? {}) as Stats;
  // Needs attention: the student spoke last, ranked by urgency, then longest wait.
  const queue = (open ?? [])
    .filter((c) => c.last_from_student)
    .sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || a.last_message_at.localeCompare(b.last_message_at))
    .slice(0, 6);
  const upcoming = (sessions ?? []).sort((a, b) => a.slot.starts_at.localeCompare(b.slot.starts_at)).slice(0, 5);
  const categories = (Object.keys(CATEGORIES) as Category[])
    .map((k) => ({ label: CATEGORIES[k].label, value: stats.by_category?.[k] ?? 0, icon: (() => { const I = CATEGORIES[k].icon; return <I />; })() }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl">
      <LiveRefresh channel={`counselor-overview:${viewer.id}`} table="conversations" filter={`counselor_id=eq.${viewer.id}`} />
      <PageHero illustration="active-support" tone="mint"
        eyebrow={`${greeting()}, ${firstName(viewer.full_name)}`}
        title={stats.awaiting_reply ? `${stats.awaiting_reply} ${stats.awaiting_reply === 1 ? "student is" : "students are"} waiting to hear from you` : "You're all caught up"}
        description="Here's what needs you today."
        actions={<PresenceSwitcher value={viewer.presence} />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Awaiting your reply" value={stats.awaiting_reply ?? 0} icon={<MessageCircleReply />} tone={stats.awaiting_reply ? "clay" : "neutral"} hint={`${stats.pending ?? 0} new · ${stats.in_progress ?? 0} in progress`} />
        <Stat label="High or urgent" value={stats.urgent_open ?? 0} icon={<AlertTriangle />} tone={stats.urgent_open ? "danger" : "neutral"} hint="Open requests" />
        <Stat label="Median first reply" value={minutesLabel(stats.median_first_response_minutes)} icon={<Clock />} tone="primary" hint={`${stats.resolved_7d ?? 0} resolved this week`} />
        <Stat
          label="Student rating"
          value={stats.avg_rating ? Number(stats.avg_rating).toFixed(1) : "-"}
          icon={<Star />}
          tone="ok"
          hint={stats.ratings_count ? `From ${stats.ratings_count} ${stats.ratings_count === 1 ? "rating" : "ratings"}` : "No ratings yet"}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Needs attention"
            description="Ranked by urgency, then how long they've been waiting."
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/counselor/inbox">
                  Inbox <ArrowRight />
                </Link>
              </Button>
            }
          />
          <CardBody className="pt-3">
            {queue.length ? (
              <ul className="-mx-2 space-y-0.5">
                {queue.map((c) => (
                  <li key={c.id}>
                    <Link href={`/counselor/inbox/${c.id}`} className="flex items-center gap-3.5 rounded-2xl px-2 py-3 transition hover:bg-surface-2">
                      <Avatar name={c.student?.full_name ?? "Anonymous"} hue={c.student?.avatar_hue ?? 200} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium text-ink">{c.student?.full_name ?? "Anonymous student"}</p>
                          <UrgencyBadge urgency={c.urgency} />
                        </div>
                        <p className="truncate text-sm text-ink-2">{c.subject}</p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <StatusBadge status={c.status} />
                        <p className="mt-1 text-xs text-ink-3">waiting since {shortStamp(c.last_message_at, tz)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact illustration="feeling-happy" title="Nobody is waiting on you" description="New messages and replies from students will appear here, most urgent first." />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Upcoming sessions"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/counselor/schedule">
                  Schedule <ArrowRight />
                </Link>
              </Button>
            }
          />
          <CardBody className="pt-3">
            {upcoming.length ? (
              <ul className="space-y-3">
                {upcoming.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                    <div className="arch-sm flex h-12 w-11 shrink-0 flex-col items-center justify-center bg-primary-soft text-primary-soft-ink">
                      <span className="text-[10px] font-medium uppercase">{formatDate(a.slot.starts_at, tz).split(" ")[1]}</span>
                      <span className="font-display text-lg leading-none">{formatDate(a.slot.starts_at, tz).split(" ")[0]}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{a.student?.full_name}</p>
                      <p className="text-xs text-ink-3">
                        {dayLabel(a.slot.starts_at, tz)} · {timeRange(a.slot.starts_at, a.slot.ends_at, tz)} · {MODES[a.slot.mode]}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                illustration="calendar"
                title="No sessions booked"
                description="Open some times so students can book you."
                action={
                  <Button asChild size="sm" variant="secondary">
                    <Link href="/counselor/schedule">Add availability</Link>
                  </Button>
                }
              />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="What students bring to you" description="All-time, by topic" />
          <CardBody className="pt-4">
            {categories.length ? <BarList items={categories} /> : <p className="text-sm text-ink-2">No requests yet.</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Caseload" />
          <CardBody className="space-y-4 pt-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-ink-2">
                <Users className="size-4" />
              </span>
              <div>
                <p className="text-2xl font-semibold leading-none text-ink">{stats.students ?? 0}</p>
                <p className="text-xs text-ink-3">assigned students</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-ink-2">
                <Inbox className="size-4" />
              </span>
              <div>
                <p className="text-2xl font-semibold leading-none text-ink">{(stats.pending ?? 0) + (stats.in_progress ?? 0)}</p>
                <p className="text-xs text-ink-3">open requests</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-ink-2">
                <CalendarDays className="size-4" />
              </span>
              <div>
                <p className="text-2xl font-semibold leading-none text-ink">{stats.sessions_upcoming ?? 0}</p>
                <p className="text-xs text-ink-3">upcoming sessions</p>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Recent feedback" description="Latest ratings and comments" />
          <CardBody className="pt-4">
            {feedback && feedback.length ? (
              <ul className="space-y-4">
                {feedback.map((f, i) => (
                  <li key={i}>
                    <div className="flex gap-0.5" aria-label={`${f.rating} out of 5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={n <= f.rating ? "size-3.5 fill-clay text-clay" : "size-3.5 text-line-strong"} />
                      ))}
                    </div>
                    {f.comment && <p className="mt-1 line-clamp-3 text-sm italic text-ink-2">“{f.comment}”</p>}
                    <p className="mt-1 text-xs text-ink-3">{formatDate(f.created_at, tz)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-2">Students can rate resolved requests and completed sessions.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
