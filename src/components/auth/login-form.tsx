"use client";

import { useActionForm } from "@/hooks/use-action-form";
import Link from "next/link";
import { signIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { PasswordInput } from "./password-input";
import { FormMessage } from "./form-message";

export function LoginForm({ next }: { next: string }) {
  const [state, onSubmit, pending] = useActionForm(signIn);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next} />
      <Field label="Username" htmlFor="username" error={fe?.username}>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-invalid={!!fe?.username}
        />
      </Field>
      <Field label="Password" htmlFor="password" error={fe?.password}>
        <PasswordInput id="password" name="password" autoComplete="current-password" required aria-invalid={!!fe?.password} />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-ink-2 hover:text-primary">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Log in
      </Button>
    </form>
  );
}
