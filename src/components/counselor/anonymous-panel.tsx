import { ShieldQuestion, VenetianMask } from "lucide-react";

/** Side panel for anonymous conversations: no identity, no case notes. */
export function AnonymousPanel() {
  return (
    <div className="space-y-5 p-5">
      <div className="flex flex-col items-center pt-4 text-center">
        <span className="arch flex h-24 w-20 items-center justify-center bg-gradient-to-b from-lilac-soft to-sky-soft text-lilac">
          <VenetianMask className="size-8" />
        </span>
        <p className="mt-3 font-display text-xl text-ink">Anonymous student</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">
          This student chose not to share their name. They can reveal it at any time, and you&apos;ll be notified.
        </p>
      </div>
      <div className="rounded-2xl bg-surface-2 p-4 text-sm leading-relaxed text-ink-2">
        <p className="flex items-center gap-2 font-medium text-ink">
          <ShieldQuestion className="size-4 text-clay" /> If you&apos;re worried about their safety
        </p>
        <p className="mt-1.5">
          Gently encourage them to share their name or speak to a trusted adult, and remind them how to reach emergency
          help. Private notes aren&apos;t available on anonymous conversations.
        </p>
      </div>
    </div>
  );
}
