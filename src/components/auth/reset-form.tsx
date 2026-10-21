"use client";

import { useActionForm } from "@/hooks/use-action-form";
import Link from "next/link";
import { updatePassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { PasswordInput } from "./password-input";
import { FormMessage } from "./form-message";

export function ResetForm() {
  const [state, onSubmit, pending] = useActionForm(updatePassword);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  if (state?.ok) {
    return (
      <div className="space-y-5">
        <FormMessage state={state} />
        <Button asChild size="lg" className="w-full">
          <Link href="/login">Continue</Link>
        </Button>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <FormMessage state={state} />
      <Field label="New password" htmlFor="password" error={fe?.password} hint="At least 8 characters, with a letter and a number.">
        <PasswordInput id="password" name="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirm password" htmlFor="confirm" error={fe?.confirm}>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Update password
      </Button>
    </form>
  );
}
