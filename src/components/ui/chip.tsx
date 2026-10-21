"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Accessible single-select chip group backed by native radios. */
export function ChipGroup<T extends string>({
  name,
  options,
  value,
  onChange,
  className,
  size = "md",
}: {
  name: string;
  options: { value: T; label: React.ReactNode; hint?: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <label
            key={o.value}
            className={cn(
              "relative inline-flex cursor-pointer items-center gap-2 rounded-full border transition-all duration-200 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--ring)] [&_svg]:size-4",
              size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-3.5 py-2 text-sm",
              checked
                ? "border-primary bg-primary text-primary-ink shadow-sm"
                : "border-line-strong bg-surface text-ink-2 hover:border-ink-3 hover:text-ink",
            )}
            title={o.hint}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={checked}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.icon}
            {o.label}
          </label>
        );
      })}
    </div>
  );
}
