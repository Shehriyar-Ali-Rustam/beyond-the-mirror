"use client";

import * as React from "react";
import { Accordion as A } from "radix-ui";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Accordion({
  items,
  className,
}: {
  items: { q: string; a: React.ReactNode }[];
  className?: string;
}) {
  return (
    <A.Root type="single" collapsible className={cn("divide-y divide-line border-y border-line", className)}>
      {items.map((item, i) => (
        <A.Item key={i} value={`item-${i}`}>
          <A.Header>
            <A.Trigger className="group flex w-full items-center justify-between gap-6 py-5 text-left text-[15px] font-medium text-ink transition hover:text-primary">
              {item.q}
              <Plus className="size-4 shrink-0 text-ink-3 transition-transform duration-300 group-data-[state=open]:rotate-45" />
            </A.Trigger>
          </A.Header>
          <A.Content className="overflow-hidden data-[state=closed]:animate-none">
            <div className="pb-5 pr-10 text-[15px] leading-relaxed text-ink-2">{item.a}</div>
          </A.Content>
        </A.Item>
      ))}
    </A.Root>
  );
}
