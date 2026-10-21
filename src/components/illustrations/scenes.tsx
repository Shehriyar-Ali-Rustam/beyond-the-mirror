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

/** Student home banner: a calm window seat with a plant and a warm drink. */
export function WelcomeArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 200" className={className} aria-hidden fill="none">
      <path d="M40 190 V80 a70 70 0 0 1 140 0 V190" fill="#ffffff" fillOpacity="0.08" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M52 190 V82 a58 58 0 0 1 116 0 V190 Z" fill="url(#sky)" />
      <circle cx="132" cy="78" r="18" className="fill-sun animate-float-slow" />
      <g className="animate-float" fill="#ffffff">
        <ellipse cx="86" cy="92" rx="18" ry="8" fillOpacity="0.9" />
        <ellipse cx="98" cy="86" rx="12" ry="9" fillOpacity="0.9" />
      </g>
      <path d="M52 160 q30 -22 58 -6 t58 -4 V190 H52z" className="fill-mint" fillOpacity="0.9" />
      <rect x="30" y="182" width="160" height="10" rx="5" fill="#ffffff" fillOpacity="0.25" />
      <g transform="translate(150 140)">
        <path d="M0 42 h28 l-4 24 h-20 z" className="fill-coral" />
        <path d="M14 42 c-2 -16 -14 -22 -18 -30 c10 2 16 10 18 22 c2 -14 8 -24 18 -26 c-4 10 -14 16 -18 34z" className="fill-mint" />
      </g>
      <g transform="translate(40 158)">
        <rect x="0" y="0" width="22" height="22" rx="5" className="fill-sun" />
        <path d="M22 6 h4 a5 5 0 0 1 0 10 h-4" stroke="#f2b437" strokeWidth="3" />
        <path d="M6 -6 q3 -5 0 -10 M14 -6 q3 -5 0 -10" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" className="animate-float" />
      </g>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fd0f5" />
          <stop offset="1" stopColor="#fde9e4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Community board header: a shared photo, speech bubbles and hearts. */
export function CommunityArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 180" className={className} aria-hidden fill="none">
      <g transform="rotate(-6 92 92)">
        <rect x="40" y="40" width="104" height="96" rx="12" className="fill-surface" stroke="#e7eae7" strokeWidth="2" />
        <rect x="50" y="50" width="84" height="60" rx="8" className="fill-sky-soft" />
        <circle cx="112" cy="68" r="9" className="fill-sun" />
        <path d="M50 102 l22 -24 18 18 12 -10 32 26 v-2 a8 8 0 0 1 -8 0 H58 a8 8 0 0 1 -8 -8z" className="fill-mint" />
        <rect x="52" y="118" width="54" height="6" rx="3" className="fill-surface-3" />
      </g>
      <g className="animate-float">
        <path d="M150 30 h60 a10 10 0 0 1 10 10 v20 a10 10 0 0 1 -10 10 h-34 l-12 10 v-10 h-14 a10 10 0 0 1 -10 -10 v-20 a10 10 0 0 1 10 -10z" className="fill-grape" />
        <rect x="156" y="42" width="44" height="5" rx="2.5" fill="#ffffff" fillOpacity="0.85" />
        <rect x="156" y="53" width="30" height="5" rx="2.5" fill="#ffffff" fillOpacity="0.6" />
      </g>
      <g className="animate-float-slow">
        <path d="M160 104 h50 a9 9 0 0 1 9 9 v16 a9 9 0 0 1 -9 9 h-8 v9 l-11 -9 h-31 a9 9 0 0 1 -9 -9 v-16 a9 9 0 0 1 9 -9z" className="fill-coral" />
        <path d="M185 130 c-6 -4 -9 -7 -9 -10.5 a4.5 4.5 0 0 1 9 -1 a4.5 4.5 0 0 1 9 1 c0 3.5 -3 6.5 -9 10.5z" fill="#ffffff" />
      </g>
      <path d="M28 150 c-7 -5 -10 -8 -10 -12 a5 5 0 0 1 10 -1 a5 5 0 0 1 10 1 c0 4 -3 7 -10 12z" className="fill-rose animate-wiggle" />
      <path d="M222 92 l3 6.5 6.5 3 -6.5 3 -3 6.5 -3 -6.5 -6.5 -3 6.5 -3z" className="fill-sun animate-float" />
    </svg>
  );
}

/** Empty, friendly scene for when nobody has posted yet. */
export function EmptyBoardArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" className={className} aria-hidden fill="none">
      <rect x="30" y="20" width="100" height="78" rx="12" className="fill-sun-soft" />
      <rect x="44" y="34" width="50" height="6" rx="3" className="fill-sun" />
      <rect x="44" y="48" width="72" height="6" rx="3" className="fill-surface" />
      <rect x="44" y="60" width="60" height="6" rx="3" className="fill-surface" />
      <circle cx="118" cy="92" r="16" className="fill-grape animate-float" />
      <path d="M111 92 h14 M118 85 v14" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M24 98 c-5 -3.5 -7.5 -6 -7.5 -9 a3.75 3.75 0 0 1 7.5 -0.8 a3.75 3.75 0 0 1 7.5 0.8 c0 3 -2.5 5.5 -7.5 9z" className="fill-rose animate-wiggle" />
    </svg>
  );
}
