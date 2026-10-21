import { Badge } from "@/components/ui/badge";
import { CATEGORIES, STATUSES, URGENCIES } from "@/lib/constants";
import type { Category, RequestStatus, Urgency } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, audience = "counselor" }: { status: RequestStatus; audience?: "student" | "counselor" }) {
  const s = STATUSES[status];
  return (
    <Badge tone={s.tone as "pending" | "progress" | "resolved"} dot>
      {audience === "student" ? s.studentLabel : s.label}
    </Badge>
  );
}

export function UrgencyBadge({ urgency, hideNormal = true }: { urgency: Urgency; hideNormal?: boolean }) {
  if (hideNormal && (urgency === "normal" || urgency === "low")) return null;
  return (
    <Badge tone={urgency === "urgent" ? "danger" : urgency === "high" ? "clay" : "neutral"}>
      {URGENCIES[urgency].label}
    </Badge>
  );
}

export function CategoryIcon({ category, className }: { category: Category; className?: string }) {
  const Icon = CATEGORIES[category].icon;
  return (
    <span
      className={cn(
        "arch-sm flex size-10 shrink-0 items-center justify-center bg-surface-2 text-ink-2 [&_svg]:size-[18px]",
        className,
      )}
      aria-hidden
    >
      <Icon />
    </span>
  );
}

export function CategoryLabel({ category }: { category: Category }) {
  return <span>{CATEGORIES[category].label}</span>;
}
