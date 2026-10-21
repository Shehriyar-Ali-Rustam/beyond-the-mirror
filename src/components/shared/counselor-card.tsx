import Link from "next/link";
import { CalendarPlus, Clock, MessageSquarePlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PRESENCE } from "@/lib/constants";
import type { CounselorPublic } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { WhatsAppIcon } from "./whatsapp-icon";

export function PresenceDot({ presence, className }: { presence: CounselorPublic["presence"]; className?: string }) {
  return (
    <span className={cn("relative inline-flex size-2.5", className)} aria-hidden>
      {presence === "available" && (
        <span className="absolute inset-0 animate-ping rounded-full bg-[var(--ok)] opacity-40" />
      )}
      <span className={cn("relative size-2.5 rounded-full", PRESENCE[presence].dot)} />
    </span>
  );
}

export function whatsappHref(number: string, text?: string) {
  const digits = number.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function CounselorCard({
  counselor,
  variant = "full",
  className,
}: {
  counselor: CounselorPublic;
  variant?: "full" | "compact";
  className?: string;
}) {
  return (
    <div className={cn("rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6", className)}>
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-3">Your counselor</p>
      <div className="mt-4 flex items-center gap-4">
        <Avatar name={counselor.full_name} hue={counselor.avatar_hue} size="lg" />
        <div className="min-w-0">
          <p className="font-display text-xl leading-tight text-ink">{counselor.full_name}</p>
          {counselor.title && <p className="text-sm text-ink-2">{counselor.title}</p>}
          <p className="mt-1.5 flex items-center gap-2 text-[13px] text-ink-2">
            <PresenceDot presence={counselor.presence} />
            {PRESENCE[counselor.presence].label}
          </p>
        </div>
      </div>

      {variant === "full" && counselor.bio && (
        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-ink-2">{counselor.bio}</p>
      )}
      {counselor.office_hours && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl bg-surface-2 px-3.5 py-2.5 text-[13px] text-ink-2">
          <Clock className="mt-0.5 size-3.5 shrink-0 text-ink-3" />
          <span>
            <span className="font-medium text-ink">Usually replies:</span> {counselor.office_hours}
          </span>
        </p>
      )}
      {variant === "full" && counselor.specialties.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {counselor.specialties.map((s) => (
            <span key={s} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-2">
              {s}
            </span>
          ))}
        </div>
      )}

      {variant === "full" && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/student/messages/new">
              <MessageSquarePlus /> Message
            </Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link href="/student/appointments#book">
              <CalendarPlus /> Book a session
            </Link>
          </Button>
          {counselor.whatsapp && (
            <Button asChild size="sm" variant="ghost">
              <a href={whatsappHref(counselor.whatsapp)} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon /> WhatsApp
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
