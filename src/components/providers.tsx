"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          classNames: {
            toast:
              "!rounded-2xl !border !border-line !bg-surface !text-ink !shadow-lg !font-sans",
            description: "!text-ink-2",
          },
        }}
      />
    </ThemeProvider>
  );
}
