import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BadgeCheck, Brain, Clock3, Gauge, HeartHandshake, SearchX, ShieldCheck, Sparkles, UserRoundX } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EXPERTISE, expertiseLabel, type ExpertiseArea } from "@/lib/expertise";
import { CATEGORIES } from "@/lib/constants";
import { CONCERNS } from "@/lib/matching";
import { PageHero } from "@/components/visual/page-hero";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ListFilters } from "@/components/shared/list-filters";

export const metadata: Metadata = { title: "Matching" };

const FACTORS = [
  { icon: Brain, title: "What the student described", body: "Their answers and words are turned into areas like exam stress or family issues, on our own server. No outside AI service sees them." },
  { icon: HeartHandshake, title: "Counselor expertise", body: "The biggest factor: how well a counselor's verified areas of expertise cover those concerns." },
  { icon: BadgeCheck, title: "Experience", body: "More years of experience adds a little weight." },
  { icon: Clock3, title: "Availability", body: "Counselors marked Available now are preferred, especially for urgent requests." },
  { icon: Gauge, title: "Caseload", body: "Counselors with fewer students get a small boost, so nobody is overloaded." },
  { icon: Sparkles, title: "Continuity", body: "If the student's current counselor is a good fit, they stay together." },
];

const concernLabel = (c: string) =>
  CONCERNS.find((x) => x.id === c)?.label ?? CATEGORIES[c as keyof typeof CATEGORIES]?.label ?? EXPERTISE[c as ExpertiseArea]?.label ?? c;

export default async function AdminMatching({ searchParams }: PageProps<"/admin/matching">) {
  await requireRole("admin");
  const sp = await searchParams;
  const view = sp.status === "unmatched" ? "unmatched" : "all";
  const q = typeof sp.q === "string" ? sp.q.toLowerCase().trim() : "";
  const supabase = await createClient();

  const [{ data: counselors }, { data: areas }, { data: students }] = await Promise.all([
    supabase.rpc("admin_matching_overview"),
    supabase.rpc("admin_match_areas"),
    supabase.from("profiles").select("id, full_name, username, grade, section, avatar_hue, counselor_id").eq("role", "student").eq("status", "active").order("full_name").limit(1000),
  ]);
  const active = (counselors ?? []).filter((c) => c.status === "active");
  const names = new Map(active.map((c) => [c.counselor_id, c.full_name]));
  const unmatched = (students ?? []).filter((s) => !s.counselor_id).length;
  const rows = (students ?? [])
    .filter((s) => view === "all" || !s.counselor_id)
    .filter((s) => !q || s.full_name.toLowerCase().includes(q) || s.username.includes(q));
  const maxArea = Math.max(1, ...(areas ?? []).map((a) => Number(a.matches)));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHero
        illustration="conversation"
        tone="lavender"
        eyebrow="Automatic, verified-only"
        title="Smart matching"
        description="Students are matched with a counselor automatically, based on what they're going through. Only approved counselors with verified details are ever matched. There's nothing to assign by hand."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FACTORS.map((f) => (
          <div key={f.title} className="rounded-3xl border border-line bg-surface p-4 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <f.icon className="size-4 text-primary" /> {f.title}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{f.body}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader title="Counselors" description={`${active.length} active`} />
          <CardBody className="pt-3">
            {counselors?.length ? (
              <ul className="divide-y divide-line">
                {counselors.map((c) => (
                  <li key={c.counselor_id} className="py-3.5">
                    <div className="flex flex-wrap items-center gap-3">
                      <Avatar name={c.full_name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5 font-medium text-ink">
                          {c.full_name}
                          {c.status !== "active" ? (
                            <Badge tone="neutral">{c.status === "pending" ? "Applied" : "Paused"}</Badge>
                          ) : c.verified ? (
                            <Badge tone="resolved">
                              <BadgeCheck /> Verified
                            </Badge>
                          ) : (
                            <Badge tone="pending">Needs verification</Badge>
                          )}
                        </span>
                        <span className="block text-xs text-ink-3">
                          {c.experience_years != null ? `${c.experience_years} yrs · ` : ""}
                          {c.students} {c.students === 1 ? "student" : "students"} · {c.matches_30d} matched in 30 days
                        </span>
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 pl-11">
                      {c.expertise.length ? (
                        c.expertise.map((e) => (
                          <span key={e} className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${EXPERTISE[e as ExpertiseArea]?.tone ?? "bg-surface-2"}`}>
                            {expertiseLabel(e)}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-ink-3">No areas listed yet: matched as a generalist until they add their details.</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact illustration="in-thought" title="No counselors yet" description="Counselors appear here once they apply." />
            )}
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="What students needed" description="Last 30 days" />
            <CardBody className="pt-4">
              {areas?.length ? (
                <ul className="space-y-3">
                  {areas.map((a) => (
                    <li key={a.concern}>
                      <div className="flex justify-between text-sm">
                        <span className="text-ink-2">{concernLabel(a.concern)}</span>
                        <span className="tabular-nums text-ink">{a.matches}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(Number(a.matches) / maxArea) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-3">No matches yet.</p>
              )}
            </CardBody>
          </Card>
          <div className="flex gap-3 rounded-3xl border border-line bg-surface p-4 text-[13px] leading-relaxed text-ink-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            Only totals are shown here. What an individual student wrote stays between them and their counselor.
          </div>
        </div>
      </div>

      <h2 className="mb-3 mt-8 font-display text-xl text-ink">Students</h2>
      <Suspense>
        <ListFilters
          tabs={[
            { value: "all", label: "All students", count: students?.length ?? 0 },
            { value: "unmatched", label: "Not matched yet", count: unmatched },
          ]}
          searchPlaceholder="Search students"
        />
      </Suspense>
      <Card className="mt-4 overflow-hidden">
        {rows.length ? (
          <ul className="divide-y divide-line">
            {rows.map((s) => (
              <li key={s.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={s.full_name} hue={s.avatar_hue} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{s.full_name}</span>
                    <span className="block truncate text-xs text-ink-3">
                      @{s.username}
                      {s.grade || s.section ? ` · ${[s.grade, s.section].filter(Boolean).join(", ")}` : ""}
                    </span>
                  </span>
                </span>
                {s.counselor_id ? (
                  <span className="text-sm text-ink-2">
                    Matched with <span className="font-medium text-ink">{names.get(s.counselor_id) ?? "a counselor"}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm text-ink-3">
                    <UserRoundX className="size-4" /> Matched when they first ask for help
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<SearchX />} title={view === "unmatched" ? "Everyone has a counselor" : "No students found"} description={view === "unmatched" ? "Every active student is matched." : "Try a different search."} />
        )}
      </Card>
      <p className="mt-4 text-xs text-ink-3">
        Counselor details are reviewed on the <Link href="/admin/users?status=pending" className="text-primary hover:underline">People</Link> page.
      </p>
    </div>
  );
}
