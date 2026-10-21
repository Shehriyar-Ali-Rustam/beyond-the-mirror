import type { ToolSlug } from "@/lib/toolkit";
import { cn } from "@/lib/utils";

/**
 * Small illustrated scenes for each toolkit activity. Pure SVG, drawn with the
 * accent palette so they stay crisp, light and on-brand.
 */
const SCENES: Record<ToolSlug, { bg: string; art: React.ReactNode }> = {
  feelings: {
    bg: "from-grape-soft via-rose-soft to-sun-soft",
    art: (
      <g>
        <g transform="translate(60 47)">
          <g className="animate-spin-slow">
            {["fill-coral", "fill-sun", "fill-mint", "fill-sky", "fill-grape", "fill-rose"].map((c, i) => (
              <path key={c} className={c} d="M0 0 L0 -30 A30 30 0 0 1 25.98 -15 Z" transform={`rotate(${i * 60})`} opacity="0.9" />
            ))}
          </g>
        </g>
        <circle cx="60" cy="47" r="13" className="fill-surface" />
        <circle cx="55.5" cy="45" r="1.6" className="fill-ink" />
        <circle cx="64.5" cy="45" r="1.6" className="fill-ink" />
        <path d="M55 50 Q60 54.5 65 50" className="stroke-ink" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M98 20 l2.2 5 5 2.2 -5 2.2 -2.2 5 -2.2 -5 -5 -2.2 5 -2.2z" className="fill-sun animate-float" />
        <path d="M22 64 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6 3.6 -1.6z" className="fill-grape animate-float-slow" />
      </g>
    ),
  },
  untangle: {
    bg: "from-sky-soft via-surface to-mint-soft",
    art: (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M14 52 C 22 22, 40 72, 30 44 S 52 26, 44 56 S 30 70, 50 50"
          className="stroke-coral"
          strokeWidth="3.5"
        />
        <path d="M50 50 H 84" className="stroke-sky" strokeWidth="3.5" strokeDasharray="3 6" />
        <circle cx="96" cy="50" r="13" className="fill-mint" stroke="none" />
        <path d="M90 50 l4.5 4.5 8 -9" className="stroke-surface" strokeWidth="3.5" />
        <circle cx="30" cy="22" r="4" className="fill-sun animate-float" stroke="none" />
      </g>
    ),
  },
  reset: {
    bg: "from-sun-soft via-coral-soft to-sky-soft",
    art: (
      <g>
        <circle cx="60" cy="54" r="20" className="fill-sun" />
        <g className="stroke-sun" strokeWidth="3" strokeLinecap="round">
          {[-60, -30, 0, 30, 60].map((a) => (
            <line key={a} x1="60" y1="24" x2="60" y2="17" transform={`rotate(${a} 60 54)`} />
          ))}
        </g>
        <path d="M-90 72 Q -60 52 -30 66 T 30 64 Q 45 56 60 66 T 120 62 T 210 64 V 100 H -90 Z" className="fill-mint" />
        <path d="M-90 80 Q -50 64 -10 78 T 70 76 T 150 74 T 210 76 V 100 H -90 Z" className="fill-primary" opacity="0.85" />
        <g className="stroke-sky animate-float-slow" strokeWidth="2.5" strokeLinecap="round" fill="none">
          <path d="M14 30 h20 a5 5 0 1 0 -5 -5" />
          <path d="M84 22 h18 a4 4 0 1 0 -4 -4" />
        </g>
        <path d="M92 40 q4 -4 8 0 q4 -4 8 0" className="stroke-ink" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  exams: {
    bg: "from-sun-soft via-surface to-sky-soft",
    art: (
      <g>
        <rect x="30" y="58" width="50" height="11" rx="3" className="fill-coral" />
        <rect x="35" y="47" width="46" height="11" rx="3" className="fill-sky" />
        <rect x="28" y="36" width="48" height="11" rx="3" className="fill-mint" />
        <g className="fill-surface" opacity="0.8">
          <rect x="34" y="40" width="30" height="2.4" rx="1.2" />
          <rect x="40" y="51" width="26" height="2.4" rx="1.2" />
          <rect x="36" y="62" width="32" height="2.4" rx="1.2" />
        </g>
        <g transform="rotate(-35 92 40)">
          <rect x="86" y="18" width="10" height="42" rx="2" className="fill-sun" />
          <path d="M86 60 h10 l-5 9 z" className="fill-coral-soft" />
          <path d="M89.6 66 h2.8 l-1.4 3 z" className="fill-ink" />
          <rect x="86" y="18" width="10" height="6" rx="2" className="fill-rose" />
        </g>
        <path d="M22 22 l2.6 5.4 6 0.8 -4.3 4.2 1 5.9 -5.3 -2.8 -5.3 2.8 1 -5.9 -4.3 -4.2 6 -0.8z" className="fill-sun animate-wiggle" />
      </g>
    ),
  },
  "say-it": {
    bg: "from-grape-soft via-surface to-sky-soft",
    art: (
      <g>
        <path d="M18 22 h52 a10 10 0 0 1 10 10 v18 a10 10 0 0 1 -10 10 h-30 l-12 10 v-10 h-10 a10 10 0 0 1 -10 -10 v-18 a10 10 0 0 1 10 -10 z" className="fill-grape" />
        <g className="fill-surface">
          <circle cx="34" cy="41" r="3.2" />
          <circle cx="45" cy="41" r="3.2" />
          <circle cx="56" cy="41" r="3.2" />
        </g>
        <path d="M62 44 h38 a8 8 0 0 1 8 8 v14 a8 8 0 0 1 -8 8 h-6 v8 l-10 -8 h-22 a8 8 0 0 1 -8 -8 v-14 a8 8 0 0 1 8 -8 z" className="fill-sky" />
        <path d="M81 64 c-6 -4 -9 -7 -9 -10.5 a4.5 4.5 0 0 1 9 -1 a4.5 4.5 0 0 1 9 1 c0 3.5 -3 6.5 -9 10.5z" className="fill-surface animate-float" />
      </g>
    ),
  },
  situations: {
    bg: "from-rose-soft via-surface to-mint-soft",
    art: (
      <g>
        <path d="M18 70 q8 -22 30 -20 l10 2 q6 2 3 7 l-16 0" className="fill-sun-soft stroke-coral" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M102 70 q-8 -22 -30 -20 l-10 2 q-6 2 -3 7 l16 0" className="fill-sun-soft stroke-coral" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M60 50 c-10 -7 -15 -12 -15 -18 a7.5 7.5 0 0 1 15 -2 a7.5 7.5 0 0 1 15 2 c0 6 -5 11 -15 18z" className="fill-rose animate-float" />
        <circle cx="26" cy="24" r="5" className="fill-mint" opacity="0.7" />
        <circle cx="98" cy="22" r="3.5" className="fill-sky" opacity="0.8" />
      </g>
    ),
  },
  letters: {
    bg: "from-mint-soft via-surface to-sun-soft",
    art: (
      <g>
        <rect x="20" y="36" width="64" height="42" rx="6" className="fill-surface stroke-mint" strokeWidth="2.5" />
        <path d="M22 40 l30 22 l30 -22" className="stroke-mint" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
        <path d="M52 66 c-4 -2.8 -6 -4.8 -6 -7 a3 3 0 0 1 6 -0.6 a3 3 0 0 1 6 0.6 c0 2.2 -2 4.2 -6 7z" className="fill-coral" />
        <g className="animate-float-slow">
          <g transform="rotate(28 96 34)">
            <path d="M96 10 c10 8 12 26 0 44 c-12 -18 -10 -36 0 -44z" className="fill-grape" />
            <path d="M96 14 v46" className="stroke-surface" strokeWidth="1.6" />
          </g>
        </g>
        <circle cx="16" cy="26" r="3" className="fill-sun" />
      </g>
    ),
  },
};

export function ToolArt({ slug, className }: { slug: ToolSlug; className?: string }) {
  const scene = SCENES[slug];
  return (
    <div className={cn("relative overflow-hidden bg-gradient-to-br", scene.bg, className)} aria-hidden>
      <svg viewBox="0 0 120 90" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
        {scene.art}
      </svg>
    </div>
  );
}
