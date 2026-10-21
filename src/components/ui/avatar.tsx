import type React from "react";
import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  hue = 160,
  size = "md",
  shape = "arch",
  className,
}: {
  name: string;
  hue?: number | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  shape?: "arch" | "circle";
  className?: string;
}) {
  const sizes = {
    xs: "size-6 text-[10px]",
    sm: "size-8 text-xs",
    md: "size-10 text-sm",
    lg: "size-14 text-lg",
    xl: "size-20 text-2xl",
  };
  const h = hue ?? 160;
  return (
    <span
      aria-hidden
      className={cn(
        "tint inline-flex shrink-0 select-none items-center justify-center font-semibold",
        shape === "arch" ? "arch-sm" : "rounded-full",
        sizes[size],
        className,
      )}
      style={{ "--h": h } as React.CSSProperties}
    >
      {initials(name)}
    </span>
  );
}
