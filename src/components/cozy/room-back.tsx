import { memo } from "react";
import { ARCH_CX, FLOOR_Y, SCENE_H, SCENE_W, archPath } from "./geometry";
import { darken, lighten, mix, type Shade } from "./palette";
import { seeded } from "./rng";
import { floorColor, wallColor, type RoomLook } from "./state";

/* -----------------------------------------------------------------------------
   Back layer: the wall (with optional wallpaper), floorboards and the deep
   window reveal. Everything else sits in front of this.
----------------------------------------------------------------------------- */

const VANISH_Y = 430;
const FRONT_K = (SCENE_H - VANISH_Y) / (FLOOR_Y - VANISH_Y);

const PLANKS = (() => {
  const out: { x0: number; x1: number }[] = [];
  for (let x = -900; x < SCENE_W + 900; x += 52) out.push({ x0: x, x1: x + 52 });
  return out;
})();

const JOINTS = (() => {
  const r = seeded(91);
  return PLANKS.map(() => [r(), r()]);
})();

const GRAIN = (() => {
  const r = seeded(5);
  return Array.from({ length: 22 }, () => ({ x: r() * SCENE_W, y: FLOOR_Y + 20 + r() * 180 }));
})();

const toFront = (x: number) => ARCH_CX + (x - ARCH_CX) * FRONT_K;

function Wallpaper({ kind, base, s }: { kind: RoomLook["wallpaper"]; base: string; s: Shade }) {
  const ink = s(darken(base, 0.12));
  const soft = s(lighten(base, 0.25));
  switch (kind) {
    case "stripes":
      return (
        <pattern id="cz-wp" width="64" height="64" patternUnits="userSpaceOnUse">
          <rect width="26" height="64" fill={ink} opacity="0.35" />
          <rect x="30" width="3" height="64" fill={soft} opacity="0.6" />
        </pattern>
      );
    case "dots":
      return (
        <pattern id="cz-wp" width="48" height="48" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="3.2" fill={ink} opacity="0.5" />
          <circle cx="36" cy="36" r="3.2" fill={soft} opacity="0.8" />
        </pattern>
      );
    case "stars":
      return (
        <pattern id="cz-wp" width="96" height="96" patternUnits="userSpaceOnUse">
          <path d="M20,14 l2.4,6 6,2.4 -6,2.4 -2.4,6 -2.4,-6 -6,-2.4 6,-2.4 Z" fill={soft} opacity="0.9" />
          <path d="M68,60 l1.8,4.5 4.5,1.8 -4.5,1.8 -1.8,4.5 -1.8,-4.5 -4.5,-1.8 4.5,-1.8 Z" fill={ink} opacity="0.45" />
          <circle cx="70" cy="22" r="2" fill={soft} opacity="0.8" />
          <circle cx="30" cy="74" r="1.6" fill={ink} opacity="0.4" />
        </pattern>
      );
    case "leaves":
      return (
        <pattern id="cz-wp" width="110" height="110" patternUnits="userSpaceOnUse">
          <g fill="none" stroke={ink} strokeWidth="2" opacity="0.5" strokeLinecap="round">
            <path d="M24,70 C30,52 36,40 50,28" />
            <path d="M80,104 C86,92 90,82 98,72" />
          </g>
          <g fill={ink} opacity="0.32">
            <path d="M32,56 c-10,-2 -14,-10 -12,-16 c8,2 12,8 12,16 Z" />
            <path d="M38,46 c10,-4 14,-12 12,-18 c-8,2 -12,10 -12,18 Z" />
            <path d="M44,36 c-8,-4 -10,-12 -6,-18 c6,4 8,10 6,18 Z" />
            <path d="M86,90 c8,-2 12,-8 10,-14 c-6,2 -10,8 -10,14 Z" />
          </g>
          <circle cx="78" cy="30" r="3" fill={soft} opacity="0.8" />
        </pattern>
      );
    case "check":
      return (
        <pattern id="cz-wp" width="56" height="56" patternUnits="userSpaceOnUse">
          <rect width="28" height="56" fill={ink} opacity="0.18" />
          <rect width="56" height="28" fill={ink} opacity="0.18" />
        </pattern>
      );
    default:
      return null;
  }
}

function RoomBackImpl({ room, shade }: { room: RoomLook; shade: Shade }) {
  const s = shade;
  const base = wallColor(room.wall);
  const wall = s(base);
  const wood = floorColor(room.floor);
  const floor = s(wood);
  const floorDark = s(darken(wood, 0.12));
  const floorLight = s(lighten(wood, 0.08));
  const trim = s("#f3ece1");
  const reveal = s(darken(base, 0.22));
  return (
    <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} className="absolute inset-0 h-full w-full" aria-hidden preserveAspectRatio="none">
      <defs>
        <Wallpaper kind={room.wallpaper} base={base} s={s} />
        <linearGradient id="cz-wallshade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.16" />
          <stop offset="0.35" stopColor="#000" stopOpacity="0" />
          <stop offset="0.85" stopColor="#000" stopOpacity="0.02" />
          <stop offset="1" stopColor="#000" stopOpacity="0.14" />
        </linearGradient>
        <linearGradient id="cz-wallside" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.18" />
          <stop offset="0.18" stopColor="#000" stopOpacity="0" />
          <stop offset="0.82" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="cz-floorshade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.32" />
          <stop offset="0.25" stopColor="#000" stopOpacity="0.08" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width={SCENE_W} height={FLOOR_Y} fill={wall} />
      {room.wallpaper !== "plain" && room.wallpaper !== "panels" && <rect width={SCENE_W} height={FLOOR_Y} fill="url(#cz-wp)" />}
      {room.wallpaper === "panels" && (
        <g>
          <rect y={500} width={SCENE_W} height={FLOOR_Y - 500} fill={s(mix(wood, base, 0.25))} />
          {Array.from({ length: 16 }, (_, i) => (
            <rect key={i} x={i * 104 + 14} y={530} width={78} height={220} rx={4} fill="none" stroke={s(darken(wood, 0.18))} strokeWidth="3" opacity="0.6" />
          ))}
          <rect y={490} width={SCENE_W} height={14} fill={s(lighten(wood, 0.1))} />
          <rect y={503} width={SCENE_W} height={4} fill="#000" opacity="0.12" />
        </g>
      )}
      <rect width={SCENE_W} height={FLOOR_Y} fill="url(#cz-wallshade)" />
      <rect width={SCENE_W} height={FLOOR_Y} fill="url(#cz-wallside)" />

      {/* crown moulding */}
      <rect width={SCENE_W} height={16} fill={trim} />
      <rect y={16} width={SCENE_W} height={5} fill="#000" opacity="0.08" />

      {/* window reveal: the depth of the wall around the glass */}
      <path d={archPath(18, 8)} fill={reveal} />
      <path d={archPath(18, 8)} fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="6" />

      {/* floor */}
      <rect y={FLOOR_Y} width={SCENE_W} height={SCENE_H - FLOOR_Y} fill={floor} />
      {PLANKS.map((p, i) => {
        const tone = i % 3 === 0 ? floorDark : i % 3 === 1 ? floorLight : floor;
        const a = toFront(p.x0);
        const b = toFront(p.x1);
        const [j1, j2] = JOINTS[i];
        const jy = FLOOR_Y + (SCENE_H - FLOOR_Y) * (0.15 + j1 * 0.7);
        const t = (jy - FLOOR_Y) / (SCENE_H - FLOOR_Y);
        const jx0 = p.x0 + (a - p.x0) * t;
        const jx1 = p.x1 + (b - p.x1) * t;
        return (
          <g key={i}>
            <path d={`M${p.x0},${FLOOR_Y} L${p.x1},${FLOOR_Y} L${b},${SCENE_H} L${a},${SCENE_H} Z`} fill={tone} opacity={0.55 + j2 * 0.2} />
            <path d={`M${p.x0},${FLOOR_Y} L${a},${SCENE_H}`} stroke={s(darken(wood, 0.3))} strokeWidth="1.6" opacity="0.45" />
            <path d={`M${jx0},${jy} L${jx1},${jy}`} stroke={s(darken(wood, 0.3))} strokeWidth="1.4" opacity="0.4" />
          </g>
        );
      })}
      {GRAIN.map((g, i) => (
        <path key={`g${i}`} d={`M${g.x},${g.y} q20,-2 44,0`} stroke={s(lighten(wood, 0.2))} strokeWidth="1.2" fill="none" opacity="0.35" />
      ))}
      <rect y={FLOOR_Y} width={SCENE_W} height={SCENE_H - FLOOR_Y} fill="url(#cz-floorshade)" />

      {/* skirting board */}
      <rect y={FLOOR_Y - 22} width={SCENE_W} height={24} fill={trim} />
      <rect y={FLOOR_Y - 22} width={SCENE_W} height={3} fill="#fff" opacity="0.35" />
      <rect y={FLOOR_Y + 2} width={SCENE_W} height={6} fill="#000" opacity="0.14" />
    </svg>
  );
}

export const RoomBack = memo(RoomBackImpl);
