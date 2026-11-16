"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Eye, EyeOff, Flag, Loader2, MessageCircle, Send, ShieldCheck, Trash2, VenetianMask } from "lucide-react";
import {
  addGratitudeComment,
  createGratitudePost,
  deleteGratitudeComment,
  deleteGratitudePost,
  loadGratitude,
  loadGratitudeComments,
  moderateGratitudeComment,
  moderateGratitudePost,
  reactGratitude,
  reportGratitudePost,
  type GratitudeComment,
  type GratitudePost,
} from "@/actions/gratitude";
import { GRATITUDE_CATEGORIES, GRATITUDE_REACTIONS, type GratitudeCategory, type GratitudeReaction } from "@/lib/wellbeing";
import type { Role } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip } from "./shell";

function Composer({ onPosted }: { onPosted: () => void }) {
  const [category, setCategory] = useState<GratitudeCategory>("small_moments");
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [pending, start] = useTransition();
  const submit = () =>
    start(async () => {
      const r = await createGratitudePost({ category, body, anonymous, allowComments });
      if (!r.ok) return void toast.error(r.error);
      if (r.data?.status === "held") toast("Thanks for sharing", { description: "Your post will appear once a counselor has had a quick look at it." });
      else toast.success("Shared on the wall");
      setBody("");
      onPosted();
    });
  return (
    <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6">
      <p className="font-display text-xl text-ink">Share something you appreciate</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(Object.keys(GRATITUDE_CATEGORIES) as GratitudeCategory[]).map((c) => (
          <Chip key={c} on={category === c} onClick={() => setCategory(c)} className="py-1 text-xs">
            <span aria-hidden>{GRATITUDE_CATEGORIES[c].emoji}</span> {GRATITUDE_CATEGORIES[c].label}
          </Chip>
        ))}
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={600}
        placeholder="A person who supported you, something you achieved, a small moment that made your day better…"
        className="mt-3 min-h-24"
      />
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-2">
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="size-4 accent-[var(--primary)]" />
          <VenetianMask className="size-4 text-lilac" /> Post anonymously
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)} className="size-4 accent-[var(--primary)]" />
          Allow supportive comments
        </label>
        <span className="ml-auto text-xs text-ink-3">{body.length}/600</span>
      </div>
      <p className="mt-2 text-xs text-ink-3">Please don&apos;t include names, contact details or anything that could identify someone else.</p>
      <Button className="mt-3" onClick={submit} loading={pending} disabled={body.trim().length < 3}>
        <Send /> Share
      </Button>
    </section>
  );
}

function Comments({ post, staff }: { post: GratitudePost; staff: boolean }) {
  const [items, setItems] = useState<GratitudeComment[] | null>(null);
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [pending, start] = useTransition();
  const load = () => start(async () => setItems(await loadGratitudeComments(post.id)));
  if (items === null)
    return (
      <button onClick={load} className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
        {post.comment_count ? `${post.comment_count} ${post.comment_count === 1 ? "comment" : "comments"}` : "Comment"}
      </button>
    );
  return (
    <div className="mt-3 space-y-2 border-t border-line pt-3">
      {items.map((c) => (
        <div key={c.id} className={cn("flex gap-2.5 text-sm", c.hidden && "opacity-50")}>
          {c.author_name ? <Avatar name={c.author_name} hue={c.author_hue} size="xs" /> : <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-lilac-soft text-[10px]">🙂</span>}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-3">
              {c.author_name ?? "Anonymous"} · {relativeTime(c.created_at)}
              {c.hidden && " · hidden"}
            </p>
            <p className="text-ink-2">{c.body}</p>
          </div>
          {(c.is_mine || staff) && (
            <span className="flex">
              {staff && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={c.hidden ? "Show comment" : "Hide comment"}
                  onClick={() => start(async () => {
                    const r = await moderateGratitudeComment(c.id, !c.hidden);
                    if (r.ok) setItems((x) => x!.map((y) => (y.id === c.id ? { ...y, hidden: !c.hidden } : y)));
                  })}
                >
                  {c.hidden ? <Eye /> : <EyeOff />}
                </Button>
              )}
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Delete comment"
                onClick={() =>
                  start(async () => {
                    const r = await deleteGratitudeComment(c.id);
                    if (r.ok) setItems((x) => x!.filter((y) => y.id !== c.id));
                    else toast.error(r.error);
                  })
                }
              >
                <Trash2 />
              </Button>
            </span>
          )}
        </div>
      ))}
      {post.allow_comments && post.status === "published" ? (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <Input value={body} onChange={(e) => setBody(e.target.value)} maxLength={280} placeholder="Write something supportive" aria-label="Comment" className="h-10 text-sm" />
            <Button
              size="sm"
              className="h-10"
              disabled={!body.trim() || pending}
              onClick={() =>
                start(async () => {
                  const r = await addGratitudeComment({ postId: post.id, body, anonymous });
                  if (!r.ok) return void toast.error(r.error);
                  setBody("");
                  setItems(await loadGratitudeComments(post.id));
                })
              }
            >
              Reply
            </Button>
          </div>
          <label className="inline-flex items-center gap-1.5 text-xs text-ink-3">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="size-3.5 accent-[var(--primary)]" /> Comment anonymously
          </label>
        </div>
      ) : (
        !post.allow_comments && <p className="text-xs text-ink-3">The author turned comments off.</p>
      )}
    </div>
  );
}

function PostCard({ post: initial, staff, onRemoved }: { post: GratitudePost; staff: boolean; onRemoved: () => void }) {
  const [post, setPost] = useState(initial);
  const [pending, start] = useTransition();
  const cat = GRATITUDE_CATEGORIES[post.category as GratitudeCategory];

  const react = (kind: GratitudeReaction) => {
    const next = post.my_reaction === kind ? null : kind;
    const counts = { appreciate: post.appreciate, relate: post.relate, inspiring: post.inspiring };
    if (post.my_reaction) counts[post.my_reaction as GratitudeReaction]--;
    if (next) counts[next]++;
    setPost({ ...post, ...counts, my_reaction: next as string });
    start(async () => {
      const r = await reactGratitude(post.id, next);
      if (!r.ok) {
        toast.error(r.error);
        setPost(post);
      }
    });
  };

  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("break-inside-avoid rounded-3xl border bg-surface p-5 shadow-sm", post.status !== "published" ? "border-warn/40" : "border-line")}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", cat.tone)}>
          {cat.emoji} {cat.label}
        </span>
        {post.status === "held" && <Badge tone="pending">{post.is_mine && !staff ? "Waiting for a quick review" : "Needs review"}</Badge>}
        {post.status === "hidden" && <Badge tone="neutral">Hidden</Badge>}
        {staff && Number(post.report_count) > 0 && (
          <Badge tone="danger">
            <Flag /> {post.report_count}
          </Badge>
        )}
      </div>
      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{post.body}</p>
      {staff && post.held_reason && <p className="mt-2 text-xs text-warn">Held because: {post.held_reason}</p>}
      <p className="mt-3 flex items-center gap-2 text-xs text-ink-3">
        {post.author_name ? <Avatar name={post.author_name} hue={post.author_hue} size="xs" /> : null}
        {post.is_anonymous ? (post.author_name ? `${post.author_name} (anonymous to students)` : "Anonymous") : post.author_name}
        {post.is_mine && " · you"} · {relativeTime(post.created_at)}
      </p>

      {post.status === "published" && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(Object.keys(GRATITUDE_REACTIONS) as GratitudeReaction[]).map((k) => {
            const n = Number(post[k]);
            return (
              <button
                key={k}
                onClick={() => react(k)}
                disabled={post.is_mine}
                aria-pressed={post.my_reaction === k}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition disabled:cursor-default",
                  post.my_reaction === k ? "border-primary bg-primary-soft text-primary-soft-ink" : "border-line text-ink-2 hover:border-line-strong",
                )}
              >
                <span aria-hidden>{GRATITUDE_REACTIONS[k].emoji}</span> {GRATITUDE_REACTIONS[k].label}
                {n > 0 && <span className="tabular-nums">{n}</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Comments post={post} staff={staff} />
        </div>
        <div className="flex">
          {staff && post.status !== "published" && (
            <Button size="sm" variant="soft" disabled={pending} onClick={() => start(async () => { const r = await moderateGratitudePost(post.id, "published"); if (r.ok) setPost({ ...post, status: "published" }); else toast.error(r.error); })}>
              <Eye /> Publish
            </Button>
          )}
          {staff && post.status === "published" && (
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { const r = await moderateGratitudePost(post.id, "hidden"); if (r.ok) setPost({ ...post, status: "hidden" }); else toast.error(r.error); })}>
              <EyeOff /> Hide
            </Button>
          )}
          {!post.is_mine && !staff && post.status === "published" && (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Report post"
              disabled={pending}
              onClick={() => {
                if (!confirm("Report this post as unkind, unsafe or sharing personal information?")) return;
                start(async () => {
                  const r = await reportGratitudePost(post.id);
                  if (r.ok) toast.success(r.message ?? "Reported");
                  else toast.error(r.error);
                });
              }}
            >
              <Flag />
            </Button>
          )}
          {(post.is_mine || staff) && (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Delete post"
              disabled={pending}
              onClick={() => {
                if (!confirm("Delete this post?")) return;
                start(async () => {
                  const r = await deleteGratitudePost(post.id);
                  if (r.ok) onRemoved();
                  else toast.error(r.error);
                });
              }}
            >
              <Trash2 />
            </Button>
          )}
        </div>
      </div>
    </motion.li>
  );
}

export function GratitudeWall({ initial, role, initialFilter }: { initial: GratitudePost[]; role: Role; initialFilter?: string }) {
  const staff = role !== "student";
  const [posts, setPosts] = useState(initial);
  const [filter, setFilter] = useState<GratitudeCategory | "all" | "review">(initialFilter === "review" && staff ? "review" : "all");
  const [more, setMore] = useState(initial.length >= 20);
  const [loading, start] = useTransition();

  const reload = (f = filter) =>
    start(async () => {
      const next = await loadGratitude({ category: f === "all" || f === "review" ? null : f });
      setPosts(next);
      setMore(next.length >= 20);
    });
  const shown = filter === "review" ? posts.filter((p) => p.status !== "published" || Number(p.report_count) > 0) : posts;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-5">
        <Composer onPosted={() => reload()} />
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...Object.keys(GRATITUDE_CATEGORIES), ...(staff ? ["review"] : [])] as (GratitudeCategory | "all" | "review")[]).map((c) => (
            <Chip
              key={c}
              on={filter === c}
              onClick={() => {
                setFilter(c);
                reload(c);
              }}
              className="py-1 text-xs"
            >
              {c === "all" ? "Everything" : c === "review" ? "Needs review" : `${GRATITUDE_CATEGORIES[c].emoji} ${GRATITUDE_CATEGORIES[c].label}`}
            </Chip>
          ))}
        </div>
        {shown.length ? (
          <ul className={cn("columns-1 gap-4 space-y-4 md:columns-2", loading && "opacity-60")}>
            {shown.map((p) => (
              <PostCard key={p.id} post={p} staff={staff} onRemoved={() => setPosts((x) => x.filter((y) => y.id !== p.id))} />
            ))}
          </ul>
        ) : (
          <div className="rounded-3xl border border-dashed border-line-strong bg-surface/70">
            <EmptyState illustration="showing-support" title={filter === "review" ? "Nothing to review" : "The wall is waiting"} description={filter === "review" ? "Held and reported posts will appear here." : "Be the first to share something you appreciate."} />
          </div>
        )}
        {more && filter !== "review" && (
          <div className="text-center">
            <Button
              variant="secondary"
              loading={loading}
              onClick={() =>
                start(async () => {
                  const next = await loadGratitude({ category: filter === "all" ? null : filter, before: posts[posts.length - 1]?.created_at });
                  setPosts((x) => [...x, ...next.filter((n) => !x.some((y) => y.id === n.id))]);
                  setMore(next.length >= 20);
                })
              }
            >
              Load more
            </Button>
          </div>
        )}
      </div>
      <aside className="space-y-4">
        <div className="rounded-3xl bg-gradient-to-br from-rose-soft to-lilac-soft p-5 text-sm leading-relaxed text-ink-2">
          <p className="font-medium text-ink">Not every day feels grateful</p>
          <p className="mt-1">That&apos;s completely okay. This wall is for sharing when you want to, never a reason to hide difficult feelings. If things are hard, your counselor is there to talk.</p>
        </div>
        <div className="rounded-3xl border border-line bg-surface p-5 text-sm leading-relaxed text-ink-2 shadow-sm">
          <p className="flex items-center gap-2 font-medium text-ink">
            <ShieldCheck className="size-4 text-primary" /> How the wall stays kind
          </p>
          <ul className="mt-2 space-y-1.5">
            <li>• Posts with contact details, links or hurtful language are held for a counselor to check first.</li>
            <li>• Reactions are private appreciation, not a popularity count. There are no followers.</li>
            <li>• Anyone can report a post. Three reports hide it until it&apos;s reviewed.</li>
            <li>• Anonymous posts never show your name to other students.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
