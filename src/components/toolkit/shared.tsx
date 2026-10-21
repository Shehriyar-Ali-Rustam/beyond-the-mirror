"use client";

import { createContext, useContext, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, MessageSquareHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ToolContext = "public" | "student";
const Ctx = createContext<ToolContext>("public");
export const ToolContextProvider = Ctx.Provider;
export const useToolContext = () => useContext(Ctx);

export function toolHref(context: ToolContext, slug: string) {
  return context === "student" ? `/student/toolkit/${slug}` : `/toolkit/${slug}`;
}

/** Hands text to the "new message" form via sessionStorage (never the server). */
export function useSendToCounselor() {
  const router = useRouter();
  const context = useToolContext();
  return (draft: { subject: string; body: string; category?: Category }) => {
    try {
      sessionStorage.setItem("btm:draft", JSON.stringify(draft));
    } catch {}
    router.push(context === "student" ? "/student/messages/new" : "/register");
  };
}

export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {}
      }}
      aria-live="polite"
    >
      {copied ? <Check className="text-ok" /> : <Copy />}
      {copied ? "Copied" : label}
    </Button>
  );
}

export function TalkCta({ category, title, body }: { category?: Category; title?: string; body?: string }) {
  const context = useToolContext();
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-line bg-primary-soft/50 p-5 sm:flex-row sm:items-center sm:p-6">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-ink">
        <MessageSquareHeart className="size-5" />
      </span>
      <div className="flex-1">
        <p className="font-medium text-ink">{title ?? "Want to talk it through with someone?"}</p>
        <p className="mt-0.5 text-sm text-ink-2">
          {body ?? "Your counselor is there for exactly this — no problem is too small."}
        </p>
      </div>
      <Button asChild>
        <Link href={context === "student" ? `/student/messages/new${category ? `?category=${category}` : ""}` : "/register"}>
          {context === "student" ? "Message my counselor" : "Create a free account"}
        </Link>
      </Button>
    </div>
  );
}

export function Step({ n, title, children, className }: { n: number; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("animate-fade-up", className)}>
      <h2 className="flex items-center gap-3 text-[15px] font-semibold text-ink">
        <span className="arch-sm flex h-7 w-6 items-center justify-center bg-primary text-xs text-primary-ink">{n}</span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="scrollbar-thin inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-surface-2 p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition",
            value === t.value ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
