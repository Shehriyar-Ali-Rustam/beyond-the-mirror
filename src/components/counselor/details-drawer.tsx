"use client";

import { Dialog } from "radix-ui";
import { PanelRight, X } from "lucide-react";

export function DetailsDrawer({ children }: { children: React.ReactNode }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="rounded-xl p-2 text-ink-2 transition hover:bg-surface-2 hover:text-ink 2xl:hidden" aria-label="Student details" title="Student details">
        <PanelRight className="size-5" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgb(15_20_22/0.4)] data-[state=open]:animate-fade-in" />
        <Dialog.Content className="scrollbar-thin fixed inset-y-0 right-0 z-50 w-[340px] max-w-[92vw] overflow-y-auto bg-surface shadow-lg data-[state=open]:animate-fade-in">
          <Dialog.Title className="sr-only">Student details</Dialog.Title>
          <Dialog.Description className="sr-only">Information, history and private notes for this student.</Dialog.Description>
          <Dialog.Close className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-ink-3 hover:bg-surface-2" aria-label="Close">
            <X className="size-4" />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
