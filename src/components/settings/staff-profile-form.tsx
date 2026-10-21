"use client";

import { useActionForm } from "@/hooks/use-action-form";
import { updateStaffProfile } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { FormMessage } from "@/components/auth/form-message";
import type { Profile } from "@/lib/types";

export function StaffProfileForm({ profile }: { profile: Profile }) {
  const [state, onSubmit, pending] = useActionForm(updateStaffProfile);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const counselor = profile.role === "counselor";
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="fullName" error={fe?.fullName}>
          <Input id="fullName" name="fullName" defaultValue={profile.full_name} maxLength={80} />
        </Field>
        <Field label="Username" hint="Used to log in.">
          <Input value={`@${profile.username}`} disabled readOnly />
        </Field>
        <Field label="Contact email" htmlFor="contactEmail" optional error={fe?.contactEmail}>
          <Input id="contactEmail" name="contactEmail" type="email" defaultValue={profile.email ?? ""} />
        </Field>
        <Field label="Title" htmlFor="title" optional error={fe?.title}>
          <Input id="title" name="title" defaultValue={profile.title ?? ""} maxLength={80} placeholder={counselor ? "e.g. Senior School Counselor" : "e.g. Head of Pastoral Care"} />
        </Field>
      </div>
      {counselor && (
        <>
          <Field label="About you" htmlFor="bio" optional error={fe?.bio} hint="Students see this on your profile card. A friendly line or two works best.">
            <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} maxLength={600} rows={4} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Usual reply hours" htmlFor="officeHours" optional error={fe?.officeHours}>
              <Input id="officeHours" name="officeHours" defaultValue={profile.office_hours ?? ""} maxLength={120} placeholder="e.g. Weekdays, 8:00–15:30" />
            </Field>
            <Field label="WhatsApp number" htmlFor="whatsapp" optional error={fe?.whatsapp} hint="Optional. Shown to your students as an extra way to reach you.">
              <Input id="whatsapp" name="whatsapp" defaultValue={profile.whatsapp ?? ""} placeholder="With country code, e.g. +1 555 010 0000" inputMode="tel" />
            </Field>
          </div>
          <Field label="Areas you help with" htmlFor="specialties" optional error={fe?.specialties} hint="Comma-separated, up to 8.">
            <Input id="specialties" name="specialties" defaultValue={profile.specialties.join(", ")} placeholder="Exam stress, Careers, Friendships" />
          </Field>
        </>
      )}
      <Button type="submit" loading={pending}>
        Save profile
      </Button>
    </form>
  );
}
