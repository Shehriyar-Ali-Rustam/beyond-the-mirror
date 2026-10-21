"use client";

import * as React from "react";
import { Popover as P } from "radix-ui";
import { cn } from "@/lib/utils";

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverClose = P.Close;

export function PopoverContent({
  className,
  align = "end",
  children,
}: {
  className?: string;
  align?: "start" | "end" | "center";
  children: React.ReactNode;
}) {
  return (
    <P.Portal>
      <P.Content
        align={align}
        sideOffset={10}
        collisionPadding={12}
        className={cn(
          "z-50 rounded-2xl border border-line bg-surface shadow-lg outline-none data-[state=open]:animate-fade-in",
          className,
        )}
      >
        {children}
      </P.Content>
    </P.Portal>
  );
}
