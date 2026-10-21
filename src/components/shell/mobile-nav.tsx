"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import type { Role } from "@/lib/types";
import { SidebarNav } from "./sidebar-nav";

export function MobileNav({ role, badges }: { role: Role; badges: Partial<Record<"unread" | "pending", number>> }) {
  const [open, setOpen] = useState(false);
  const total = (badges.unread ?? 0) + (badges.pending ?? 0);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className="relative -ml-1.5 rounded-xl p-2 text-ink-2 transition hover:bg-surface-2 hover:text-ink lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
        {total > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-clay" />}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgb(15_20_22/0.4)] data-[state=open]:animate-fade-in lg:hidden" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[290px] max-w-[85vw] flex-col bg-bg p-4 shadow-lg data-[state=open]:animate-fade-in lg:hidden">
          <Dialog.Title className="sr-only">Navigation</Dialog.Title>
          <Dialog.Description className="sr-only">Move between sections of your dashboard.</Dialog.Description>
          <div className="mb-6 flex items-center justify-between px-1 pt-1">
            <Logo href={`/${role}`} />
            <Dialog.Close className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2" aria-label="Close menu">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <SidebarNav role={role} badges={badges} onNavigate={() => setOpen(false)} layoutId="nav-pill-mobile" />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
