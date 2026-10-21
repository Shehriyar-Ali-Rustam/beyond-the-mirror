import { Megaphone, Pin } from "lucide-react";
import { formatDate } from "@/lib/time";
import type { Announcement } from "@/lib/types";

export function AnnouncementList({
  items,
  authors,
  tz,
  actions,
}: {
  items: Announcement[];
  authors: Record<string, string>;
  tz: string;
  actions?: (a: Announcement) => React.ReactNode;
}) {
  return (
    <ul className="divide-y divide-line">
      {items.map((a) => (
        <li key={a.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-clay-soft text-clay">
            {a.pinned ? <Pin className="size-4" /> : <Megaphone className="size-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium leading-snug text-ink">{a.title}</p>
              {actions?.(a)}
            </div>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-2">{a.body}</p>
            <p className="mt-2 text-xs text-ink-3">
              {authors[a.author_id] ?? "School team"} · {formatDate(a.created_at, tz)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
