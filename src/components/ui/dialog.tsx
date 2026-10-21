"use client";

import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-[rgb(15_20_22/0.45)] backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <D.Content
        className={cn(
          "fixed inset-x-3 bottom-3 z-50 max-h-[88dvh] overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-lg data-[state=open]:animate-fade-up sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2",
          className,
        )}
      >
        <div className="mb-5 pr-8">
          <D.Title className="font-display text-xl text-ink">{title}</D.Title>
          {description ? (
            <D.Description className="mt-1 text-sm leading-relaxed text-ink-2">{description}</D.Description>
          ) : (
            <D.Description className="sr-only">{title}</D.Description>
          )}
        </div>
        {children}
        <D.Close
          className="absolute right-4 top-4 rounded-lg p-1.5 text-ink-3 transition hover:bg-surface-2 hover:text-ink"
          aria-label="Close"
        >
          <X className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}
