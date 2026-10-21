"use client";

import { useActionForm } from "@/hooks/use-action-form";
import { updatePassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import { FormMessage } from "@/components/auth/form-message";

export function PasswordForm() {
  const [state, onSubmit, pending] = useActionForm(updatePassword);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form onSubmit={onSubmit} className="space-y-4" key={state?.ok ? "done" : "form"}>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" htmlFor="password" error={fe?.password}>
          <PasswordInput id="password" name="password" autoComplete="new-password" />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm" error={fe?.confirm}>
          <PasswordInput id="confirm" name="confirm" autoComplete="new-password" />
        </Field>
      </div>
      <Button type="submit" variant="secondary" loading={pending}>
        Update password
      </Button>
    </form>
  );
}
