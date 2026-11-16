import { memo, type Ref } from "react";
import { FAIRY_ARCH, FAIRY_GARLAND } from "./decor";
import { ARCH_CX, ARCH_CY, SCENE_H, SCENE_W } from "./geometry";
import type { ObjectsState, TimeOfDay, Weather } from "./state";

/* -----------------------------------------------------------------------------
   Light on top of the room: soft glows (plain alpha blending, which keeps it
   smooth on phones; blend modes over animated canvases are costly), shadows
   and a vignette. The lightning flash is animated from outside.
----------------------------------------------------------------------------- */

const WINDOW_LIGHT: Record<TimeOfDay, { color: string; a: number }> = {
  day: { color: "#e6efff", a: 0.3 },
  evening: { color: "#c3b4ff", a: 0.07 },
  night: { color: "#8ea6ff", a: 0.06 },
};

const SHADOW: Record<TimeOfDay, { vignette: number; top: number }> = {
  day: { vignette: 0.2, top: 0.08 },
  evening: { vignette: 0.42, top: 0.22 },
  night: { vignette: 0.6, top: 0.34 },
};

function LightingImpl({
  time,
  weather,
  objects,
  decor,
  glow,
  still,
  flashRef,
}: {
  time: TimeOfDay;
  weather: Weather;
  objects: ObjectsState;
  decor: Set<string>;
  glow: number;
  still: boolean;
  flashRef: Ref<SVGRectElement>;
}) {
  const win = WINDOW_LIGHT[time];
  const winA = win.a * (weather === "clear" ? 1.15 : weather === "storm" ? 0.7 : 1) * (objects.curtainsDrawn && decor.has("curtains") ? 0.7 : 1);
  const lamp = decor.has("lamp") && objects.lamp;
  const candles = decor.has("candles") && objects.candles;
  const fairy = decor.has("fairyLights") && objects.fairy;
  const moon = decor.has("moonLamp") && decor.has("bookshelf") && objects.moon;
  const laptop = decor.has("desk") && objects.laptop;
  const g = Math.max(0.18, glow);
  const dark = SHADOW[time];
  const lightsOn = lamp || candles || fairy;
  return (
    <>
      <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden preserveAspectRatio="none">
        <defs>
          <radialGradient id="cz-l-vig" cx="0.5" cy="0.45" r="0.78">
            <stop offset="0.5" stopColor="#120b1c" stopOpacity="0" />
            <stop offset="1" stopColor="#120b1c" stopOpacity="1" />
          </radialGradient>
          <linearGradient id="cz-l-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#120b1c" stopOpacity="1" />
            <stop offset="0.45" stopColor="#120b1c" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cz-l-floor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#120b1c" stopOpacity="0.5" />
            <stop offset="0.12" stopColor="#120b1c" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* contact shadows under furniture */}
        <rect x={60} y={788} width={330} height={26} rx={13} fill="url(#cz-l-floor)" />
        <rect x={440} y={790} width={720} height={30} rx={14} fill="#120b1c" opacity="0.16" />
        {decor.has("desk") && <rect x={1296} y={790} width={330} height={20} rx={10} fill="#120b1c" opacity="0.12" />}
        <rect width={SCENE_W} height={SCENE_H} fill="url(#cz-l-top)" opacity={dark.top * (lightsOn ? 0.85 : 1)} />
        <rect width={SCENE_W} height={SCENE_H} fill="url(#cz-l-vig)" opacity={dark.vignette} />
      </svg>

      <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden preserveAspectRatio="none">
        <defs>
          <radialGradient id="cz-l-win" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={win.color} stopOpacity="1" />
            <stop offset="1" stopColor={win.color} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cz-l-warm" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffbf73" stopOpacity="1" />
            <stop offset="0.35" stopColor="#ffa457" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ff8f45" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cz-l-core" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffe6b4" stopOpacity="1" />
            <stop offset="0.45" stopColor="#ffc983" stopOpacity="0.45" />
            <stop offset="1" stopColor="#ffb867" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cz-l-bulb" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ffe3a0" stopOpacity="0.9" />
            <stop offset="0.35" stopColor="#ffd27a" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cz-l-cool" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#b9cfff" stopOpacity="1" />
            <stop offset="1" stopColor="#9db8ff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cz-l-moon" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fff2cf" stopOpacity="1" />
            <stop offset="1" stopColor="#fff2cf" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* light coming in through the window */}
        <ellipse cx={ARCH_CX} cy={ARCH_CY - 20} rx={time === "day" ? 560 : 400} ry={time === "day" ? 420 : 320} fill="url(#cz-l-win)" opacity={winA} />
        <ellipse cx={ARCH_CX} cy={872} rx={400} ry={84} fill="url(#cz-l-win)" opacity={winA * (time === "day" ? 1 : 1.6)} />

        {lamp && (
          <>
            <circle cx={424} cy={548} r={660} fill="url(#cz-l-warm)" opacity={0.38 * g + 0.05} />
            <circle cx={424} cy={548} r={220} fill="url(#cz-l-core)" opacity={0.6 * g + 0.1} />
            <ellipse cx={424} cy={650} rx={200} ry={56} fill="url(#cz-l-core)" opacity={0.4 * g} />
            <ellipse cx={430} cy={830} rx={280} ry={64} fill="url(#cz-l-warm)" opacity={0.5 * g} />
          </>
        )}
        {candles && (
          <g className={still ? undefined : "cz-flicker"}>
            <circle cx={386} cy={600} r={160} fill="url(#cz-l-warm)" opacity={0.45 * g} />
          </g>
        )}
        {fairy && (
          <g opacity={0.5 * g + 0.08}>
            {[...FAIRY_ARCH, ...FAIRY_GARLAND].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y + 4} r={15} fill="url(#cz-l-bulb)" />
            ))}
          </g>
        )}
        {moon && <circle cx={1530} cy={420} r={140} fill="url(#cz-l-moon)" opacity={0.45 * g} />}
        {laptop && <circle cx={1400} cy={548} r={200} fill="url(#cz-l-cool)" opacity={0.4 * g} />}

        <rect ref={flashRef} width={SCENE_W} height={SCENE_H} fill="#dfe8ff" opacity="0" />
      </svg>
    </>
  );
}

export const Lighting = memo(LightingImpl);
