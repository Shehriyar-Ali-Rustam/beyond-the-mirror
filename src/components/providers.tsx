"use client";

import { Toaster } from "sonner";
import { MoodProvider } from "@/components/mood/mood-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MoodProvider>
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
    </MoodProvider>
  );
}
