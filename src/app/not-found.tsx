import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
      <Logo />
      <main className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="relative mb-8">
          <div className="arch flex h-36 w-28 items-center justify-center border border-line-strong bg-surface-2 text-primary">
            <Compass className="size-8" />
          </div>
          <div className="glass-sheen arch absolute inset-0 opacity-70" />
        </div>
        <p className="text-sm font-medium text-ink-3">404</p>
        <h1 className="mt-2 font-display text-4xl text-ink">Nothing behind this mirror</h1>
        <p className="mt-3 max-w-md text-ink-2">
          The page you&apos;re looking for doesn&apos;t exist — or you don&apos;t have access to it.
        </p>
        <Button asChild className="mt-8">
          <Link href="/">Back to safety</Link>
        </Button>
      </main>
    </div>
  );
}
