"use client";

import { useActionForm } from "@/hooks/use-action-form";
import { useState } from "react";
import { Star } from "lucide-react";
import { leaveFeedback } from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { FormMessage } from "@/components/auth/form-message";
import { cn } from "@/lib/utils";

const LABELS = ["", "Not really", "A little", "Somewhat", "Yes, it helped", "It really helped"];

export function FeedbackForm({ conversationId, appointmentId }: { conversationId?: string; appointmentId?: string }) {
  const [state, onSubmit, pending] = useActionForm(leaveFeedback);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  if (state?.ok) return <FormMessage state={state} />;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="conversationId" value={conversationId ?? ""} />
      <input type="hidden" name="appointmentId" value={appointmentId ?? ""} />
      <input type="hidden" name="rating" value={rating} />
      <div>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} – ${LABELS[n]}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              className="rounded-lg p-1 transition hover:scale-110"
            >
              <Star className={cn("size-7 transition", (hover || rating) >= n ? "fill-clay text-clay" : "text-line-strong")} />
            </button>
          ))}
        </div>
        <p className="mt-1 h-4 text-xs text-ink-3">{LABELS[hover || rating]}</p>
      </div>
      {rating > 0 && (
        <>
          <Textarea name="comment" rows={3} maxLength={1000} placeholder="Anything you'd like to add? (optional)" className="min-h-20 text-sm" />
          <FormMessage state={state} />
          <Button type="submit" size="sm" loading={pending}>
            Send feedback
          </Button>
        </>
      )}
    </form>
  );
}
