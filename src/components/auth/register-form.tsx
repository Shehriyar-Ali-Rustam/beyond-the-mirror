"use client";

import { useActionForm } from "@/hooks/use-action-form";
import { useState } from "react";
import Link from "next/link";
import { GraduationCap, HeartHandshake } from "lucide-react";
import { signUp } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PasswordInput } from "./password-input";
import { FormMessage } from "./form-message";

export function RegisterForm({ initialRole }: { initialRole: "student" | "counselor" }) {
  const [role, setRole] = useState(initialRole);
  const [state, onSubmit, pending] = useActionForm(signUp);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  if (state?.ok && state.message) {
    return (
      <div className="space-y-4">
        <FormMessage state={state} />
        <p className="text-sm text-ink-2">You can close this tab — the link will bring you straight back.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">I am a…</legend>
        <div className="grid grid-cols-2 gap-2.5">
          {(
            [
              { value: "student", label: "Student", icon: GraduationCap },
              { value: "counselor", label: "Counselor", icon: HeartHandshake },
            ] as const
          ).map((r) => (
            <label
              key={r.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm font-medium transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--ring)]",
                role === r.value
                  ? "border-primary bg-primary-soft text-primary-soft-ink"
                  : "border-line-strong bg-surface text-ink-2 hover:border-ink-3",
              )}
            >
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={role === r.value}
                onChange={() => setRole(r.value)}
                className="sr-only"
              />
              <r.icon className="size-5" />
              {r.label}
            </label>
          ))}
        </div>
        {role === "counselor" && (
          <p className="mt-2.5 rounded-xl bg-lilac-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-2">
            Counselor accounts are reviewed by a school administrator before they can see any student
            messages.
          </p>
        )}
      </fieldset>

      <FormMessage state={state} />

      <Field label="Full name" htmlFor="fullName" error={fe?.fullName}>
        <Input id="fullName" name="fullName" autoComplete="name" required aria-invalid={!!fe?.fullName} />
      </Field>
      <Field label="School email" htmlFor="email" error={fe?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fe?.email} />
      </Field>
      {role === "student" && (
        <Field label="Year / grade" htmlFor="grade" optional error={fe?.grade}>
          <Input id="grade" name="grade" placeholder="e.g. Grade 10" />
        </Field>
      )}
      <Field
        label="Password"
        htmlFor="password"
        error={fe?.password}
        hint="At least 8 characters, with a letter and a number."
      >
        <PasswordInput id="password" name="password" autoComplete="new-password" required aria-invalid={!!fe?.password} />
      </Field>

      <Field error={fe?.agree}>
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink-2">
          <input type="checkbox" name="agree" className="mt-1 size-4 accent-[var(--primary)]" />
          <span>
            I understand how{" "}
            <Link href="/#privacy" target="_blank" className="text-primary underline-offset-2 hover:underline">
              privacy and confidentiality
            </Link>{" "}
            work here, including when a counselor may need to involve others to keep someone safe.
          </span>
        </label>
      </Field>

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {role === "student" ? "Create student account" : "Request counselor access"}
      </Button>
    </form>
  );
}
