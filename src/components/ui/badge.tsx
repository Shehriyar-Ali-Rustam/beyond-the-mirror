import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "bg-surface-2 text-ink-2",
        primary: "bg-primary-soft text-primary-soft-ink",
        pending: "bg-warn-soft text-warn",
        progress: "bg-info-soft text-info",
        resolved: "bg-ok-soft text-ok",
        danger: "bg-danger-soft text-danger",
        clay: "bg-clay-soft text-clay",
        lilac: "bg-lilac-soft text-lilac",
        outline: "border border-line-strong text-ink-2",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  dot,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {props.children}
    </span>
  );
}
