"use client";

import { useEffect, useState } from "react";
import { useActionForm } from "@/hooks/use-action-form";
import { AnimatePresence, motion } from "motion/react";
import { Send } from "lucide-react";
import { startConversation } from "@/actions/messages";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { FormMessage } from "@/components/auth/form-message";
import { SafetyNote } from "@/components/shared/safety-note";
import { WhatsAppIcon } from "@/components/shared/whatsapp-icon";
import { whatsappHref } from "@/components/shared/counselor-card";
import { CATEGORIES, CATEGORY_ORDER, URGENCIES } from "@/lib/constants";
import type { Category, Urgency } from "@/lib/types";
import { cn } from "@/lib/utils";

const PROMPTS = ["What's been happening?", "How is it affecting you?", "What would help right now?"];
const DRAFT_KEY = "btm:draft";

export function NewRequestForm({ initialCategory, whatsapp }: { initialCategory?: Category; whatsapp: string | null }) {
  const [state, onSubmit, pending] = useActionForm(startConversation);
  const [category, setCategory] = useState<Category>(initialCategory ?? "wellbeing");
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  // Pick up a draft handed over from a toolkit activity, or an unsent draft.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as Partial<{ subject: string; body: string; category: Category }>;
      /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from sessionStorage */
      if (d.subject) setSubject(d.subject);
      if (d.body) setBody(d.body);
      if (d.category && d.category in CATEGORIES) setCategory(d.category);
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (subject || body) sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ subject, body, category }));
    } catch {}
  }, [subject, body, category]);

  return (
    <form onSubmit={onSubmit}
      className="space-y-9"
    >
      <FormMessage state={state} />

      <fieldset>
        <legend className="text-[15px] font-semibold text-ink">
          <span className="mr-2 text-ink-3">1</span> What&apos;s it about?
        </legend>
        <input type="hidden" name="category" value={category} />
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CATEGORY_ORDER.map((key) => {
            const c = CATEGORIES[key];
            const active = category === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                aria-pressed={active}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition-all duration-200",
                  active
                    ? "border-primary bg-primary-soft shadow-sm"
                    : "border-line bg-surface hover:-translate-y-0.5 hover:border-line-strong hover:shadow-sm",
                )}
              >
                <c.icon className={cn("size-5", active ? "text-primary" : "text-ink-3")} />
                <span>
                  <span className="block text-sm font-medium text-ink">{c.label}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-ink-3">{c.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[15px] font-semibold text-ink">
          <span className="mr-2 text-ink-3">2</span> How soon do you need a reply?
        </legend>
        <input type="hidden" name="urgency" value={urgency} />
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(URGENCIES) as Urgency[]).map((key) => {
            const u = URGENCIES[key];
            const active = urgency === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setUrgency(key)}
                aria-pressed={active}
                className={cn(
                  "rounded-2xl border px-3.5 py-3 text-left transition-all duration-200",
                  active
                    ? key === "urgent"
                      ? "border-danger bg-danger-soft"
                      : "border-primary bg-primary-soft"
                    : "border-line bg-surface hover:border-line-strong",
                )}
              >
                <span className="block text-sm font-medium text-ink">{u.studentLabel}</span>
                <span className="mt-0.5 block text-xs leading-snug text-ink-3">{u.hint}</span>
              </button>
            );
          })}
        </div>
        <AnimatePresence>
          {urgency === "urgent" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <SafetyNote className="mt-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-4 text-[15px] font-semibold text-ink">
          <span className="mr-2 text-ink-3">3</span> Tell your counselor
        </legend>
        <Field label="In a few words" htmlFor="subject" error={fe?.subject}>
          <Input
            id="subject"
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={120}
            placeholder="e.g. Stressed about mock exams"
            aria-invalid={!!fe?.subject}
            required
          />
        </Field>
        <Field
          label="Your message"
          htmlFor="body"
          error={fe?.body}
          hint={
            <span className="flex justify-between gap-4">
              <span>Not sure where to start? Try: {PROMPTS.join(" · ")}</span>
              <span className="shrink-0 tabular-nums">{body.length}/4000</span>
            </span>
          }
        >
          <Textarea
            id="body"
            name="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
            rows={8}
            placeholder="Write it however it comes out…"
            aria-invalid={!!fe?.body}
            required
          />
        </Field>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        {whatsapp ? (
          <a
            href={whatsappHref(whatsapp, subject || body ? `${subject}\n\n${body}`.trim() : undefined)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-ink-2 hover:text-ink"
          >
            <WhatsAppIcon className="size-4" /> Prefer WhatsApp? Open this message there
          </a>
        ) : (
          <span className="text-sm text-ink-3">Your draft is kept in this tab until you send it.</span>
        )}
        <Button type="submit" size="lg" loading={pending}>
          <Send /> Send to counselor
        </Button>
      </div>
    </form>
  );
}
