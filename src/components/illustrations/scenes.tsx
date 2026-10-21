import { cn } from "@/lib/utils";

/** Floating confetti-like shapes. Purely decorative. */
export function FloatingShapes({ className, variant = "light" }: { className?: string; variant?: "light" | "dark" }) {
  const o = variant === "dark" ? 0.55 : 1;
  return (
    <svg viewBox="0 0 400 400" className={cn("pointer-events-none", className)} aria-hidden fill="none">
      <circle cx="58" cy="70" r="14" className="fill-sun animate-float" opacity={o} />
      <path d="M338 54 l5 11 11 5 -11 5 -5 11 -5 -11 -11 -5 11 -5z" className="fill-grape animate-float-slow" opacity={o} />
      <rect x="320" y="300" width="26" height="26" rx="8" className="fill-sky animate-wiggle" opacity={o} />
      <path d="M60 320 c-12 -8 -18 -14 -18 -21 a9 9 0 0 1 18 -2 a9 9 0 0 1 18 2 c0 7 -6 13 -18 21z" className="fill-rose animate-float" opacity={o} />
      <circle cx="368" cy="190" r="7" className="fill-mint animate-float-slow" opacity={o} />
      <circle cx="24" cy="200" r="6" className="fill-coral animate-float" opacity={o} />
      <path d="M190 18 q10 -10 20 0 q10 10 20 0" className="stroke-sky animate-float-slow" strokeWidth="5" strokeLinecap="round" opacity={o} />
    </svg>
  );
}
