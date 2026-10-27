"use client";

import type { Ambient, Mood } from "@/lib/moods";

/** Pseudo-random but stable per index, so particles don't jump on re-render. */
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const MOTION: Record<Ambient, { anim: string; count: number; shape: "dot" | "spark" | "leaf" | "drop" | "heart" | "ring" }> = {
  sparkles: { anim: "amb-twinkle", count: 22, shape: "spark" },
  bubbles: { anim: "amb-rise", count: 18, shape: "ring" },
  leaves: { anim: "amb-fall", count: 16, shape: "leaf" },
  stars: { anim: "amb-twinkle", count: 30, shape: "dot" },
  rain: { anim: "amb-rain", count: 40, shape: "drop" },
  embers: { anim: "amb-rise", count: 24, shape: "dot" },
  swirl: { anim: "amb-orbit", count: 14, shape: "ring" },
  hearts: { anim: "amb-rise", count: 16, shape: "heart" },
  deep: { anim: "amb-drift", count: 10, shape: "ring" },
};

function Shape({ shape, color, size }: { shape: (typeof MOTION)[Ambient]["shape"]; color: string; size: number }) {
  switch (shape) {
    case "spark":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M12 0c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12C7 11 11 7 12 0Z" />
        </svg>
      );
    case "leaf":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M4 20C4 9 11 3 21 3c0 10-6 17-17 17Zm0 0 9-9" stroke="white" strokeOpacity=".5" strokeWidth="1.2" />
        </svg>
      );
    case "heart":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11Z" />
        </svg>
      );
    case "drop":
      return <span style={{ display: "block", width: 2, height: size * 2.2, borderRadius: 2, background: `linear-gradient(${color}00, ${color})` }} />;
    case "ring":
      return <span style={{ display: "block", width: size, height: size, borderRadius: 999, border: `2px solid ${color}`, background: `${color}22` }} />;
    default:
      return <span style={{ display: "block", width: size / 2.4, height: size / 2.4, borderRadius: 999, background: color, boxShadow: `0 0 ${size / 2}px ${color}` }} />;
  }
}

/** Soft animated background that follows the chosen mood. Purely decorative. */
export function AmbientLayer({ mood }: { mood: Mood }) {
  const m = MOTION[mood.ambient];
  return (
    <div aria-hidden className="mood-ambient pointer-events-none fixed inset-0 -z-10 overflow-hidden" key={mood.id}>
      <div className="mood-blob" style={{ background: mood.wash[1], left: "-10%", top: "-15%" }} />
      <div className="mood-blob" style={{ background: mood.particle, opacity: 0.18, right: "-12%", top: "30%", animationDelay: "-8s" }} />
      <div className="mood-blob" style={{ background: mood.wash[2], left: "25%", bottom: "-25%", animationDelay: "-16s" }} />
      {Array.from({ length: m.count }, (_, i) => {
        const size = 8 + Math.round(rand(i, 1) * (m.shape === "dot" ? 10 : 16));
        const duration = m.anim === "amb-rain" ? 1.4 + rand(i, 3) * 1.2 : 10 + rand(i, 3) * 14;
        return (
          <span
            key={i}
            className="mood-particle"
            style={{
              left: `${rand(i, 2) * 100}%`,
              top: m.anim === "amb-twinkle" || m.anim === "amb-orbit" || m.anim === "amb-drift" ? `${rand(i, 4) * 100}%` : undefined,
              animationName: m.anim,
              animationDuration: `${duration}s`,
              animationDelay: `${-rand(i, 5) * duration}s`,
              opacity: 0.55,
            }}
          >
            <Shape shape={m.shape} color={mood.particle} size={m.shape === "ring" && mood.ambient === "deep" ? size * 5 : size} />
          </span>
        );
      })}
    </div>
  );
}
