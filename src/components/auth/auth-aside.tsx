import { FloatingShapes } from "@/components/illustrations/scenes";

const LINES = [
  { outer: "I'm fine.", inner: "I haven't slept properly since results came out." },
  { outer: "It's nothing.", inner: "My friends stopped talking to me and I don't know why." },
  { outer: "Just tired.", inner: "There's a lot going on at home right now." },
];

/** Decorative brand panel: the mirror, showing what's behind "I'm fine". */
export function AuthAside() {
  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-[#2c7a6c] lg:flex lg:items-center lg:justify-center" aria-hidden>
      <div className="paper-grain absolute inset-0 opacity-50" />
      <FloatingShapes variant="dark" className="absolute inset-0 h-full w-full opacity-80" />
      <div className="relative flex flex-col items-center px-12">
        <div className="relative h-[420px] w-[300px]">
          <div className="arch absolute inset-0 border border-white/15 bg-white/[0.04]" />
          <div className="arch absolute inset-3 border border-white/10 bg-gradient-to-b from-white/[0.07] to-transparent" />
          <div className="glass-sheen arch absolute inset-3 opacity-40" />
          <div className="absolute inset-x-8 bottom-10 space-y-5">
            {LINES.map((l, i) => (
              <div key={i} className="animate-fade-up space-y-1.5" style={{ animationDelay: `${300 + i * 350}ms` }}>
                <p className="text-sm text-white/40 line-through decoration-white/30">{l.outer}</p>
                <p className="font-display text-[17px] italic leading-snug text-[#f6f3ec]">{l.inner}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-10 max-w-xs text-center text-sm leading-relaxed text-white/60">
          Whatever is behind the reflection, there&apos;s someone here whose job is to listen.
        </p>
      </div>
    </aside>
  );
}
