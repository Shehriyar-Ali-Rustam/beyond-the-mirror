"use client";

import { useActionForm } from "@/hooks/use-action-form";
import { updateStudentProfile } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { FormMessage } from "@/components/auth/form-message";

export function StudentProfileForm({ fullName, grade, email }: { fullName: string; grade: string | null; email: string }) {
  const [state, onSubmit, pending] = useActionForm(updateStudentProfile);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="fullName" error={fe?.fullName}>
          <Input id="fullName" name="fullName" defaultValue={fullName} maxLength={80} />
        </Field>
        <Field label="Year / grade" htmlFor="grade" optional error={fe?.grade}>
          <Input id="grade" name="grade" defaultValue={grade ?? ""} maxLength={40} />
        </Field>
      </div>
      <Field label="Email" hint="Contact your school if this needs to change.">
        <Input value={email} disabled readOnly />
      </Field>
      <Button type="submit" loading={pending}>
        Save changes
      </Button>
    </form>
  );
}
