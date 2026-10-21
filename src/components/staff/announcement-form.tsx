"use client";

import { useActionForm } from "@/hooks/use-action-form";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { createAnnouncement } from "@/actions/announcements";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { ChipGroup } from "@/components/ui/chip";
import { FormMessage } from "@/components/auth/form-message";
import { AUDIENCES } from "@/lib/constants";
import type { Audience } from "@/lib/types";

export function AnnouncementForm({ audiences }: { audiences: Audience[] }) {
  const [state, onSubmit, pending] = useActionForm(createAnnouncement);
  const [audience, setAudience] = useState<Audience>(audiences[0]);
  const ref = useRef<HTMLFormElement>(null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Published");
      ref.current?.reset();
    }
  }, [state]);

  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-4">
      {state && !state.ok && <FormMessage state={state} />}
      <input type="hidden" name="audience" value={audience} />
      <Field label="Title" htmlFor="title" error={fe?.title}>
        <Input id="title" name="title" maxLength={120} placeholder="e.g. Drop-in hours during exam week" />
      </Field>
      <Field label="Message" htmlFor="body" error={fe?.body}>
        <Textarea id="body" name="body" maxLength={2000} rows={5} placeholder="Keep it short and practical." />
      </Field>
      <Field label="Who sees this">
        <ChipGroup name="audience-chip" size="sm" value={audience} onChange={setAudience} options={audiences.map((a) => ({ value: a, label: AUDIENCES[a] }))} />
      </Field>
      <label className="flex items-center gap-2.5 text-sm text-ink-2">
        <input type="checkbox" name="pinned" className="size-4 accent-[var(--primary)]" /> Pin to the top
      </label>
      <Button type="submit" loading={pending} className="w-full">
        <Megaphone /> Publish
      </Button>
    </form>
  );
}
