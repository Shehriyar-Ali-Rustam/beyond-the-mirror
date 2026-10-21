import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BookHeart, Megaphone, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTz } from "@/lib/tz";
import { STUDENT_FAQ } from "@/lib/content";
import { PageHeader } from "@/components/shell/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Accordion } from "@/components/ui/accordion";
import { EmptyState } from "@/components/ui/empty-state";
import { AnnouncementList } from "@/components/shared/announcement-list";
import { SafetyNote } from "@/components/shared/safety-note";

export const metadata: Metadata = { title: "Resources" };

const GUIDES = [
  { title: "Sleep and stress", body: "Why a regular bedtime helps more than an extra hour of revision.", href: "/student/toolkit/exams" },
  { title: "When worry won't switch off", body: "A 5-minute way to separate facts from fears.", href: "/student/toolkit/untangle" },
  { title: "Spotting bullying", body: "What counts, what to document, and who to tell.", href: "/student/toolkit/situations" },
  { title: "Hard conversations", body: "Scripts for saying no, apologising, and asking for help.", href: "/student/toolkit/say-it" },
];

export default async function StudentResources() {
  await requireRole("student");
  const supabase = await createClient();
  const tz = await getTz();
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);
  const ids = [...new Set((announcements ?? []).map((a) => a.author_id))];
  const { data: authors } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const authorMap = Object.fromEntries((authors ?? []).map((a) => [a.id, a.full_name]));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Resources" description="Announcements from your school's support team, guides, and answers to common questions." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Announcements" />
            <CardBody className="pt-4">
              {announcements && announcements.length > 0 ? (
                <AnnouncementList items={announcements} authors={authorMap} tz={tz} />
              ) : (
                <EmptyState compact icon={<Megaphone />} title="No announcements yet" description="Workshops, drop-in hours and updates from counselors will appear here." />
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Questions students ask" />
            <CardBody className="pt-2">
              <Accordion items={STUDENT_FAQ} className="border-t-0" />
            </CardBody>
          </Card>
        </div>
        <aside className="space-y-4">
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
            <p className="flex items-center gap-2 font-medium text-ink">
              <BookHeart className="size-4 text-primary" /> Short guides
            </p>
            <ul className="mt-3 divide-y divide-line">
              {GUIDES.map((g) => (
                <li key={g.title}>
                  <Link href={g.href} className="group flex items-start justify-between gap-3 py-3">
                    <span>
                      <span className="block text-sm font-medium text-ink group-hover:text-primary">{g.title}</span>
                      <span className="block text-[13px] leading-snug text-ink-3">{g.body}</span>
                    </span>
                    <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-ink-3 group-hover:text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-line bg-surface p-5 text-sm shadow-sm">
            <p className="flex items-center gap-2 font-medium text-ink">
              <ShieldCheck className="size-4 text-primary" /> Your privacy, in short
            </p>
            <p className="mt-2 leading-relaxed text-ink-2">
              Your conversations are visible only to you and your counselor. Admins see account details and totals,
              never message content.
            </p>
          </div>
          <SafetyNote />
        </aside>
      </div>
    </div>
  );
}
