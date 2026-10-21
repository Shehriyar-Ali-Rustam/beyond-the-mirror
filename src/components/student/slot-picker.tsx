"use client";

import { useActionForm } from "@/hooks/use-action-form";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarCheck, MapPin, Monitor, Phone } from "lucide-react";
import { bookAppointment } from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { FormMessage } from "@/components/auth/form-message";
import { MODES } from "@/lib/constants";
import { dayKey, dayLabel, formatDate, formatTime, formatWeekday, timeRange } from "@/lib/time";
import type { Slot } from "@/lib/types";
import { cn } from "@/lib/utils";

const MODE_ICON = { in_person: MapPin, online: Monitor, phone: Phone };

export function SlotPicker({ slots, tz, counselorName }: { slots: Slot[]; tz: string; counselorName: string }) {
  const days = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const k = dayKey(s.starts_at, tz);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return [...map.entries()];
  }, [slots, tz]);

  const [day, setDay] = useState(days[0]?.[0]);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [state, onSubmit, pending] = useActionForm(bookAppointment);
  const selected = slots.find((s) => s.id === slotId);
  const daySlots = days.find(([k]) => k === day)?.[1] ?? [];

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-ok-soft text-ok">
          <CalendarCheck className="size-6" />
        </span>
        <p className="mt-4 font-display text-xl text-ink">You&apos;re booked in</p>
        <p className="mt-1 text-sm text-ink-2">{state.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="scrollbar-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Choose a day">
        {days.map(([k, list]) => {
          const active = k === day;
          return (
            <button
              key={k}
              role="tab"
              aria-selected={active}
              onClick={() => {
                setDay(k);
                setSlotId(null);
              }}
              className={cn(
                "flex w-[76px] shrink-0 flex-col items-center rounded-2xl border px-2 py-3 transition",
                active ? "border-primary bg-primary text-primary-ink shadow-sm" : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <span className={cn("text-[11px] font-medium uppercase tracking-wide", active ? "opacity-80" : "text-ink-3")}>
                {formatWeekday(list[0].starts_at, tz)}
              </span>
              <span className="mt-0.5 font-display text-xl leading-tight">{formatDate(list[0].starts_at, tz).split(" ")[0]}</span>
              <span className={cn("text-[11px]", active ? "opacity-80" : "text-ink-3")}>{formatDate(list[0].starts_at, tz).split(" ")[1]}</span>
            </button>
          );
        })}
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-ink">{day && daySlots[0] ? dayLabel(daySlots[0].starts_at, tz) : ""}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {daySlots.map((s) => {
            const Icon = MODE_ICON[s.mode];
            const active = s.id === slotId;
            return (
              <button
                key={s.id}
                onClick={() => setSlotId(s.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-2xl border px-3 py-3 text-left transition",
                  active ? "border-primary bg-primary-soft ring-4 ring-[var(--ring)]" : "border-line hover:border-line-strong",
                )}
              >
                <span className="block font-medium tabular-nums text-ink">{formatTime(s.starts_at, tz)}</span>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-3">
                  <Icon className="size-3" /> {MODES[s.mode]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.form
            key={selected.id}
            onSubmit={onSubmit}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4 rounded-2xl border border-line bg-surface-2 p-5"
          >
            <input type="hidden" name="slotId" value={selected.id} />
            <div>
              <p className="font-medium text-ink">
                {dayLabel(selected.starts_at, tz)}, {timeRange(selected.starts_at, selected.ends_at, tz)} with {counselorName}
              </p>
              <p className="mt-0.5 text-sm text-ink-2">
                {MODES[selected.mode]}
                {selected.location ? ` · ${selected.location}` : ""}
              </p>
            </div>
            <div>
              <label htmlFor="reason" className="text-sm font-medium text-ink">
                Anything you&apos;d like them to know beforehand? <span className="font-normal text-ink-3">(optional)</span>
              </label>
              <Textarea id="reason" name="reason" rows={3} maxLength={500} className="mt-1.5 min-h-20 bg-surface" placeholder="e.g. I'd like to talk about subject choices" />
            </div>
            <FormMessage state={state} />
            <Button type="submit" loading={pending}>
              <CalendarCheck /> Confirm booking
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
