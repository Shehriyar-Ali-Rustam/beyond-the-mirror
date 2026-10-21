"use client";

import { useState, useTransition } from "react";
import { AnimatePresence } from "motion/react";
import { Loader2 } from "lucide-react";
import { loadMorePosts } from "@/actions/community";
import { Button } from "@/components/ui/button";
import { Illustration } from "@/components/visual/illustration";
import type { Post } from "@/lib/community";
import { cn } from "@/lib/utils";
import { PostCard, type Viewer } from "./post-card";

type Filter = "all" | "advice" | "share";

export function Feed({ initialPosts, viewer }: { initialPosts: Post[]; viewer: Viewer }) {
  // New posts arrive via a server re-render; key the list on the newest post.
  return <FeedList key={initialPosts[0]?.id ?? "empty"} initialPosts={initialPosts} viewer={viewer} />;
}

function FeedList({ initialPosts, viewer }: { initialPosts: Post[]; viewer: Viewer }) {
  const [posts, setPosts] = useState(initialPosts);
  const [done, setDone] = useState(initialPosts.length < 15);
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, start] = useTransition();

  const more = () =>
    start(async () => {
      const last = posts[posts.length - 1];
      if (!last) return;
      const next = await loadMorePosts(last.created_at);
      setPosts((p) => [...p, ...next.filter((n) => !p.some((x) => x.id === n.id))]);
      if (next.length < 15) setDone(true);
    });

  const shown = posts.filter((p) => filter === "all" || p.kind === filter);

  return (
    <div className="space-y-4">
      <div role="tablist" className="flex gap-1.5">
        {(
          [
            { value: "all", label: "Everything" },
            { value: "advice", label: "Asking for advice" },
            { value: "share", label: "Sharing" },
          ] as const
        ).map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={filter === t.value}
            onClick={() => setFilter(t.value)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
              filter === t.value ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
          <Illustration name="online-community" className="w-44" />
          <p className="mt-4 font-display text-xl text-ink">It&apos;s quiet here</p>
          <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-2">
            Ask for advice, share a small win, or post something that might help someone else.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {shown.map((p) => (
              <PostCard key={p.id} post={p} viewer={viewer} onRemoved={(id) => setPosts((all) => all.filter((x) => x.id !== id))} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {!done && posts.length > 0 && (
        <div className="flex justify-center pt-2">
          <Button variant="secondary" onClick={more} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} Load more
          </Button>
        </div>
      )}
    </div>
  );
}
