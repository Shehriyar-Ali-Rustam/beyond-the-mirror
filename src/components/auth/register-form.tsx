"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, FileCheck2, GraduationCap, HeartHandshake, Sparkles } from "lucide-react";
import { useActionForm } from "@/hooks/use-action-form";
import { signUp } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EXPERTISE, EXPERTISE_AREAS, type ExpertiseArea } from "@/lib/expertise";
import { PasswordInput } from "./password-input";
import { FormMessage } from "./form-message";

export function RegisterForm({ initialRole }: { initialRole: "student" | "counselor" }) {
  const [role, setRole] = useState(initialRole);
  const [areas, setAreas] = useState<ExpertiseArea[]>([]);
  const [state, onSubmit, pending] = useActionForm(signUp);
  const fe = state && !state.ok ? state.fieldErrors : undefined;

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
              <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} className="sr-only" />
              <r.icon className="size-5" />
              {r.label}
            </label>
          ))}
        </div>
        {role === "counselor" && (
          <p className="mt-2.5 flex items-center gap-2 rounded-xl bg-lilac-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-2">
            <span className="shrink-0 rounded-full bg-coral-soft px-2 py-0.5 text-[11px] font-semibold text-[#b4452f]">Verification required</span>
            Complete your professional profile to apply.
          </p>
        )}
      </fieldset>

      <FormMessage state={state} />

      <Field label="Full name" htmlFor="fullName" error={fe?.fullName}>
        <Input id="fullName" name="fullName" autoComplete="name" required aria-invalid={!!fe?.fullName} />
      </Field>
      <Field label="Username" htmlFor="username" error={fe?.username} hint="You'll use this to log in. Letters, numbers, dots or underscores.">
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={24}
          placeholder="e.g. zara.ahmed"
          required
          aria-invalid={!!fe?.username}
        />
      </Field>
      <Field label="Password" htmlFor="password" error={fe?.password} hint="At least 8 characters, with a letter and a number.">
        <PasswordInput id="password" name="password" autoComplete="new-password" required aria-invalid={!!fe?.password} />
      </Field>

      {role === "student" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Year / grade" htmlFor="grade" optional error={fe?.grade}>
            <Input id="grade" name="grade" placeholder="Grade 10" maxLength={40} />
          </Field>
          <Field label="Class / section" htmlFor="section" optional error={fe?.section}>
            <Input id="section" name="section" placeholder="10-B" maxLength={40} />
          </Field>
          <Field label="Student ID" htmlFor="studentNumber" optional error={fe?.studentNumber} className="col-span-2">
            <Input id="studentNumber" name="studentNumber" placeholder="Roll / admission number" maxLength={40} />
          </Field>
        </div>
      ) : (
        <div className="space-y-5 rounded-3xl border border-line bg-surface-2/60 p-4 sm:p-5">
          <p className="text-sm font-semibold text-ink">Professional details</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Professional email *" htmlFor="email" error={fe?.email} hint="Only the administrator can see this.">
              <Input id="email" name="email" type="email" autoComplete="email" placeholder="example@gmail.com" required aria-invalid={!!fe?.email} />
            </Field>
            <Field label="Phone number *" htmlFor="phone" error={fe?.phone} hint="Only the administrator can see this.">
              <Input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+92 3XX XXXXXXX" required aria-invalid={!!fe?.phone} />
            </Field>
          </div>
          <Field label="Qualifications *" htmlFor="qualifications" error={fe?.qualifications}>
            <Input id="qualifications" name="qualifications" placeholder="Your degree or certification, e.g. MSc Clinical Psychology" maxLength={300} required aria-invalid={!!fe?.qualifications} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Experience (years) *" htmlFor="experienceYears" error={fe?.experienceYears}>
              <Input id="experienceYears" name="experienceYears" type="number" min={0} max={60} inputMode="numeric" placeholder="Years of experience" required aria-invalid={!!fe?.experienceYears} />
            </Field>
            <Field label="Job title" htmlFor="title" optional error={fe?.title}>
              <Input id="title" name="title" placeholder="e.g. School Counselor" maxLength={80} />
            </Field>
          </div>
          <Field label="Areas of expertise *" error={fe?.expertise} hint="Choose up to 6. Students are matched with you based on these.">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Areas of expertise">
              {EXPERTISE_AREAS.map((id) => {
                const on = areas.includes(id);
                return (
                  <label
                    key={id}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--ring)]",
                      on ? "border-primary bg-primary text-primary-ink" : "border-line-strong bg-surface text-ink-2 hover:border-ink-3",
                      !on && areas.length >= 6 && "pointer-events-none opacity-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      name="expertise"
                      value={id}
                      checked={on}
                      onChange={() => setAreas((a) => (on ? a.filter((x) => x !== id) : [...a, id]))}
                      className="sr-only"
                    />
                    {EXPERTISE[id].label}
                  </label>
                );
              })}
            </div>
          </Field>
          <div className="rounded-2xl bg-surface p-4">
            <p className="text-sm font-medium text-ink">Verification process</p>
            <ul className="mt-2.5 space-y-2 text-[13px] text-ink-2">
              <li className="flex items-center gap-2">
                <FileCheck2 className="size-4 text-[#1f8a6b]" /> The administrator verifies your qualifications.
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck className="size-4 text-primary" /> Only approved counselors are matched with students.
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="size-4 text-lilac" /> Smart matching connects students with the counselor best suited to their concern.
              </li>
            </ul>
          </div>
        </div>
      )}

      {role === "student" && (
        <Field label="Contact email" htmlFor="contactEmail" optional error={fe?.contactEmail} hint="Not needed to sign up. Only shared with your counselor if you add it.">
          <Input id="contactEmail" name="contactEmail" type="email" autoComplete="email" aria-invalid={!!fe?.contactEmail} />
        </Field>
      )}

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
        {role === "student" ? "Create student account" : "Submit application"}
      </Button>
    </form>
  );
}
