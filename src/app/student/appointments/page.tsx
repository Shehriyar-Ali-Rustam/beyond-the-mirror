import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, CalendarX2, MapPin, UserRoundSearch } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCounselor } from "@/lib/queries";
import { getTz } from "@/lib/tz";
import { MODES } from "@/lib/constants";
import { dayLabel, formatDate, formatWeekday, timeRange } from "@/lib/time";
import { PageHeader } from "@/components/shell/app-shell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SlotPicker } from "@/components/student/slot-picker";
import { CancelAppointmentButton } from "@/components/shared/cancel-appointment";
import { FeedbackForm } from "@/components/student/feedback-form";

export const metadata: Metadata = { title: "Sessions" };

export default async function StudentAppointments() {
  const viewer = await requireRole("student");
  const supabase = await createClient();
  const tz = await getTz();
  const counselor = await getCounselor(viewer.counselor_id);

  const [{ data: appointments }, { data: slots }, { data: feedback }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, slot:availability_slots(starts_at, ends_at, mode, location)")
      .eq("student_id", viewer.id)
      .order("created_at", { ascending: false })
      .limit(100),
    counselor ? supabase.rpc("open_slots") : Promise.resolve({ data: [] }),
    // RLS limits students to their own feedback.
    supabase.from("feedback").select("appointment_id").not("appointment_id", "is", null),
  ]);

  const now = new Date().getTime();
  const rated = new Set((feedback ?? []).map((f) => f.appointment_id));
  const all = (appointments ?? []).sort((a, b) => a.slot.starts_at.localeCompare(b.slot.starts_at));
  const upcoming = all.filter((a) => a.status === "confirmed" && Date.parse(a.slot.ends_at) > now);
  const past = all.filter((a) => !upcoming.includes(a)).reverse();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Sessions"
        description={
          counselor
            ? `Book time to talk with ${counselor.full_name}, in person or online, whichever feels easier.`
            : "Book time to talk with your counselor."
        }
      />

      {!counselor ? (
        <Card>
          <EmptyState
            icon={<UserRoundSearch />}
            title="You don't have a counselor yet"
            description="Send a message first and we'll connect you with a counselor. Then you can book sessions here."
            action={
              <Button asChild>
                <Link href="/student/messages/new">Send a message</Link>
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {upcoming.length > 0 && (
            <Card>
              <CardHeader title="Coming up" />
              <CardBody className="space-y-3 pt-4">
                {upcoming.map((a) => (
                  <div key={a.id} className="flex flex-col gap-4 rounded-2xl border border-line p-4 sm:flex-row sm:items-center">
                    <div className="arch-sm flex h-[72px] w-16 shrink-0 flex-col items-center justify-center bg-primary text-primary-ink">
                      <span className="text-[11px] font-medium uppercase tracking-wide opacity-75">{formatWeekday(a.slot.starts_at, tz)}</span>
                      <span className="font-display text-2xl leading-none">{formatDate(a.slot.starts_at, tz).split(" ")[0]}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">
                        {dayLabel(a.slot.starts_at, tz)} · {timeRange(a.slot.starts_at, a.slot.ends_at, tz)}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-2">
                        <MapPin className="size-3.5 text-ink-3" />
                        {MODES[a.slot.mode]}
                        {a.slot.location ? ` · ${a.slot.location}` : ""}
                      </p>
                      {a.reason && <p className="mt-1.5 line-clamp-2 text-sm text-ink-3">“{a.reason}”</p>}
                    </div>
                    <CancelAppointmentButton appointmentId={a.id} who="student" />
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          <Card id="book" className="scroll-mt-24">
            <CardHeader title="Book a session" description="Pick a day, then a time. You can cancel any time before it starts." />
            <CardBody className="pt-5">
              {slots && slots.length > 0 ? (
                <SlotPicker slots={slots} tz={tz} counselorName={counselor.full_name} />
              ) : (
                <EmptyState
                  compact
                  icon={<CalendarX2 />}
                  title="No open times right now"
                  description={`${counselor.full_name.split(" ")[0]} hasn't opened any slots yet. Send a message and ask for a time that works for you.`}
                  action={
                    <Button asChild variant="secondary">
                      <Link href="/student/messages/new">Message your counselor</Link>
                    </Button>
                  }
                />
              )}
            </CardBody>
          </Card>

          {past.length > 0 && (
            <Card>
              <CardHeader title="Past sessions" />
              <CardBody className="pt-3">
                <ul className="divide-y divide-line">
                  {past.map((a) => (
                    <li key={a.id} className="py-4 first:pt-1 last:pb-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <CalendarDays className="mt-0.5 size-4 text-ink-3" />
                          <div>
                            <p className="text-sm font-medium text-ink">
                              {formatDate(a.slot.starts_at, tz, true)} · {timeRange(a.slot.starts_at, a.slot.ends_at, tz)}
                            </p>
                            <p className="text-xs text-ink-3">{MODES[a.slot.mode]}</p>
                            {a.status === "cancelled" && a.cancel_reason && (
                              <p className="mt-1 text-xs text-ink-3">Reason: {a.cancel_reason}</p>
                            )}
                          </div>
                        </div>
                        <Badge tone={a.status === "completed" ? "resolved" : a.status === "cancelled" ? "neutral" : "progress"}>
                          {a.status === "confirmed" ? "Awaiting update" : a.status === "completed" ? "Completed" : "Cancelled"}
                        </Badge>
                      </div>
                      {a.status === "completed" && !rated.has(a.id) && (
                        <div className="ml-7 mt-4 rounded-2xl bg-surface-2 p-4">
                          <p className="mb-2 text-sm font-medium text-ink">How did this session go?</p>
                          <FeedbackForm appointmentId={a.id} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
