"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Flag, Send, Trash2, VenetianMask } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addComment, deleteComment, reportContent } from "@/actions/community";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/lib/supabase/database.types";
import { relativeTime } from "@/lib/utils";
import { AuthorBadge, type Viewer } from "./post-card";

type Comment = Database["public"]["Functions"]["community_comments"]["Returns"][number];

export function Comments({
  postId,
  viewer,
  advice,
  onCountChange,
}: {
  postId: string;
  viewer: Viewer;
  advice: boolean;
  onCountChange: (n: number) => void;
}) {
  const [items, setItems] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [pending, start] = useTransition();
  const staff = viewer.role !== "student";

  const load = useCallback(async () => {
    const { data } = await createClient().rpc("community_comments", { p_post: postId });
    setItems(data ?? []);
    onCountChange((data ?? []).length);
  }, [postId, onCountChange]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch replies when the thread opens
    void load();
  }, [load]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    start(async () => {
      const res = await addComment({ postId, body: text, anonymous });
      if (!res.ok) return void toast.error(res.error);
      setBody("");
      await load();
    });
  };

  const remove = (id: string) =>
    start(async () => {
      const res = await deleteComment(id);
      if (!res.ok) return void toast.error(res.error);
      await load();
    });

  const report = (id: string) =>
    start(async () => {
      const res = await reportContent({ postId, commentId: id });
      if (!res.ok) toast.error(res.error);
      else toast.success(res.message ?? "Reported");
    });

  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-surface-2/70 p-3 sm:p-4">
      {items === null ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : items.length === 0 ? (
        <p className="px-1 text-sm text-ink-3">{advice ? "No suggestions yet. Be the first to help." : "No replies yet."}</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((c) => (
            <li key={c.id} className={`group rounded-2xl bg-surface p-3 ${c.hidden ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <AuthorBadge name={c.author_name} hue={c.author_hue} role={c.author_role} anonymous={c.is_anonymous} mine={c.is_mine} />
                <div className="flex shrink-0 items-center gap-1 opacity-60 transition group-hover:opacity-100">
                  <span className="text-[11px] text-ink-3" suppressHydrationWarning>
                    {relativeTime(c.created_at)}
                  </span>
                  {!c.is_mine && (
                    <button onClick={() => report(c.id)} className="rounded-md p-1 text-ink-3 hover:text-warn" aria-label="Report reply" title="Report">
                      <Flag className="size-3.5" />
                    </button>
                  )}
                  {(c.is_mine || staff) && (
                    <button onClick={() => remove(c.id)} className="rounded-md p-1 text-ink-3 hover:text-danger" aria-label="Delete reply" title="Delete">
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words pl-[46px] text-sm leading-relaxed text-ink">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label htmlFor={`reply-${postId}`} className="sr-only">
          Your reply
        </label>
        <textarea
          id={`reply-${postId}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={1}
          maxLength={1000}
          placeholder={advice ? "Share a kind suggestion…" : "Write a reply…"}
          className="min-h-10 flex-1 resize-y rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:border-primary focus:outline-none focus:ring-4 focus:ring-[var(--ring)]"
        />
        <div className="flex items-center gap-2">
          {viewer.role === "student" && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-ink-2" title="Other students won't see your name">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="size-3.5 accent-[var(--lilac)]" />
              <VenetianMask className="size-3.5 text-lilac" /> Anonymous
            </label>
          )}
          <button
            type="submit"
            disabled={!body.trim() || pending}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-medium text-primary-ink transition hover:bg-primary-hover disabled:opacity-50"
          >
            <Send className="size-4" /> Reply
          </button>
        </div>
      </form>
    </div>
  );
}
