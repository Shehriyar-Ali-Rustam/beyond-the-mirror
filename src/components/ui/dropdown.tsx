"use client";

import * as React from "react";
import { DropdownMenu as M } from "radix-ui";
import { cn } from "@/lib/utils";

export const Dropdown = M.Root;
export const DropdownTrigger = M.Trigger;

export function DropdownContent({
  className,
  align = "end",
  children,
}: {
  className?: string;
  align?: "start" | "end" | "center";
  children: React.ReactNode;
}) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={8}
        className={cn(
          "z-50 min-w-52 rounded-2xl border border-line bg-surface p-1.5 shadow-lg data-[state=open]:animate-fade-in",
          className,
        )}
      >
        {children}
      </M.Content>
    </M.Portal>
  );
}

export function DropdownItem({
  className,
  ...props
}: React.ComponentProps<typeof M.Item>) {
  return (
    <M.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink outline-none transition data-[disabled]:pointer-events-none data-[highlighted]:bg-surface-2 data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-ink-3",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownLabel({ className, ...props }: React.ComponentProps<typeof M.Label>) {
  return <M.Label className={cn("px-3 pb-1 pt-2 text-xs font-medium text-ink-3", className)} {...props} />;
}

export function DropdownSeparator() {
  return <M.Separator className="my-1.5 h-px bg-line" />;
}
