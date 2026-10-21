"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, CalendarDays, CheckCheck, MessageSquare, ShieldAlert, Star, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { markAllNotificationsRead, markNotificationRead } from "@/actions/notifications";
import { useRealtime } from "@/hooks/use-realtime";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, relativeTime } from "@/lib/utils";
import type { Notification } from "@/lib/types";

const ICONS: Record<string, typeof Bell> = {
  message: MessageSquare,
  status: CheckCheck,
  urgent: ShieldAlert,
  appointment: CalendarDays,
  feedback: Star,
  account: UserCheck,
  counselor_request: UserCheck,
};

export function NotificationBell({ userId, initialUnread }: { userId: string; initialUnread: number }) {
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);
    setItems(data ?? []);
  }, []);

  useRealtime<Notification>(`notifications:${userId}`, { table: "notifications", event: "INSERT", filter: `user_id=eq.${userId}` }, (payload) => {
    const n = payload.new as Notification;
    // Messages for the thread you're looking at are marked read there; don't nag.
    if (n.href && typeof window !== "undefined" && window.location.pathname === n.href) return;
    setUnread((u) => u + 1);
    setItems((prev) => (prev ? [n, ...prev].slice(0, 15) : prev));
    toast(n.title, {
      description: n.body ?? undefined,
      action: n.href ? { label: "Open", onClick: () => router.push(n.href!) } : undefined,
    });
    router.refresh();
  });

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) void load();
  };

  const markAll = async () => {
    setUnread(0);
    setItems((prev) => prev?.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })) ?? prev);
    await markAllNotificationsRead();
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        className="relative rounded-xl p-2 text-ink-2 transition hover:bg-surface-2 hover:text-ink data-[state=open]:bg-surface-2"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-clay px-1 text-[10px] font-semibold leading-4 text-white ring-2 ring-bg dark:text-bg">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[min(380px,calc(100vw-24px))]">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-semibold text-ink">Notifications</p>
          {unread > 0 && (
            <button onClick={markAll} className="text-xs font-medium text-primary hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <div className="scrollbar-thin max-h-[420px] overflow-y-auto p-1.5">
          {items === null ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="font-display text-base text-ink">All quiet</p>
              <p className="mt-1 text-sm text-ink-2">Replies, bookings and updates will show up here.</p>
            </div>
          ) : (
            <ul>
              {items.map((n) => {
                const Icon = ICONS[n.kind] ?? Bell;
                const inner = (
                  <div className={cn("flex gap-3 rounded-xl px-3 py-2.5 transition hover:bg-surface-2", !n.read_at && "bg-primary-soft/40")}>
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                        n.kind === "urgent" ? "bg-danger-soft text-danger" : "bg-surface-2 text-ink-2",
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-snug text-ink">{n.title}</span>
                      {n.body && <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-ink-2">{n.body}</span>}
                      <span className="mt-1 block text-xs text-ink-3">{relativeTime(n.created_at)}</span>
                    </span>
                    {!n.read_at && <span className="mt-2 size-2 shrink-0 rounded-full bg-clay" aria-label="Unread" />}
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link
                        href={n.href}
                        onClick={() => {
                          setOpen(false);
                          if (!n.read_at) {
                            setUnread((u) => Math.max(0, u - 1));
                            void markNotificationRead(n.id);
                          }
                        }}
                      >
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
