import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-8", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path d="M10 25V14a6 6 0 0 1 12 0v11" fill="none" className="stroke-primary-ink" strokeWidth="2.2" />
      <path d="M13.5 15a2.6 2.6 0 0 1 2.6-2.6" fill="none" stroke="#c9c2ea" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = "/", className, compact }: { href?: string; className?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label="Beyond the Mirror home">
      <LogoMark className="transition-transform duration-300 group-hover:-rotate-3" />
      {!compact && (
        <span className="font-display text-[17px] leading-none text-ink">
          Beyond <span className="italic text-ink-2">the</span> Mirror
        </span>
      )}
    </Link>
  );
}
