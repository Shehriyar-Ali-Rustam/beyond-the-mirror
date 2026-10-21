"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { BadgeCheck, EyeOff, Flag, Heart, HelpCircle, MessageCircle, MoreHorizontal, Sparkles, Trash2, VenetianMask, Eye } from "lucide-react";
import { deletePost, moderatePost, reportContent, toggleReaction } from "@/actions/community";
import { Avatar } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import type { Post } from "@/lib/community";
import { cn, relativeTime } from "@/lib/utils";
import { Comments } from "./comments";

export type Viewer = { role: "student" | "counselor" | "admin" };

export function AuthorBadge({ name, hue, role, anonymous, mine }: { name: string | null; hue: number | null; role: string | null; anonymous: boolean; mine: boolean }) {
  const hidden = name === null;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {hidden ? (
        <span className="arch-sm flex size-9 shrink-0 items-center justify-center bg-lilac-soft text-lilac">
          <VenetianMask className="size-[18px]" />
        </span>
      ) : (
        <Avatar name={name} hue={hue} size="sm" className="size-9" />
      )}
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
          {hidden ? "Anonymous" : name}
          {mine && <span className="font-normal text-ink-3">(you)</span>}
          {role === "counselor" && !hidden && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary-soft-ink">
              <BadgeCheck className="size-3" /> Counselor
            </span>
          )}
          {anonymous && !hidden && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-lilac-soft px-1.5 py-0.5 text-[10px] font-semibold text-lilac" title="Other students see this post as anonymous">
              <VenetianMask className="size-3" /> Anonymous to students
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export function PostCard({ post, viewer, onRemoved }: { post: Post; viewer: Viewer; onRemoved: (id: string) => void }) {
  const [reacted, setReacted] = useState(post.reacted);
  const [reactions, setReactions] = useState(post.reaction_count);
  const [comments, setComments] = useState(post.comment_count);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(post.hidden);
  const [zoom, setZoom] = useState(false);
  const [burst, setBurst] = useState(0);
  const [, start] = useTransition();
  const staff = viewer.role !== "student";

  const react = () => {
    const next = !reacted;
    setReacted(next);
    setReactions((n) => n + (next ? 1 : -1));
    if (next) setBurst((b) => b + 1);
    start(async () => {
      const res = await toggleReaction(post.id);
      if (!res.ok) {
        setReacted(!next);
        setReactions((n) => n + (next ? -1 : 1));
        toast.error(res.error);
      }
    });
  };

  const remove = () => {
    if (!confirm("Delete this post? This can't be undone.")) return;
    start(async () => {
      const res = await deletePost(post.id);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Post deleted");
      onRemoved(post.id);
    });
  };

  const report = () => {
    const reason = prompt("What's wrong with this post? (optional)") ?? undefined;
    if (reason === undefined) return;
    start(async () => {
      const res = await reportContent({ postId: post.id, reason });
      if (!res.ok) toast.error(res.error);
      else toast.success(res.message ?? "Reported");
    });
  };

  const toggleHidden = () =>
    start(async () => {
      const res = await moderatePost(post.id, !hidden);
      if (!res.ok) return void toast.error(res.error);
      setHidden(!hidden);
      toast.success(hidden ? "Post is visible again" : "Post hidden from students");
    });

  const advice = post.kind === "advice";

  return (
    <motion.article
      id={`post-${post.id}`}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "scroll-mt-24 overflow-hidden rounded-3xl border bg-surface shadow-sm transition-shadow hover:shadow-md",
        hidden ? "border-warn/40 opacity-80" : "border-line",
      )}
    >
      <div className={cn("h-1.5 w-full", advice ? "bg-gradient-to-r from-sun via-coral to-rose" : "bg-gradient-to-r from-sky via-mint to-grape")} />
      <div className="p-4 sm:p-5">
        <header className="flex items-start justify-between gap-3">
          <AuthorBadge name={post.author_name} hue={post.author_hue} role={post.author_role} anonymous={post.is_anonymous} mine={post.is_mine} />
          <div className="flex shrink-0 items-center gap-1">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                advice ? "bg-sun-soft text-[#8a5a00]" : "bg-sky-soft text-[#1f5f97]",
              )}
            >
              {advice ? <HelpCircle className="size-3" /> : <Sparkles className="size-3" />}
              {advice ? "Asking for advice" : "Sharing"}
            </span>
            <Dropdown>
              <DropdownTrigger className="rounded-lg p-1.5 text-ink-3 transition hover:bg-surface-2 hover:text-ink" aria-label="Post options">
                <MoreHorizontal className="size-4" />
              </DropdownTrigger>
              <DropdownContent>
                {!post.is_mine && (
                  <DropdownItem onSelect={report}>
                    <Flag /> Report
                  </DropdownItem>
                )}
                {staff && (
                  <DropdownItem onSelect={toggleHidden}>
                    {hidden ? <Eye /> : <EyeOff />} {hidden ? "Show to students" : "Hide from students"}
                  </DropdownItem>
                )}
                {(post.is_mine || staff) && (
                  <DropdownItem onSelect={remove} className="text-danger [&_svg]:!text-danger">
                    <Trash2 /> Delete
                  </DropdownItem>
                )}
              </DropdownContent>
            </Dropdown>
          </div>
        </header>

        {staff && (hidden || post.report_count > 0) && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-warn-soft px-3 py-2 text-xs text-warn">
            <Flag className="size-3.5" />
            {hidden ? "Hidden from students" : "Visible"}
            {post.report_count > 0 && ` · reported ${post.report_count} ${post.report_count === 1 ? "time" : "times"}`}
          </p>
        )}

        <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-ink">{post.body}</p>

        {post.image_url && (
          <button type="button" onClick={() => setZoom(true)} className="group mt-3 block w-full overflow-hidden rounded-2xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
            <img src={post.image_url} alt="Photo shared with this post" loading="lazy" className="max-h-[420px] w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
          </button>
        )}

        <footer className="mt-4 flex items-center gap-1 border-t border-line pt-3">
          <button
            type="button"
            onClick={react}
            aria-pressed={reacted}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition",
              reacted ? "bg-rose-soft text-rose" : "text-ink-2 hover:bg-surface-2",
            )}
          >
            <motion.span key={burst} initial={burst ? { scale: 0.6 } : false} animate={{ scale: [0.6, 1.35, 1] }} transition={{ duration: 0.4 }} className="inline-flex">
              <Heart className={cn("size-4", reacted && "fill-rose")} />
            </motion.span>
            {reactions > 0 ? reactions : ""} Support
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className={cn("inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition", open ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2")}
          >
            <MessageCircle className="size-4" />
            {comments > 0 ? `${comments} ${comments === 1 ? "reply" : "replies"}` : advice ? "Suggest" : "Reply"}
          </button>
          <span className="ml-auto text-xs text-ink-3" suppressHydrationWarning>
            {relativeTime(post.created_at)}
          </span>
        </footer>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <Comments postId={post.id} viewer={viewer} advice={advice} onCountChange={setComments} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {post.image_url && (
        <Dialog open={zoom} onOpenChange={setZoom}>
          <DialogContent title="Photo" className="sm:max-w-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage */}
            <img src={post.image_url} alt="Photo shared with this post" className="max-h-[75vh] w-full rounded-2xl object-contain" />
          </DialogContent>
        </Dialog>
      )}
    </motion.article>
  );
}
