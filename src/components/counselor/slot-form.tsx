"use client";

import { useActionForm } from "@/hooks/use-action-form";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { createSlots } from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { ChipGroup } from "@/components/ui/chip";
import { FormMessage } from "@/components/auth/form-message";
import { MODES } from "@/lib/constants";
import type { AppointmentMode } from "@/lib/types";

function localDate(offsetDays = 1) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SlotForm() {
  const [state, onSubmit, pending] = useActionForm(createSlots);
  const [mode, setMode] = useState<AppointmentMode>("in_person");
  const [tzOffset, setTzOffset] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser timezone is only known on the client
    setTzOffset(new Date().getTimezoneOffset());
  }, []);
  useEffect(() => {
    if (state?.ok) toast.success(state.message ?? "Saved");
  }, [state]);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      {state && !state.ok && <FormMessage state={state} />}
      <input type="hidden" name="tzOffset" value={tzOffset} />
      <input type="hidden" name="mode" value={mode} />
      <Field label="Date" htmlFor="date" error={fe?.date}>
        <Input id="date" name="date" type="date" defaultValue={localDate()} min={localDate(0)} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start" htmlFor="start" error={fe?.start}>
          <Input id="start" name="start" type="time" defaultValue="10:00" step={300} required />
        </Field>
        <Field label="End" htmlFor="end" error={fe?.end}>
          <Input id="end" name="end" type="time" defaultValue="10:30" step={300} required />
        </Field>
      </div>
      <Field label="How">
        <ChipGroup
          name="mode-chip"
          size="sm"
          value={mode}
          onChange={setMode}
          options={(Object.keys(MODES) as AppointmentMode[]).map((m) => ({ value: m, label: MODES[m] }))}
        />
      </Field>
      <Field label={mode === "in_person" ? "Room" : mode === "online" ? "Meeting link or note" : "Note"} htmlFor="location" optional>
        <Input id="location" name="location" maxLength={120} placeholder={mode === "in_person" ? "e.g. Counseling room, Block B" : "Shared after booking"} />
      </Field>
      <Field label="Repeat" htmlFor="repeatWeeks">
        <Select id="repeatWeeks" name="repeatWeeks" defaultValue="1">
          <option value="1">Just this once</option>
          {[2, 4, 6, 8, 12].map((n) => (
            <option key={n} value={n}>
              Weekly for {n} weeks
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" className="w-full" loading={pending}>
        <CalendarPlus /> Add time
      </Button>
    </form>
  );
}
