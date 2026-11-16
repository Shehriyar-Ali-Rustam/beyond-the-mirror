"use client";

import { useState } from "react";
import { BadgeCheck, Clock3, Info } from "lucide-react";
import { useActionForm } from "@/hooks/use-action-form";
import { saveCredentials } from "@/actions/profile";
import { EXPERTISE, EXPERTISE_AREAS, type ExpertiseArea } from "@/lib/expertise";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { FormMessage } from "@/components/auth/form-message";

export type Credentials = {
  qualifications: string;
  experience_years: number;
  email: string;
  phone: string;
  expertise: string[];
  verified_at: string | null;
} | null;

export function CredentialsForm({ credentials }: { credentials: Credentials }) {
  const [state, onSubmit, pending] = useActionForm(saveCredentials);
  const [areas, setAreas] = useState<ExpertiseArea[]>((credentials?.expertise ?? []) as ExpertiseArea[]);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {!credentials ? (
        <p className="flex gap-2 rounded-2xl bg-warn-soft p-3.5 text-sm text-warn">
          <Info className="mt-0.5 size-4 shrink-0" />
          Add your professional details so students with the right concerns can be matched with you. Until then you&apos;re matched as a
          general counselor.
        </p>
      ) : credentials.verified_at ? (
        <p className="flex items-center gap-2 rounded-2xl bg-ok-soft p-3.5 text-sm text-ok">
          <BadgeCheck className="size-4 shrink-0" /> Verified. Students are matched with you based on these details.
        </p>
      ) : (
        <p className="flex gap-2 rounded-2xl bg-lilac-soft p-3.5 text-sm text-ink-2">
          <Clock3 className="mt-0.5 size-4 shrink-0 text-lilac" />
          Waiting for the administrator to verify. You keep your current students, but new students won&apos;t be matched with you until
          then.
        </p>
      )}
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Professional email" htmlFor="cred-email" error={fe?.email} hint="Visible to the administrator only.">
          <Input id="cred-email" name="email" type="email" defaultValue={credentials?.email ?? ""} required />
        </Field>
        <Field label="Phone number" htmlFor="cred-phone" error={fe?.phone} hint="Visible to the administrator only.">
          <Input id="cred-phone" name="phone" type="tel" inputMode="tel" defaultValue={credentials?.phone ?? ""} placeholder="+92 3XX XXXXXXX" required />
        </Field>
      </div>
      <Field label="Qualifications" htmlFor="cred-q" error={fe?.qualifications}>
        <Input id="cred-q" name="qualifications" defaultValue={credentials?.qualifications ?? ""} maxLength={300} placeholder="e.g. MSc Clinical Psychology" required />
      </Field>
      <Field label="Experience (years)" htmlFor="cred-x" error={fe?.experienceYears} className="sm:max-w-[50%]">
        <Input id="cred-x" name="experienceYears" type="number" min={0} max={60} defaultValue={credentials?.experience_years ?? ""} required />
      </Field>
      <Field label="Areas of expertise" error={fe?.expertise} hint="Up to 6. Changing your qualifications, experience or areas needs a quick re-check by the administrator.">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Areas of expertise">
          {EXPERTISE_AREAS.map((id) => {
            const on = areas.includes(id);
            return (
              <label
                key={id}
                className={cn(
                  "inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-[13px] transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--ring)]",
                  on ? "border-primary bg-primary text-primary-ink" : "border-line-strong bg-surface text-ink-2 hover:border-ink-3",
                  !on && areas.length >= 6 && "pointer-events-none opacity-50",
                )}
              >
                <input type="checkbox" name="expertise" value={id} checked={on} onChange={() => setAreas((a) => (on ? a.filter((x) => x !== id) : [...a, id]))} className="sr-only" />
                {EXPERTISE[id].label}
              </label>
            );
          })}
        </div>
      </Field>
      <Button type="submit" loading={pending}>
        Save professional details
      </Button>
    </form>
  );
}
