"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#portals", label: "For counselors" },
  { href: "/#community", label: "Community" },
  { href: "/toolkit", label: "Toolkit" },
  { href: "/#privacy", label: "Privacy" },
];

export function SiteNav({ signedInHref }: { signedInHref: string | null }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className={cn("sticky top-0 z-40 transition-all duration-300", scrolled ? "border-b border-line bg-bg/85 backdrop-blur-md" : "border-b border-transparent")}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 sm:px-8">
        <Logo />
        <nav aria-label="Primary" className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-3.5 py-2 text-sm text-ink-2 transition hover:bg-surface-2 hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          {signedInHref ? (
            <Button asChild>
              <Link href={signedInHref}>Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger className="ml-auto rounded-xl p-2 text-ink-2 hover:bg-surface-2 md:hidden" aria-label="Open menu">
            <Menu className="size-5" />
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgb(15_20_22/0.4)] data-[state=open]:animate-fade-in md:hidden" />
            <Dialog.Content className="fixed inset-x-3 top-3 z-50 rounded-3xl border border-line bg-surface p-5 shadow-lg data-[state=open]:animate-fade-up md:hidden">
              <Dialog.Title className="sr-only">Menu</Dialog.Title>
              <Dialog.Description className="sr-only">Site navigation</Dialog.Description>
              <div className="mb-4 flex items-center justify-between">
                <Logo />
                <Dialog.Close className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2" aria-label="Close menu">
                  <X className="size-5" />
                </Dialog.Close>
              </div>
              <nav className="flex flex-col">
                {LINKS.map((l) => (
                  <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-[15px] text-ink hover:bg-surface-2">
                    {l.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {signedInHref ? (
                  <Button asChild className="col-span-2">
                    <Link href={signedInHref}>Open dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="secondary">
                      <Link href="/login">Log in</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/register">Get started</Link>
                    </Button>
                  </>
                )}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </header>
  );
}
