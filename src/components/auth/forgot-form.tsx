"use client";

import { useActionForm } from "@/hooks/use-action-form";
import { requestPasswordReset } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { FormMessage } from "./form-message";

export function ForgotForm() {
  const [state, onSubmit, pending] = useActionForm(requestPasswordReset);
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <FormMessage state={state} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Send reset link
      </Button>
    </form>
  );
}
