import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, MapPin, MessageSquarePlus, MessagesSquare, Sparkles, UserRoundSearch } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCounselor, isUnreadFor, sentLastBy } from "@/lib/queries";
import { getTz } from "@/lib/tz";
import { MODES } from "@/lib/constants";
import { CHECK_INS, TOOLS } from "@/lib/toolkit";
import { firstName, greeting } from "@/lib/utils";
import { dayLabel, timeRange } from "@/lib/time";
import { PageHeader } from "@/components/shell/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CounselorCard } from "@/components/shared/counselor-card";
import { ConversationRow } from "@/components/shared/conversation-row";
import { AnnouncementList } from "@/components/shared/announcement-list";
import { SafetyNote } from "@/components/shared/safety-note";
import { CommunityArt, FloatingShapes, WelcomeArt } from "@/components/illustrations/scenes";

export const metadata: Metadata = { title: "Home" };

export default async function StudentHome({ searchParams }: PageProps<"/student">) {
  const viewer = await requireRole("student");
  const supabase = await createClient();
  const tz = await getTz();
  const sp = await searchParams;
  const now = new Date().toISOString();

  const [counselor, { data: conversations }, { data: upcoming }, { data: announcements }] = await Promise.all([
    getCounselor(viewer.counselor_id),
    supabase
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(4),
    supabase
      .from("appointments")
      .select("*, slot:availability_slots!inner(starts_at, ends_at, mode, location)")
      .eq("student_id", viewer.id)
      .eq("status", "confirmed")
      .gt("slot.starts_at", now)
      .limit(10),
    supabase.from("announcements").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(3),
  ]);

  const authorIds = [...new Set((announcements ?? []).map((a) => a.author_id))];
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] };
  const authorMap = Object.fromEntries((authors ?? []).map((a) => [a.id, a.full_name]));
  const next = (upcoming ?? []).sort((a, b) => a.slot.starts_at.localeCompare(b.slot.starts_at))[0];
  const openCount = (conversations ?? []).filter((c) => c.status !== "resolved").length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow={`${greeting()}, ${firstName(viewer.full_name)}`}
        title="What's on your mind today?"
        description="Write to your counselor, book a time to talk, or take a few minutes with a self-help tool. There's no wrong place to start."
      />

      {sp.welcome && (
        <div className="mb-6 animate-fade-up rounded-3xl border border-lilac/30 bg-lilac-soft p-5 sm:p-6">
          <p className="font-display text-lg text-ink">Welcome to Beyond the Mirror 👋</p>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-2">
            Everything you write in Messages goes only to your counselor. When you send your first message, we&apos;ll
            connect you with a counselor if your school hasn&apos;t already.
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Primary action */}
        <Link
          href="/student/messages/new"
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-[#2c7a6c] p-6 text-primary-ink shadow-md transition-transform duration-300 hover:-translate-y-0.5 sm:p-8 lg:col-span-2"
        >
          <div className="paper-grain absolute inset-0 opacity-40" aria-hidden />
          <FloatingShapes variant="dark" className="absolute -top-10 right-44 hidden size-64 opacity-50 sm:block" />
          <WelcomeArt className="absolute -bottom-3 right-2 hidden h-60 w-64 transition-transform duration-500 group-hover:-translate-y-1 sm:block" />
          <div className="relative max-w-md">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-white/10">
              <MessageSquarePlus className="size-5" />
            </span>
            <h2 className="mt-5 font-display text-2xl leading-snug sm:text-[1.75rem]">Talk to your counselor</h2>
            <p className="mt-2 text-[15px] leading-relaxed opacity-80">
              Big or small, school or personal. Write it how it comes. You don&apos;t need the perfect words.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">
              Start a conversation <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </Link>

        {counselor ? (
          <CounselorCard counselor={counselor} />
        ) : (
          <Card>
            <EmptyState
              compact
              icon={<UserRoundSearch />}
              title="No counselor yet"
              description="Send your first message and we'll connect you with an available counselor straight away."
            />
          </Card>
        )}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Your conversations"
            description={openCount ? `${openCount} open` : undefined}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/student/messages">
                  View all <ArrowRight />
                </Link>
              </Button>
            }
          />
          <CardBody className="pt-3">
            {conversations && conversations.length > 0 ? (
              <div className="-mx-3 space-y-0.5 sm:-mx-4">
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
            ) : (
              <EmptyState
                compact
                icon={<MessagesSquare />}
                title="Nothing here yet"
                description="When you message your counselor, the conversation and their replies will live here."
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Next session" />
          <CardBody className="pt-4">
            {next ? (
              <div>
                <div className="flex items-center gap-4">
                  <div className="arch-sm flex h-16 w-14 flex-col items-center justify-end bg-primary-soft pb-2 text-primary-soft-ink">
                    <CalendarDays className="mb-1 size-4" />
                  </div>
                  <div>
                    <p className="font-display text-xl text-ink">{dayLabel(next.slot.starts_at, tz)}</p>
                    <p className="text-sm text-ink-2">{timeRange(next.slot.starts_at, next.slot.ends_at, tz)}</p>
                  </div>
                </div>
                <p className="mt-4 flex items-center gap-2 text-sm text-ink-2">
                  <MapPin className="size-4 text-ink-3" />
                  {MODES[next.slot.mode]}
                  {next.slot.location ? ` · ${next.slot.location}` : ""}
                </p>
                <Button asChild variant="secondary" size="sm" className="mt-5">
                  <Link href="/student/appointments">Manage sessions</Link>
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-sm leading-relaxed text-ink-2">
                  Sometimes it&apos;s easier to talk face to face. Pick a time that suits you from your counselor&apos;s
                  open slots.
                </p>
                <Button asChild variant="soft" size="sm" className="mt-4">
                  <Link href="/student/appointments#book">
                    <CalendarDays /> Book a session
                  </Link>
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Check in */}
      <section className="mt-5 rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6" aria-labelledby="checkin">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="checkin" className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <Sparkles className="size-4 text-lilac" /> Check in with yourself
            </h2>
            <p className="mt-0.5 text-sm text-ink-2">Pick whatever sounds closest. Nothing here is saved or shared.</p>
          </div>
          <Link href="/student/toolkit" className="text-sm font-medium text-primary hover:underline">
            All tools
          </Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {CHECK_INS.map((c) => {
            const tool = TOOLS.find((t) => t.slug === c.tool)!;
            return (
              <Link
                key={c.label}
                href={`/student/toolkit/${c.tool}`}
                className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-4 text-sm text-ink-2 transition hover:-translate-y-0.5 hover:border-line-strong hover:text-ink hover:shadow-sm"
              >
                <span className={`flex size-7 items-center justify-center rounded-full ${tool.tone}`}>
                  <tool.icon className="size-3.5" />
                </span>
                {c.label}
                <ArrowUpRight className="size-3.5 opacity-0 transition group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>
      </section>

      <Link
        href="/student/community"
        className="group relative mt-5 flex flex-col gap-4 overflow-hidden rounded-3xl bg-gradient-to-r from-sun-soft via-rose-soft to-sky-soft p-5 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:p-6"
      >
        <CommunityArt className="h-24 w-32 shrink-0 transition-transform duration-500 group-hover:-rotate-2 group-hover:scale-105" />
        <div className="flex-1">
          <p className="font-display text-xl text-ink">Community board</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            Ask other students for advice, share a small win, or add a photo. You can post anonymously.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-surface px-4 py-2 text-sm font-medium text-ink shadow-sm sm:self-center">
          Open the board <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="From your school"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/student/resources">
                  Resources <ArrowRight />
                </Link>
              </Button>
            }
          />
          <CardBody className="pt-4">
            {announcements && announcements.length > 0 ? (
              <AnnouncementList items={announcements} authors={authorMap} tz={tz} />
            ) : (
              <p className="text-sm text-ink-2">No announcements right now.</p>
            )}
          </CardBody>
        </Card>
        <SafetyNote className="h-fit" />
      </div>
    </div>
  );
}
