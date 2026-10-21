"use client";

import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-center"
        theme="light"
        toastOptions={{
          classNames: {
            toast: "!rounded-2xl !border !border-line !bg-surface !text-ink !shadow-lg !font-sans",
            description: "!text-ink-2",
          },
        }}
      />
    </>
  );
}
