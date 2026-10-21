import Image from "next/image";
import { PHOTOS } from "@/lib/photos";
import { FloatingShapes } from "@/components/illustrations/scenes";

const LINES = [
  { outer: "I'm fine.", inner: "I haven't slept properly since results came out." },
  { outer: "It's nothing.", inner: "My friends stopped talking to me and I don't know why." },
  { outer: "Just tired.", inner: "There's a lot going on at home right now." },
];

/** Brand panel: a calm photo, and the mirror showing what's behind "I'm fine". */
export function AuthAside() {
  return (
    <aside className="relative hidden overflow-hidden lg:flex lg:items-center lg:justify-center" aria-hidden>
      <Image src={PHOTOS.reset.src} alt="" fill priority sizes="45vw" placeholder="blur" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#123c37] via-[#1d5b51]/75 to-[#1d5b51]/25" />
      <FloatingShapes variant="dark" className="absolute inset-0 h-full w-full opacity-70" />
      <div className="relative flex flex-col items-center px-12">
        <div className="relative h-[420px] w-[300px]">
          <div className="arch absolute inset-0 border border-white/25 bg-white/[0.08] backdrop-blur-md" />
          <div className="arch absolute inset-3 border border-white/15 bg-gradient-to-b from-white/[0.12] to-transparent" />
          <div className="glass-sheen arch absolute inset-3 opacity-40" />
          <div className="absolute inset-x-8 bottom-10 space-y-5">
            {LINES.map((l, i) => (
              <div key={i} className="animate-fade-up space-y-1.5" style={{ animationDelay: `${300 + i * 350}ms` }}>
                <p className="text-sm text-white/55 line-through decoration-white/40">{l.outer}</p>
                <p className="font-display text-[17px] italic leading-snug text-white">{l.inner}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-10 max-w-xs text-center text-sm leading-relaxed text-white/80">
          Whatever is behind the reflection, there&apos;s someone here whose job is to listen.
        </p>
      </div>
    </aside>
  );
}
