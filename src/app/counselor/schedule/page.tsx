import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTz } from "@/lib/tz";
import { MODES } from "@/lib/constants";
import { dayKey, dayLabel, formatDate, formatTime, timeRange } from "@/lib/time";
import { PageHero } from "@/components/visual/page-hero";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { SlotForm } from "@/components/counselor/slot-form";
import { DeleteSlotButton, CompleteAppointmentButton } from "@/components/counselor/schedule-actions";
import { CancelAppointmentButton } from "@/components/shared/cancel-appointment";

export const metadata: Metadata = { title: "Schedule" };

export default async function CounselorSchedule() {
  const viewer = await requireRole("counselor");
  const supabase = await createClient();
  const tz = await getTz();
  const now = new Date().getTime();
  const since = new Date(now - 14 * 86_400_000).toISOString();

  const [{ data: slots }, { data: appts }] = await Promise.all([
    supabase.from("availability_slots").select("*").eq("counselor_id", viewer.id).gt("ends_at", since).order("starts_at").limit(300),
    supabase
      .from("appointments")
      .select("*, slot:availability_slots!inner(starts_at, ends_at, mode, location), student:profiles!appointments_student_id_fkey(id, full_name, avatar_hue, grade)")
      .eq("counselor_id", viewer.id)
      .eq("status", "confirmed")
      .gt("slot.ends_at", since)
      .limit(200),
  ]);

  const booked = new Set((appts ?? []).map((a) => a.slot_id));
  const sorted = (appts ?? []).sort((a, b) => a.slot.starts_at.localeCompare(b.slot.starts_at));
  const upcoming = sorted.filter((a) => Date.parse(a.slot.ends_at) > now);
  const toClose = sorted.filter((a) => Date.parse(a.slot.ends_at) <= now);
  const open = (slots ?? []).filter((s) => !booked.has(s.id) && Date.parse(s.starts_at) > now);
  const openByDay = open.reduce<Record<string, typeof open>>((acc, s) => {
    const k = dayKey(s.starts_at, tz);
    (acc[k] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-6xl">
      <PageHero illustration="calendar" tone="sky" title="Schedule" description="Open times students can book, and the sessions they've booked with you." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          {toClose.length > 0 && (
            <Card className="border-warn/30">
              <CardHeader title="How did these go?" description="Mark finished sessions complete. Students will be invited to leave feedback." />
              <CardBody className="space-y-2 pt-4">
                {toClose.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-warn-soft/50 p-3">
                    <Avatar name={a.student?.full_name ?? "Student"} hue={a.student?.avatar_hue} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{a.student?.full_name}</p>
                      <p className="text-xs text-ink-3">
                        {formatDate(a.slot.starts_at, tz)} · {timeRange(a.slot.starts_at, a.slot.ends_at, tz)}
                      </p>
                    </div>
                    <CompleteAppointmentButton appointmentId={a.id} />
                    <CancelAppointmentButton appointmentId={a.id} who="counselor" />
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Booked sessions" description={`${upcoming.length} upcoming`} />
            <CardBody className="pt-4">
              {upcoming.length ? (
                <ul className="space-y-3">
                  {upcoming.map((a) => (
                    <li key={a.id} className="flex flex-col gap-3 rounded-2xl border border-line p-4 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <Avatar name={a.student?.full_name ?? "Student"} hue={a.student?.avatar_hue} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">
                            {a.student?.full_name}
                            {a.student?.grade && <span className="font-normal text-ink-3"> · {a.student.grade}</span>}
                          </p>
                          <p className="text-sm text-ink-2">
                            {dayLabel(a.slot.starts_at, tz)} · {timeRange(a.slot.starts_at, a.slot.ends_at, tz)}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-3">
                            <MapPin className="size-3" /> {MODES[a.slot.mode]}
                            {a.slot.location ? ` · ${a.slot.location}` : ""}
                          </p>
                          {a.reason && <p className="mt-1.5 text-sm italic text-ink-2">“{a.reason}”</p>}
                        </div>
                      </div>
                      <CancelAppointmentButton appointmentId={a.id} who="counselor" />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact illustration="booked" title="No sessions booked yet" description="When students book one of your open times, it shows up here and you'll get a notification." />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Open times" description={`${open.length} available to your students`} />
            <CardBody className="pt-4">
              {open.length ? (
                <div className="space-y-5">
                  {Object.entries(openByDay).map(([k, list]) => (
                    <div key={k}>
                      <p className="mb-2 text-sm font-medium text-ink">{dayLabel(list[0].starts_at, tz)}</p>
                      <div className="flex flex-wrap gap-2">
                        {list.map((s) => (
                          <span key={s.id} className="group inline-flex items-center gap-2 rounded-xl border border-line bg-surface py-1.5 pl-3 pr-1.5 text-sm">
                            <span className="tabular-nums text-ink">
                              {formatTime(s.starts_at, tz)}–{formatTime(s.ends_at, tz)}
                            </span>
                            <span className="text-xs text-ink-3">{MODES[s.mode]}</span>
                            <DeleteSlotButton slotId={s.id} />
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState compact illustration="calendar" title="No open times" description="Add a few slots so your students can book a session." />
              )}
            </CardBody>
          </Card>
        </div>

        <aside>
          <Card className="lg:sticky lg:top-24">
            <CardHeader title="Add availability" description="Times are in your local timezone." />
            <CardBody>
              <SlotForm />
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
