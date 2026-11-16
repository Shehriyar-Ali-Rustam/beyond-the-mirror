import type { Ref } from "react";
import { VIEW_H, VIEW_W } from "./geometry";
import { landColor, mix, type SkyPalette } from "./palette";
import { seeded } from "./rng";
import type { ViewId } from "./state";

/* -----------------------------------------------------------------------------
   The world outside the window. Five illustrated views, each made of layers
   (far, mid, near) that drift at different speeds for a gentle parallax.
   Colours all come from the sky palette, so time and weather restyle them.
----------------------------------------------------------------------------- */

const W = VIEW_W;
const H = VIEW_H;

/** Parallax offsets are read from CSS variables set on a parent (falls back to 0 when rasterised). */
const drift = (k: number) => ({
  transform: `translate(calc(var(--px, 0) * ${k * 28}px), calc(var(--py, 0) * ${k * 12}px))`,
});

/* ------------------------------ seeded layouts ----------------------------- */

const STARS = (() => {
  const r = seeded(7);
  return Array.from({ length: 90 }, (_, i) => ({ x: r() * W, y: r() * 300, s: 0.5 + r() * 1.2, a: 0.4 + r() * 0.6, tw: i % 3 === 0, d: r() * 4 }));
})();

type Building = { x: number; w: number; top: number; wins: { x: number; y: number; on: number }[]; antenna?: boolean };

function buildings(seed: number, from: number, to: number, base: number, minH: number, maxH: number, minW: number, maxW: number, windows: boolean): Building[] {
  const r = seeded(seed);
  const out: Building[] = [];
  let x = from;
  while (x < to) {
    const w = minW + r() * (maxW - minW);
    const h = minH + r() * (maxH - minH);
    const top = base - h;
    const wins: Building["wins"] = [];
    if (windows) {
      for (let wy = top + 14; wy < base - 12; wy += 15) {
        for (let wx = x + 8; wx < x + w - 10; wx += 12) {
          wins.push({ x: wx, y: wy, on: r() });
        }
      }
    }
    out.push({ x, w, top, wins, antenna: h > maxH * 0.86 });
    x += w + (r() < 0.3 ? 4 + r() * 10 : -2);
  }
  return out;
}

const CITY_FAR = buildings(11, -40, W + 40, 452, 70, 210, 22, 56, false);
const CITY_MID = buildings(23, -30, W + 30, 505, 120, 270, 46, 92, true);
const CITY_FAR_WINDOWS = (() => {
  const r = seeded(31);
  return Array.from({ length: 140 }, () => ({ x: r() * W, y: 260 + r() * 185, on: r() }));
})();

type Tree = { x: number; h: number; w: number };
function trees(seed: number, count: number, from: number, to: number, minH: number, maxH: number): Tree[] {
  const r = seeded(seed);
  return Array.from({ length: count }, () => {
    const h = minH + r() * (maxH - minH);
    return { x: from + r() * (to - from), h, w: h * (0.42 + r() * 0.12) };
  }).sort((a, b) => a.h - b.h);
}

const FOREST_FAR = trees(41, 46, -20, W + 20, 46, 78);
const FOREST_MID = trees(43, 22, -30, W + 30, 92, 150);
const FOREST_NEAR = [
  { x: 40, h: 330, w: 150 },
  { x: 690, h: 360, w: 160 },
  { x: 560, h: 250, w: 118 },
];
const FIREFLIES = (() => {
  const r = seeded(51);
  return Array.from({ length: 16 }, () => ({ x: 60 + r() * 600, y: 400 + r() * 140, d: r() * 5 }));
})();
const SHORE_TREES = trees(61, 34, -20, W + 20, 18, 40);
const VILLAGE_TREES = trees(71, 18, -20, W + 20, 40, 70);

function pinePath(x: number, base: number, h: number, w: number) {
  const tiers = 4;
  let d = `M${x},${base - h}`;
  // Right side, tier by tier, then back up the left side.
  for (let i = 1; i <= tiers; i++) {
    const t = i / tiers;
    const y = base - h + h * t * 0.86;
    const half = (w / 2) * (0.35 + 0.65 * t);
    d += ` L${x + half},${y} L${x + half * 0.45},${y - h * 0.05}`;
  }
  d += ` L${x + w * 0.06},${base - h * 0.14} L${x + w * 0.06},${base} L${x - w * 0.06},${base} L${x - w * 0.06},${base - h * 0.14}`;
  for (let i = tiers; i >= 1; i--) {
    const t = i / tiers;
    const y = base - h + h * t * 0.86;
    const half = (w / 2) * (0.35 + 0.65 * t);
    d += ` L${x - half * 0.45},${y - h * 0.05} L${x - half},${y}`;
  }
  return d + " Z";
}

/* --------------------------------- pieces --------------------------------- */

function Sky({ p, id }: { p: SkyPalette; id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.top} />
          <stop offset="0.55" stopColor={p.mid} />
          <stop offset="1" stopColor={p.bottom} />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#fff6dc" stopOpacity="0.9" />
          <stop offset="0.35" stopColor="#fff1cf" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff1cf" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-cloud`}>
          <stop offset="0" stopColor={p.cloud} stopOpacity="0.95" />
          <stop offset="0.55" stopColor={p.cloud} stopOpacity="0.6" />
          <stop offset="1" stopColor={p.cloud} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-warm`}>
          <stop offset="0" stopColor="#ffd38a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffb85c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-haze`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.haze} stopOpacity="0" />
          <stop offset="1" stopColor={p.haze} stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}-sky)`} />
      <g style={drift(1)}>
        {p.stars > 0 &&
          STARS.map((s, i) => (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={s.s}
              fill="#fffbea"
              opacity={s.a * p.stars}
              className={s.tw ? "cz-twinkle" : undefined}
              style={s.tw ? { animationDelay: `${s.d}s` } : undefined}
            />
          ))}
        {p.sun > 0 && (
          <g opacity={p.sun}>
            <circle cx={560} cy={120} r={150} fill={`url(#${id}-glow)`} />
            <circle cx={560} cy={120} r={26} fill="#fffaf0" />
          </g>
        )}
        {p.moon > 0 && (
          <g opacity={p.moon}>
            <circle cx={548} cy={112} r={110} fill={`url(#${id}-glow)`} opacity="0.55" />
            <circle cx={548} cy={112} r={24} fill="#f7f0da" />
            <circle cx={541} cy={106} r={5} fill="#e4dbc0" opacity="0.7" />
            <circle cx={556} cy={120} r={3.5} fill="#e4dbc0" opacity="0.6" />
            <circle cx={552} cy={101} r={2.5} fill="#e4dbc0" opacity="0.6" />
          </g>
        )}
      </g>
      {p.overcast > 0 && (
        <g style={drift(0.9)} opacity={0.55 + p.overcast * 0.4}>
          <ellipse cx={90} cy={40} rx={230} ry={90} fill={`url(#${id}-cloud)`} />
          <ellipse cx={380} cy={20} rx={280} ry={100} fill={`url(#${id}-cloud)`} />
          <ellipse cx={640} cy={50} rx={240} ry={95} fill={`url(#${id}-cloud)`} />
          <ellipse cx={250} cy={140} rx={220} ry={60} fill={`url(#${id}-cloud)`} opacity="0.7" />
          <ellipse cx={560} cy={160} rx={240} ry={55} fill={`url(#${id}-cloud)`} opacity="0.6" />
        </g>
      )}
    </>
  );
}

/** A broken, shimmering reflection on water. */
function Glint({ x, y, w, h, color, a }: { x: number; y: number; w: number; h: number; color: string; a: number }) {
  const rows = Math.round(h / 9);
  return (
    <g className="cz-shimmer" fill={color}>
      {Array.from({ length: rows }, (_, i) => {
        const t = i / rows;
        const width = w * (1 - t * 0.55) * (i % 3 === 1 ? 0.6 : 1);
        return <rect key={i} x={x - width / 2 + (i % 2 ? 2 : -2)} y={y + i * 9} width={width} height={2.4} rx={1.2} opacity={a * (1 - t * 0.8)} />;
      })}
    </g>
  );
}

/** A mist band that thickens with fog. */
function Haze({ p, id, y, h, k }: { p: SkyPalette; id: string; y: number; h: number; k: number }) {
  return <rect x={-40} y={y} width={W + 80} height={h} fill={`url(#${id}-haze)`} opacity={Math.min(1, p.fog * k)} />;
}

const SNOW = "#edf2f8";

function City({ p, id }: { p: SkyPalette; id: string }) {
  const far = landColor(p, "#59637a", 0.9);
  const mid = landColor(p, "#454c60", 0.5);
  const near = landColor(p, "#33363f", 0.12);
  const winOff = mix(mid, p.bottom, 0.22);
  const lit = "#ffd690";
  return (
    <>
      <g style={drift(0.75)}>
        {CITY_FAR.map((b, i) => (
          <rect key={i} x={b.x} y={b.top} width={b.w} height={460 - b.top} fill={far} />
        ))}
        {p.lights > 0 &&
          CITY_FAR_WINDOWS.map((w, i) => (w.on > 0.55 ? <rect key={i} x={w.x} y={w.y} width={2.2} height={2.6} fill={lit} opacity={p.lights * 0.55} /> : null))}
      </g>
      <Haze p={p} id={id} y={320} h={150} k={1.1} />
      <g style={drift(0.5)}>
        {CITY_MID.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={b.top} width={b.w} height={510 - b.top} fill={mid} />
            <rect x={b.x} y={b.top} width={b.w} height={5} fill={mix(mid, "#000000", 0.18)} />
            {p.snowy && <rect x={b.x - 1} y={b.top - 3} width={b.w + 2} height={5} rx={2.5} fill={landColor(p, SNOW, 0.4)} />}
            {b.wins.map((w, j) => {
              const on = w.on < 0.42 * (0.4 + p.lights);
              return <rect key={j} x={w.x} y={w.y} width={6} height={8} rx={0.8} fill={on ? lit : winOff} opacity={on ? 0.55 + 0.45 * p.lights : 0.7} />;
            })}
            {b.antenna && (
              <>
                <rect x={b.x + b.w / 2 - 1} y={b.top - 34} width={2} height={34} fill={mid} />
                <circle cx={b.x + b.w / 2} cy={b.top - 35} r={2.4} fill="#ff6b5e" opacity={0.3 + p.lights * 0.7} className="cz-blink-slow" />
              </>
            )}
          </g>
        ))}
      </g>
      <Haze p={p} id={id} y={430} h={90} k={0.6} />
      <g style={drift(0.25)}>
        {/* Rooftops close by: a water tower, vents and a warm street glow. */}
        {p.lights > 0 && (
          <>
            <ellipse cx={150} cy={540} rx={120} ry={40} fill={`url(#${id}-warm)`} opacity={p.lights * 0.6} />
            <ellipse cx={520} cy={548} rx={140} ry={36} fill={`url(#${id}-warm)`} opacity={p.lights * 0.5} />
          </>
        )}
        <path d={`M-40,530 L250,530 L250,520 L420,520 L420,536 L760,536 L760,${H} L-40,${H} Z`} fill={near} />
        {p.snowy && <path d="M-40,530 L250,530 L250,520 L420,520 L420,536 L760,536 L760,541 L-40,541 Z" fill={landColor(p, SNOW, 0.2)} />}
        <g fill={near}>
          <rect x={92} y={430} width={70} height={66} rx={8} />
          <path d="M84,432 L127,404 L170,432 Z" />
          <rect x={98} y={496} width={5} height={36} />
          <rect x={150} y={496} width={5} height={36} />
          <rect x={124} y={496} width={5} height={36} />
          <rect x={560} y={500} width={46} height={36} rx={3} />
          <rect x={300} y={496} width={14} height={26} />
        </g>
      </g>
    </>
  );
}

function Forest({ p, id }: { p: SkyPalette; id: string }) {
  const ridge = landColor(p, "#5b786d", 0.95);
  const far = landColor(p, "#46685a", 0.72);
  const mid = landColor(p, "#365546", 0.42);
  const near = landColor(p, "#24382d", 0.1);
  const frost = (c: string, t: number) => (p.snowy ? mix(c, landColor(p, SNOW, 0.3), t) : c);
  return (
    <>
      <g style={drift(0.85)}>
        <path d={`M-40,380 C80,330 160,350 250,320 C340,292 430,330 520,310 C610,292 680,320 760,300 L760,${H} L-40,${H} Z`} fill={frost(ridge, 0.35)} />
      </g>
      <Haze p={p} id={id} y={300} h={140} k={1.2} />
      <g style={drift(0.6)} fill={frost(far, 0.3)}>
        <rect x={-40} y={410} width={W + 80} height={H - 410} />
        {FOREST_FAR.map((t, i) => (
          <path key={i} d={pinePath(t.x, 420, t.h, t.w)} />
        ))}
      </g>
      <Haze p={p} id={id} y={360} h={130} k={0.9} />
      <g style={drift(0.4)} fill={frost(mid, 0.25)}>
        <rect x={-40} y={470} width={W + 80} height={H - 470} />
        {FOREST_MID.map((t, i) => (
          <path key={i} d={pinePath(t.x, 480, t.h, t.w)} />
        ))}
      </g>
      {p.lights > 0 && p.stars > 0 && (
        <g>
          {FIREFLIES.map((f, i) => (
            <circle key={i} cx={f.x} cy={f.y} r={1.8} fill="#ffe9a0" className="cz-firefly" style={{ animationDelay: `${f.d}s` }} />
          ))}
        </g>
      )}
      <Haze p={p} id={id} y={440} h={100} k={0.5} />
      <g style={drift(0.2)} fill={frost(near, 0.2)}>
        <rect x={-40} y={545} width={W + 80} height={40} />
        {FOREST_NEAR.map((t, i) => (
          <path key={i} d={pinePath(t.x, 590, t.h, t.w)} />
        ))}
      </g>
    </>
  );
}

function Lake({ p, id }: { p: SkyPalette; id: string }) {
  const farM = landColor(p, "#6b7891", 0.88);
  const caps = landColor(p, "#f4f7fb", 0.55);
  const midM = landColor(p, "#4b596b", 0.5);
  const shore = landColor(p, "#2b4339", 0.25);
  const water = mix(p.bottom, landColor(p, "#2c4a5e", 0.2), 0.45);
  const waterDeep = landColor(p, "#203646", 0.1);
  const mountains = (
    <>
      <path d="M-40,350 L60,230 L110,262 L200,150 L260,214 L300,190 L390,300 L430,270 L520,170 L600,250 L650,226 L760,320 L760,390 L-40,390 Z" fill={farM} />
      <path d="M200,150 L232,184 L218,180 L206,196 L190,178 L176,182 Z M520,170 L552,204 L538,200 L524,214 L510,198 L494,204 Z M60,230 L80,254 L66,250 L52,258 L44,248 Z" fill={caps} />
      <path d="M-40,380 L40,320 L120,350 L190,300 L280,350 L350,318 L440,352 L520,300 L610,348 L680,322 L760,356 L760,392 L-40,392 Z" fill={midM} />
    </>
  );
  return (
    <>
      <g style={drift(0.8)}>{mountains}</g>
      <Haze p={p} id={id} y={260} h={140} k={1.1} />
      {/* The lake mirrors the mountains. */}
      <g style={drift(0.45)}>
        <defs>
          <linearGradient id={`${id}-lake`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={water} />
            <stop offset="1" stopColor={waterDeep} />
          </linearGradient>
        </defs>
        <rect x={-40} y={388} width={W + 80} height={H - 388} fill={`url(#${id}-lake)`} />
        <g transform="translate(0 780) scale(1 -1)" opacity="0.32">
          {mountains}
        </g>
        <g stroke={mix(p.bottom, "#ffffff", 0.3)} strokeWidth="1.4" strokeLinecap="round" opacity={0.35}>
          <path d="M80,420 h60 M300,436 h90 M520,428 h70 M160,470 h120 M430,488 h80 M60,520 h70 M560,512 h90" />
        </g>
        {p.moon > 0 && <Glint x={549} y={396} w={30} h={150} color="#f7f0da" a={0.5 * p.moon} />}
        {/* Little cabin with a warm window */}
        <g>
          <rect x={136} y={360} width={40} height={28} fill={shore} />
          <path d="M130,362 L156,340 L182,362 Z" fill={p.snowy ? landColor(p, SNOW, 0.3) : mix(shore, "#000000", 0.2)} />
          <rect x={146} y={370} width={9} height={9} fill={p.lights > 0 ? "#ffd690" : mix(shore, p.bottom, 0.3)} opacity={0.4 + p.lights * 0.6} />
          {p.lights > 0 && <Glint x={151} y={394} w={12} h={60} color="#ffd690" a={0.6 * p.lights} />}
        </g>
      </g>
      <g style={drift(0.35)} fill={shore}>
        <rect x={-40} y={384} width={W + 80} height={6} />
        {SHORE_TREES.map((t, i) => (t.x > 120 && t.x < 190 ? null : <path key={i} d={pinePath(t.x, 390, t.h, t.w)} />))}
      </g>
      <Haze p={p} id={id} y={400} h={150} k={0.5} />
      <g style={drift(0.15)}>
        <path d={`M-40,560 C60,540 120,548 200,538 C230,546 240,560 260,${H} L-40,${H} Z`} fill={p.snowy ? landColor(p, SNOW, 0.15) : landColor(p, "#2a3a30", 0.08)} />
      </g>
    </>
  );
}

function Sea({ p, id }: { p: SkyPalette; id: string }) {
  const sea = mix(p.bottom, landColor(p, "#2e5670", 0.25), 0.55);
  const seaDeep = landColor(p, "#1d3a4f", 0.08);
  const cliff = landColor(p, "#4a4c4f", 0.25);
  const island = landColor(p, "#59656e", 0.85);
  const dune = p.snowy ? landColor(p, SNOW, 0.12) : landColor(p, "#8a7a5f", 0.1);
  const crest = mix(p.bottom, "#ffffff", 0.35);
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sea`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sea} />
          <stop offset="1" stopColor={seaDeep} />
        </linearGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff3c4" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff3c4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g style={drift(0.8)}>
        <path d="M-40,342 C20,326 60,318 110,330 C140,322 170,326 210,342 Z" fill={island} />
        {p.lights > 0 && <circle cx={330} cy={340} r={1.8} fill="#ffd690" opacity={p.lights} className="cz-blink-slow" />}
      </g>
      <g style={drift(0.55)}>
        <rect x={-40} y={340} width={W + 80} height={H - 340} fill={`url(#${id}-sea)`} />
        {p.moon > 0 && <Glint x={549} y={346} w={36} h={200} color="#f7f0da" a={0.55 * p.moon} />}
        <g stroke={crest} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.45" className="cz-waves">
          <path d="M-20,372 q20,-5 40,0 t40,0 M160,384 q24,-6 48,0 t48,0 M380,366 q20,-5 40,0 t40,0 M60,412 q30,-7 60,0 t60,0 M300,430 q30,-7 60,0 t60,0 M100,468 q36,-8 72,0 t72,0 M420,492 q36,-8 72,0 t72,0" />
        </g>
      </g>
      <Haze p={p} id={id} y={260} h={130} k={1} />
      <g style={drift(0.35)}>
        <path d="M480,570 L480,300 C520,280 560,262 600,262 C650,262 690,270 760,250 L760,570 Z" fill={cliff} />
        {/* Lighthouse */}
        <rect x={588} y={196} width={26} height={68} fill={landColor(p, "#f2efe8", 0.25)} />
        <rect x={588} y={212} width={26} height={10} fill={landColor(p, "#c9544a", 0.25)} />
        <rect x={588} y={238} width={26} height={10} fill={landColor(p, "#c9544a", 0.25)} />
        <rect x={584} y={180} width={34} height={16} rx={3} fill={landColor(p, "#3c3f44", 0.25)} />
        <circle cx={601} cy={188} r={6} fill="#ffe7a3" opacity={0.35 + p.lights * 0.65} />
        <path d="M584,180 L601,166 L618,180 Z" fill={landColor(p, "#3c3f44", 0.25)} />
        {p.lights > 0 && (
          <g className="cz-beam" style={{ transformOrigin: "601px 188px" }} opacity={p.lights * 0.55}>
            <path d="M601,188 L1000,150 L1000,226 Z" fill={`url(#${id}-beam)`} />
          </g>
        )}
      </g>
      <Haze p={p} id={id} y={420} h={130} k={0.5} />
      <g style={drift(0.15)}>
        <path d={`M-40,520 C40,500 140,506 220,526 C260,540 290,560 300,${H} L-40,${H} Z`} fill={dune} />
        <g stroke={p.snowy ? landColor(p, "#9aa59a", 0.1) : landColor(p, "#6f7a4a", 0.1)} strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M40,518 q-6,-26 -16,-40 M52,516 q2,-30 10,-44 M66,518 q8,-22 20,-32 M150,512 q-4,-24 -12,-36 M164,514 q6,-26 16,-36" />
        </g>
      </g>
    </>
  );
}

function House({ x, base, w, h, body, p, flip }: { x: number; base: number; w: number; h: number; body: string; p: SkyPalette; flip?: boolean }) {
  const roof = landColor(p, "#5b4a4a", 0.2);
  const snow = landColor(p, SNOW, 0.15);
  const top = base - h;
  const lit = p.lights > 0;
  return (
    <g>
      <rect x={x + (flip ? 8 : w - 22)} y={top - 30} width={10} height={22} fill={roof} />
      {lit && (
        <g className="cz-smoke" opacity={0.5}>
          <circle cx={x + (flip ? 13 : w - 17)} cy={top - 40} r={6} fill={mix(p.haze, "#ffffff", 0.3)} />
        </g>
      )}
      <rect x={x} y={top} width={w} height={h} fill={body} />
      <path d={`M${x - 8},${top + 2} L${x + w / 2},${top - h * 0.55} L${x + w + 8},${top + 2} Z`} fill={roof} />
      <path d={`M${x - 10},${top + 2} L${x + w / 2},${top - h * 0.58} L${x + w + 10},${top + 2} L${x + w + 4},${top + 6} L${x + w / 2},${top - h * 0.45} L${x - 4},${top + 6} Z`} fill={snow} />
      {[0.22, 0.62].map((f, i) => (
        <rect
          key={i}
          x={x + w * f}
          y={top + h * 0.3}
          width={w * 0.18}
          height={h * 0.28}
          fill={lit ? "#ffcf7d" : mix(body, p.bottom, 0.5)}
          opacity={lit ? 0.6 + p.lights * 0.4 : 0.9}
        />
      ))}
      <rect x={x + w * 0.42} y={base - h * 0.42} width={w * 0.16} height={h * 0.42} fill={mix(body, "#000000", 0.35)} />
    </g>
  );
}

function Village({ p, id }: { p: SkyPalette; id: string }) {
  const hill = landColor(p, "#e3e9f1", 0.75);
  const hillShade = landColor(p, "#c9d3df", 0.6);
  const pine = landColor(p, "#38554a", 0.45);
  const ground = landColor(p, "#eef3f8", 0.15);
  const tower = landColor(p, "#a7a19a", 0.45);
  return (
    <>
      <g style={drift(0.85)}>
        <path d="M-40,360 C80,300 200,310 300,340 C400,300 520,280 760,330 L760,570 L-40,570 Z" fill={hill} />
        <path d="M-40,390 C120,350 260,370 380,380 C520,350 640,360 760,370 L760,570 L-40,570 Z" fill={hillShade} />
      </g>
      <Haze p={p} id={id} y={280} h={140} k={0.9} />
      <g style={drift(0.6)}>
        {VILLAGE_TREES.map((t, i) => (
          <g key={i}>
            <path d={pinePath(t.x, 410, t.h, t.w)} fill={pine} />
            <path d={pinePath(t.x, 410 - t.h * 0.45, t.h * 0.55, t.w * 0.55)} fill={landColor(p, SNOW, 0.45)} opacity="0.85" />
          </g>
        ))}
        {/* Church tower */}
        <rect x={420} y={300} width={34} height={110} fill={tower} />
        <path d="M414,302 L437,240 L460,302 Z" fill={landColor(p, "#6b5d5a", 0.45)} />
        <path d="M418,300 L437,250 L440,258 L424,300 Z" fill={landColor(p, SNOW, 0.4)} />
        <circle cx={437} cy={326} r={7} fill={p.lights > 0 ? "#ffe2a2" : mix(tower, "#ffffff", 0.3)} opacity={0.6 + p.lights * 0.4} />
      </g>
      <g style={drift(0.4)}>
        <rect x={-40} y={440} width={W + 80} height={H - 440} fill={ground} />
        <House x={70} base={470} w={78} h={60} body={landColor(p, "#b9675a", 0.3)} p={p} />
        <House x={250} base={460} w={66} h={52} body={landColor(p, "#d9b56c", 0.35)} p={p} flip />
        <House x={500} base={475} w={84} h={64} body={landColor(p, "#7d93ad", 0.3)} p={p} />
        <House x={640} base={462} w={60} h={50} body={landColor(p, "#c98a6a", 0.35)} p={p} flip />
      </g>
      <g style={drift(0.25)}>
        {p.lights > 0 &&
          [140, 380, 600].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy={500} rx={60} ry={26} fill={`url(#${id}-warm)`} opacity={p.lights * 0.7} />
              <rect x={x - 1.5} y={478} width={3} height={28} fill={landColor(p, "#3a3a40", 0.15)} />
              <circle cx={x} cy={477} r={4} fill="#ffe3a8" />
            </g>
          ))}
        <path d={`M-40,520 C120,500 300,530 420,515 C560,500 660,520 760,510 L760,${H} L-40,${H} Z`} fill={landColor(p, "#f4f7fb", 0.05)} />
        <path d={pinePath(10, 600, 260, 130)} fill={landColor(p, "#2c4438", 0.1)} />
        <path d={pinePath(10, 470, 130, 64)} fill={landColor(p, SNOW, 0.1)} opacity="0.9" />
        <path d={pinePath(712, 600, 290, 140)} fill={landColor(p, "#2c4438", 0.1)} />
        <path d={pinePath(712, 450, 140, 70)} fill={landColor(p, SNOW, 0.1)} opacity="0.9" />
      </g>
    </>
  );
}

/* ---------------------------------- view ---------------------------------- */

export function WindowView({ view, palette, idPrefix, svgRef, className }: { view: ViewId; palette: SkyPalette; idPrefix: string; svgRef?: Ref<SVGSVGElement>; className?: string }) {
  const p = palette;
  const id = idPrefix;
  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <Sky p={p} id={id} />
      {view === "city" && <City p={p} id={id} />}
      {view === "forest" && <Forest p={p} id={id} />}
      {view === "lake" && <Lake p={p} id={id} />}
      {view === "sea" && <Sea p={p} id={id} />}
      {view === "village" && <Village p={p} id={id} />}
      {/* Overall atmosphere: fog veils everything a little. */}
      <rect width={W} height={H} fill={p.haze} opacity={p.fog * 0.28} />
    </svg>
  );
}
