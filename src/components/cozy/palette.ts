import type { ObjectsState, TimeOfDay, Weather } from "./state";

/* -----------------------------------------------------------------------------
   Colour helpers and lighting. Instead of costly blend-mode overlays, every
   room colour is passed through a "shade" function that tints it for the time
   of day, weather and which lights are on.
----------------------------------------------------------------------------- */

export type RGB = [number, number, number];

const cache = new Map<string, RGB>();

export function hexToRgb(hex: string): RGB {
  const hit = cache.get(hex);
  if (hit) return hit;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h, 16);
  const rgb: RGB = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  cache.set(hex, rgb);
  return rgb;
}

const clamp = (v: number, lo = 0, hi = 255) => Math.min(hi, Math.max(lo, v));

export function rgbToHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((v) => Math.round(clamp(v)).toString(16).padStart(2, "0")).join("");
}

export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

export const darken = (hex: string, t: number) => mix(hex, "#1a1420", t);
export const lighten = (hex: string, t: number) => mix(hex, "#ffffff", t);

export type Shade = (hex: string) => string;

/** Builds a shade function: multiplies by the ambient tint, then adds a little warm light. */
export function makeShade(tint: RGB, warm: RGB = [0, 0, 0]): Shade {
  const memo = new Map<string, string>();
  return (hex: string) => {
    const hit = memo.get(hex);
    if (hit) return hit;
    const [r, g, b] = hexToRgb(hex);
    const out = rgbToHex([r * tint[0] + warm[0] * r * 0.9, g * tint[1] + warm[1] * g * 0.9, b * tint[2] + warm[2] * b * 0.9]);
    memo.set(hex, out);
    return out;
  };
}

const AMBIENT: Record<TimeOfDay, Record<Weather, RGB>> = {
  day: {
    rain: [0.9, 0.92, 0.98],
    storm: [0.78, 0.81, 0.9],
    snow: [0.96, 0.97, 1.02],
    fog: [0.9, 0.91, 0.94],
    clear: [1.02, 1, 0.95],
  },
  evening: {
    rain: [0.6, 0.52, 0.66],
    storm: [0.5, 0.47, 0.62],
    snow: [0.68, 0.64, 0.78],
    fog: [0.62, 0.58, 0.68],
    clear: [0.76, 0.6, 0.62],
  },
  night: {
    rain: [0.25, 0.26, 0.43],
    storm: [0.21, 0.22, 0.37],
    snow: [0.3, 0.32, 0.48],
    fog: [0.27, 0.27, 0.39],
    clear: [0.25, 0.27, 0.47],
  },
};

const LIGHT_WEIGHT: Record<TimeOfDay, number> = { day: 0.12, evening: 0.55, night: 1 };

export type RoomLighting = {
  shade: Shade;
  /** 0..1 how much warm lamps show (stronger when it is dark). */
  glow: number;
  time: TimeOfDay;
};

export function roomLighting(time: TimeOfDay, weather: Weather, objects: ObjectsState, decor: Set<string>): RoomLighting {
  const tint = AMBIENT[time][weather];
  const w = LIGHT_WEIGHT[time];
  const lamp = objects.lamp && decor.has("lamp") ? 0.24 : 0;
  const fairy = objects.fairy && decor.has("fairyLights") ? 0.09 : 0;
  const candles = objects.candles && decor.has("candles") ? 0.06 : 0;
  const moon = objects.moon && decor.has("moonLamp") ? 0.05 : 0;
  const laptop = objects.laptop && decor.has("desk") ? 0.03 : 0;
  const amount = (lamp + fairy + candles + moon) * w;
  const warm: RGB = [amount * 0.34, amount * 0.22, amount * 0.08 + laptop * w * 0.5];
  return { shade: makeShade(tint, warm), glow: w, time };
}

/* ------------------------------- the outdoors ------------------------------ */

export type SkyPalette = {
  top: string;
  mid: string;
  bottom: string;
  cloud: string;
  /** Atmosphere colour that distant layers fade into. */
  haze: string;
  /** Multiplier applied to landscape colours. */
  tint: RGB;
  /** How far layers fade into the haze (0..1). */
  fog: number;
  /** Visibility of lit windows, street lights and lighthouse beams (0..1). */
  lights: number;
  stars: number;
  moon: number;
  sun: number;
  overcast: number;
  snowy: boolean;
  rainColor: string;
};

type SkyBase = [top: string, mid: string, bottom: string, cloud: string];

const SKY: Record<TimeOfDay, Record<Weather, SkyBase>> = {
  day: {
    rain: ["#7f8ea6", "#a7b2c3", "#c8cfd8", "#9aa4b4"],
    storm: ["#525c70", "#727b8d", "#9199a6", "#5d6677"],
    snow: ["#aab5c4", "#c9d1db", "#e4e8ee", "#bfc7d3"],
    fog: ["#b9c0c8", "#cdd2d7", "#dde0e3", "#c9ced4"],
    clear: ["#5f9fdc", "#94c3ea", "#d4e9f6", "#ffffff"],
  },
  evening: {
    rain: ["#4f4d6c", "#8b7489", "#d3a08f", "#6f6380"],
    storm: ["#34324a", "#5a4c63", "#8e6e78", "#463f57"],
    snow: ["#6e6b8f", "#a990a6", "#e8bdb0", "#8f84a3"],
    fog: ["#8a849d", "#b5a1ac", "#dcbfb4", "#a39aae"],
    clear: ["#344283", "#9a6f9e", "#f3a77a", "#f7c7a0"],
  },
  night: {
    rain: ["#111829", "#1d2840", "#2e3a56", "#232c43"],
    storm: ["#0b0f1c", "#141b2d", "#222a40", "#1a2133"],
    snow: ["#1c2440", "#2c3758", "#47527a", "#2d3655"],
    fog: ["#222838", "#2e3446", "#3f4659", "#373d4f"],
    clear: ["#070c26", "#121c45", "#243569", "#1a2450"],
  },
};

const OUT_TINT: Record<TimeOfDay, RGB> = {
  day: [0.98, 1, 1.02],
  evening: [0.74, 0.62, 0.72],
  night: [0.24, 0.29, 0.44],
};

const FOG: Record<Weather, number> = { rain: 0.28, storm: 0.36, snow: 0.34, fog: 0.62, clear: 0.08 };

export function skyPalette(time: TimeOfDay, weather: Weather): SkyPalette {
  const [top, mid, bottom, cloud] = SKY[time][weather];
  const clear = weather === "clear";
  return {
    top,
    mid,
    bottom,
    cloud,
    haze: mix(mid, bottom, 0.55),
    tint: OUT_TINT[time],
    fog: FOG[weather],
    lights: time === "night" ? 1 : time === "evening" ? 0.75 : weather === "storm" ? 0.2 : 0,
    stars: clear ? (time === "night" ? 1 : time === "evening" ? 0.35 : 0) : 0,
    moon: clear ? (time === "night" ? 1 : time === "evening" ? 0.6 : 0) : 0,
    sun: clear && time === "day" ? 1 : 0,
    overcast: clear ? 0 : weather === "storm" ? 1 : weather === "fog" ? 0.5 : 0.8,
    snowy: weather === "snow",
    rainColor: time === "night" ? "#b8c8e8" : time === "evening" ? "#eadde6" : "#eef2f8",
  };
}

/** Colour for a landscape layer at a given depth (0 near, 1 far). */
export function landColor(p: SkyPalette, base: string, depth: number): string {
  const [r, g, b] = hexToRgb(base);
  const tinted = rgbToHex([r * p.tint[0], g * p.tint[1], b * p.tint[2]]);
  return mix(tinted, p.haze, Math.min(0.92, depth * (0.35 + p.fog * 0.9)));
}
