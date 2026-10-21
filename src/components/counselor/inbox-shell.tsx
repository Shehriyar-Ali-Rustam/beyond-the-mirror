"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Inbox, SearchX, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/hooks/use-realtime";
import { CATEGORIES, CATEGORY_ORDER, URGENCIES } from "@/lib/constants";
import type { Category, Conversation, Urgency } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ConversationRow } from "@/components/shared/conversation-row";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select } from "@/components/ui/input";

type Row = Conversation & { student: { id: string; full_name: string; avatar_hue: number } | null };
type View = "open" | "unread" | "pending" | "in_progress" | "resolved" | "all";

const VIEWS: { value: View; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "unread", label: "Unread" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
];

function isUnread(c: Conversation) {
  return c.last_message_sender === c.student_id && (!c.counselor_last_read_at || c.last_message_at > c.counselor_last_read_at);
}

export function InboxShell({ counselorId, tz, children }: { counselorId: string; tz: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const activeId = pathname.split("/")[3];
  const [rows, setRows] = useState<Row[] | null>(null);
  const [view, setView] = useState<View>("open");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [urgency, setUrgency] = useState<Urgency | "">("");
  const [sort, setSort] = useState<"recent" | "urgency" | "oldest">("recent");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("conversations")
      .select("*, student:profiles!conversations_student_id_fkey(id, full_name, avatar_hue)")
      .eq("counselor_id", counselorId)
      .order("last_message_at", { ascending: false })
      .limit(300);
    setRows((data as Row[]) ?? []);
  }, [counselorId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch from Supabase (external system)
    void load();
  }, [load]);

  useRealtime(`inbox:${counselorId}`, { table: "conversations", filter: `counselor_id=eq.${counselorId}` }, () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void load(), 300);
  });

  // Reflect "read" immediately when a thread is opened.
  useEffect(() => {
    if (!activeId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- optimistic read state for the opened thread
    setRows((prev) => prev?.map((r) => (r.id === activeId ? { ...r, counselor_last_read_at: new Date().toISOString() } : r)) ?? prev);
  }, [activeId]);

  const counts = useMemo(() => {
    const r = rows ?? [];
    return {
      open: r.filter((c) => c.status !== "resolved").length,
      unread: r.filter(isUnread).length,
      pending: r.filter((c) => c.status === "pending").length,
      in_progress: r.filter((c) => c.status === "in_progress").length,
      resolved: r.filter((c) => c.status === "resolved").length,
      all: r.length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rank: Record<Urgency, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
    return (rows ?? [])
      .filter((c) => {
        if (view === "open" && c.status === "resolved") return false;
        if (view === "unread" && !isUnread(c)) return false;
        if ((view === "pending" || view === "in_progress" || view === "resolved") && c.status !== view) return false;
        if (category && c.category !== category) return false;
        if (urgency && c.urgency !== urgency) return false;
        if (term && ![c.subject, c.student?.full_name, c.last_message_preview].some((s) => s?.toLowerCase().includes(term))) return false;
        return true;
      })
      .sort((a, b) =>
        sort === "urgency"
          ? rank[a.urgency] - rank[b.urgency] || b.last_message_at.localeCompare(a.last_message_at)
          : sort === "oldest"
            ? a.last_message_at.localeCompare(b.last_message_at)
            : b.last_message_at.localeCompare(a.last_message_at),
      );
  }, [rows, view, q, category, urgency, sort]);

  const filtersOn = Boolean(category || urgency || sort !== "recent");

  return (
    <div className="mx-auto grid h-[calc(100dvh-7.5rem)] min-h-[520px] max-w-[1500px] gap-5 sm:h-[calc(100dvh-8.5rem)] lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
      <section className={cn("min-h-0 flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-sm", activeId ? "hidden lg:flex" : "flex")}>
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl text-ink">Inbox</h1>
            <Popover>
              <PopoverTrigger className={cn("relative rounded-xl p-2 text-ink-2 transition hover:bg-surface-2", filtersOn && "text-primary")} aria-label="Filters and sorting">
                <SlidersHorizontal className="size-[18px]" />
                {filtersOn && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />}
              </PopoverTrigger>
              <PopoverContent className="w-72 space-y-3 p-4">
                <label className="block text-xs font-medium text-ink-3">
                  Topic
                  <Select value={category} onChange={(e) => setCategory(e.target.value as Category | "")} className="mt-1 h-10 text-sm">
                    <option value="">All topics</option>
                    {CATEGORY_ORDER.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORIES[c].label}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="block text-xs font-medium text-ink-3">
                  Urgency
                  <Select value={urgency} onChange={(e) => setUrgency(e.target.value as Urgency | "")} className="mt-1 h-10 text-sm">
                    <option value="">Any urgency</option>
                    {(Object.keys(URGENCIES) as Urgency[]).map((u) => (
                      <option key={u} value={u}>
                        {URGENCIES[u].label}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="block text-xs font-medium text-ink-3">
                  Sort by
                  <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="mt-1 h-10 text-sm">
                    <option value="recent">Most recent activity</option>
                    <option value="urgency">Most urgent first</option>
                    <option value="oldest">Waiting longest</option>
                  </Select>
                </label>
                {filtersOn && (
                  <button
                    onClick={() => {
                      setCategory("");
                      setUrgency("");
                      setSort("recent");
                    }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Reset filters
                  </button>
                )}
              </PopoverContent>
            </Popover>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search students, subjects, messages"
            aria-label="Search conversations"
            className="h-10 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-sm text-ink placeholder:text-ink-3 focus:border-primary focus:outline-none focus:ring-4 focus:ring-[var(--ring)]"
          />
          <div role="tablist" className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1">
            {VIEWS.map((v) => (
              <button
                key={v.value}
                role="tab"
                aria-selected={view === v.value}
                onClick={() => setView(v.value)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium transition",
                  view === v.value ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2",
                )}
              >
                {v.label}
                <span className={cn("text-[11px]", view === v.value ? "opacity-70" : "text-ink-3")}>{rows ? counts[v.value] : ""}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-2">
          {rows === null ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            q || filtersOn ? (
              <EmptyState compact icon={<SearchX />} title="No matches" description="Try a different search or clear the filters." />
            ) : (
              <EmptyState compact icon={<Inbox />} title={view === "unread" ? "No unread messages" : "Nothing here"} description="New requests from your students will appear here in real time." />
            )
          ) : (
            <div className="space-y-0.5">
              {filtered.map((c) => (
                <ConversationRow
                  key={c.id}
                  conversation={c}
                  href={`/counselor/inbox/${c.id}`}
                  unread={isUnread(c)}
                  tz={tz}
                  audience="counselor"
                  person={c.student ? { name: c.student.full_name, hue: c.student.avatar_hue } : undefined}
                  active={c.id === activeId}
                  youSentLast={c.last_message_sender === counselorId}
                />
              ))}
            </div>
          )}
        </div>
      </section>
      <section className={cn("min-h-0 flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-sm", activeId ? "flex" : "hidden lg:flex")}>
        {children}
      </section>
    </div>
  );
}
