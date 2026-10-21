import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, Clock, EyeOff, GraduationCap, HeartHandshake, MessagesSquare, Star, UserPlus, UserX } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, PRESENCE } from "@/lib/constants";
import type { Category, Presence, RequestStatus } from "@/lib/types";
import { firstName, greeting, minutesLabel } from "@/lib/utils";
import { PageHeader } from "@/components/shell/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BarList, Stat } from "@/components/shared/stat";
import { ColumnChart, StatusBar } from "@/components/admin/charts";

export const metadata: Metadata = { title: "Overview" };

type AdminStats = {
  students: number;
  counselors: number;
  pending_accounts: number;
  unassigned_students: number;
  requests_by_status: Partial<Record<RequestStatus, number>>;
  requests_by_category: Partial<Record<Category, number>>;
  requests_last_30d: number;
  messages_last_7d: number;
  appointments_upcoming: number;
  appointments_completed: number;
  avg_rating: number | null;
  median_first_response_minutes: number | null;
  daily_requests: { day: string; count: number }[];
  caseloads: { id: string; name: string; presence: Presence; students: number; open: number }[];
};

export default async function AdminOverview() {
  const viewer = await requireRole("admin");
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_stats");
  const s = (data ?? {}) as AdminStats;

  const daily = (s.daily_requests ?? []).map((d) => ({
    key: d.day,
    value: d.count,
    label: new Date(`${d.day}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
  }));
  const categories = (Object.keys(CATEGORIES) as Category[])
    .map((k) => {
      const Icon = CATEGORIES[k].icon;
      return { label: CATEGORIES[k].label, value: s.requests_by_category?.[k] ?? 0, icon: <Icon /> };
    })
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
  const maxLoad = Math.max(1, ...(s.caseloads ?? []).map((c) => c.students));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow={`${greeting()}, ${firstName(viewer.full_name)}`}
        title="Platform overview"
        description="Accounts, assignments and how the service is being used, in aggregate only."
      />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-line bg-surface-2/60 px-4 py-3 text-sm text-ink-2">
        <EyeOff className="mt-0.5 size-4 shrink-0 text-ink-3" />
        <p>
          Administrators can&apos;t open conversations, read messages, see request subjects or counselors&apos; private
          notes. That&apos;s enforced by the database itself, not just hidden in the interface.
        </p>
      </div>

      {(s.pending_accounts > 0 || s.unassigned_students > 0) && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          {s.pending_accounts > 0 && (
            <Link href="/admin/users?status=pending" className="group flex items-center gap-4 rounded-2xl border border-clay/30 bg-clay-soft/60 p-4 transition hover:bg-clay-soft">
              <UserPlus className="size-5 text-clay" />
              <span className="flex-1 text-sm text-ink">
                <span className="font-semibold">{s.pending_accounts}</span> {s.pending_accounts === 1 ? "account is" : "accounts are"} waiting for approval
              </span>
              <ArrowRight className="size-4 text-ink-3 transition group-hover:translate-x-0.5" />
            </Link>
          )}
          {s.unassigned_students > 0 && (
            <Link href="/admin/assignments" className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:bg-surface-2">
              <UserX className="size-5 text-warn" />
              <span className="flex-1 text-sm text-ink">
                <span className="font-semibold">{s.unassigned_students}</span> {s.unassigned_students === 1 ? "student has" : "students have"} no counselor yet
              </span>
              <ArrowRight className="size-4 text-ink-3 transition group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active students" value={s.students ?? 0} icon={<GraduationCap />} tone="primary" />
        <Stat label="Active counselors" value={s.counselors ?? 0} icon={<HeartHandshake />} tone="primary" />
        <Stat label="Requests, last 30 days" value={s.requests_last_30d ?? 0} icon={<MessagesSquare />} hint={`${s.messages_last_7d ?? 0} messages in the last 7 days`} />
        <Stat label="Median first reply" value={minutesLabel(s.median_first_response_minutes)} icon={<Clock />} hint="Time until a counselor first responds" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="New requests per day" description="Last 14 days" />
          <CardBody>
            <ColumnChart data={daily} label="New requests per day, last 14 days" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Requests by status" description="All time" />
          <CardBody>
            <StatusBar
              segments={[
                { label: "Pending", value: s.requests_by_status?.pending ?? 0, className: "bg-warn" },
                { label: "In progress", value: s.requests_by_status?.in_progress ?? 0, className: "bg-info" },
                { label: "Resolved", value: s.requests_by_status?.resolved ?? 0, className: "bg-ok" },
              ]}
            />
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-line pt-5">
              <div>
                <p className="flex items-center gap-1.5 text-xs text-ink-2">
                  <CalendarCheck className="size-3.5 text-ink-3" /> Sessions
                </p>
                <p className="mt-0.5 text-lg font-semibold text-ink">
                  {s.appointments_upcoming ?? 0} <span className="text-xs font-normal text-ink-3">upcoming · {s.appointments_completed ?? 0} done</span>
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs text-ink-2">
                  <Star className="size-3.5 text-ink-3" /> Avg. rating
                </p>
                <p className="mt-0.5 text-lg font-semibold text-ink">{s.avg_rating ? Number(s.avg_rating).toFixed(1) : "-"}</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Topics students raise" description="Counts only, no content" />
          <CardBody>{categories.length ? <BarList items={categories} /> : <p className="text-sm text-ink-2">No requests yet.</p>}</CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader
            title="Counselor caseloads"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/assignments">
                  Manage <ArrowRight />
                </Link>
              </Button>
            }
          />
          <CardBody className="pt-3">
            {s.caseloads?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-3">
                      <th className="pb-2 font-medium">Counselor</th>
                      <th className="pb-2 font-medium">Students</th>
                      <th className="pb-2 text-right font-medium">Open requests</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {s.caseloads.map((c) => (
                      <tr key={c.id}>
                        <td className="py-3 pr-4">
                          <span className="flex items-center gap-3">
                            <Avatar name={c.name} size="sm" />
                            <span>
                              <span className="block font-medium text-ink">{c.name}</span>
                              <span className="flex items-center gap-1.5 text-xs text-ink-3">
                                <span className={`size-1.5 rounded-full ${PRESENCE[c.presence].dot}`} /> {PRESENCE[c.presence].label}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="w-1/2 py-3 pr-4">
                          <span className="flex items-center gap-3">
                            <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                              <span className="block h-full rounded-full bg-primary" style={{ width: `${(c.students / maxLoad) * 100}%` }} />
                            </span>
                            <span className="w-8 text-right tabular-nums text-ink">{c.students}</span>
                          </span>
                        </td>
                        <td className="py-3 text-right tabular-nums text-ink">{c.open}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-ink-2">No active counselors yet. Approve counselor accounts under People.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
