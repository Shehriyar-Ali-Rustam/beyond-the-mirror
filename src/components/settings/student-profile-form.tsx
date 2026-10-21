"use client";

import { useActionForm } from "@/hooks/use-action-form";
import { updateStudentProfile } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { FormMessage } from "@/components/auth/form-message";
import type { Profile } from "@/lib/types";

export function StudentProfileForm({ profile }: { profile: Profile }) {
  const [state, onSubmit, pending] = useActionForm(updateStudentProfile);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="fullName" error={fe?.fullName}>
          <Input id="fullName" name="fullName" defaultValue={profile.full_name} maxLength={80} />
        </Field>
        <Field label="Username" hint="Used to log in. Ask the school admin if it needs to change.">
          <Input value={`@${profile.username}`} disabled readOnly />
        </Field>
        <Field label="Year / grade" htmlFor="grade" optional error={fe?.grade}>
          <Input id="grade" name="grade" defaultValue={profile.grade ?? ""} maxLength={40} />
        </Field>
        <Field label="Class / section" htmlFor="section" optional error={fe?.section}>
          <Input id="section" name="section" defaultValue={profile.section ?? ""} maxLength={40} />
        </Field>
        <Field label="Student ID" htmlFor="studentNumber" optional error={fe?.studentNumber}>
          <Input id="studentNumber" name="studentNumber" defaultValue={profile.student_number ?? ""} maxLength={40} />
        </Field>
        <Field label="Contact email" htmlFor="contactEmail" optional error={fe?.contactEmail} hint="Only your counselor sees this.">
          <Input id="contactEmail" name="contactEmail" type="email" defaultValue={profile.email ?? ""} />
        </Field>
      </div>
      <Button type="submit" loading={pending}>
        Save changes
      </Button>
    </form>
  );
}
