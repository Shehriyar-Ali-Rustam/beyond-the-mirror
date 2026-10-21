import Link from "next/link";
import { CATEGORIES } from "@/lib/constants";
import { shortStamp } from "@/lib/time";
import type { Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { CategoryIcon, StatusBadge, UrgencyBadge } from "./status";

export function ConversationRow({
  conversation: c,
  href,
  unread,
  tz,
  audience,
  person,
  active,
  youSentLast,
}: {
  conversation: Conversation;
  href: string;
  unread: boolean;
  tz: string;
  audience: "student" | "counselor";
  person?: { name: string; hue: number };
  active?: boolean;
  youSentLast?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex gap-3.5 rounded-2xl px-3 py-3.5 transition-colors sm:px-4",
        active ? "bg-primary-soft/60" : "hover:bg-surface-2",
      )}
    >
      {person ? <Avatar name={person.name} hue={person.hue} /> : <CategoryIcon category={c.category} />}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className={cn("truncate text-[15px]", unread ? "font-semibold text-ink" : "font-medium text-ink")}>
            {person ? person.name : c.subject}
          </p>
          <span className={cn("flex shrink-0 items-center gap-1.5 text-xs", unread ? "font-medium text-clay" : "text-ink-3")}>
            {shortStamp(c.last_message_at, tz)}
            {unread && <span className="size-2 rounded-full bg-clay" aria-label="Unread" />}
          </span>
        </div>
        {person && <p className="truncate text-sm font-medium text-ink-2">{c.subject}</p>}
        <p className={cn("mt-0.5 line-clamp-1 text-sm", unread ? "text-ink" : "text-ink-2")}>
          {youSentLast && <span className="text-ink-3">You: </span>}
          {c.last_message_preview}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={c.status} audience={audience} />
          <UrgencyBadge urgency={c.urgency} />
          {audience === "counselor" && (
            <span className="text-xs text-ink-3">· {CATEGORIES[c.category].label}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
