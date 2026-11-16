import * as THREE from "three";
import type { Pattern } from "./types";

// Every texture is drawn on a canvas at runtime (no image files, no network).

const cache = new Map<string, THREE.Texture>();

/** Deterministic random numbers so patterns look the same every visit. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  return { c, ctx };
}

function finish(c: HTMLCanvasElement, repeat = false, anisotropy = 4) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  t.needsUpdate = true;
  return t;
}

function shade(hex: string, amt: number) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt)));
  return `#${c.getHexString()}`;
}
export { shade };

/** Soft fibre noise so surfaces read as plush rather than plastic. */
function furNoise(ctx: CanvasRenderingContext2D, w: number, h: number, base: string, rand: () => number, amount = 1) {
  const light = shade(base, 0.08);
  const dark = shade(base, -0.08);
  ctx.lineCap = "round";
  for (let i = 0; i < 1400 * amount; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const len = 2 + rand() * 4;
    const a = Math.PI / 2 + (rand() - 0.5) * 0.9;
    ctx.strokeStyle = rand() > 0.5 ? light : dark;
    ctx.globalAlpha = 0.18 + rand() * 0.18;
    ctx.lineWidth = 1 + rand();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rand: () => number, w: number) {
  // A soft organic patch made of overlapping circles, wrapped horizontally.
  const n = 5 + Math.floor(rand() * 4);
  for (let k = 0; k < n; k++) {
    const a = rand() * Math.PI * 2;
    const d = rand() * r * 0.6;
    const rr = r * (0.45 + rand() * 0.45);
    for (const ox of [-w, 0, w]) {
      ctx.beginPath();
      ctx.arc(x + ox + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, rr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Body texture with markings. Material colour stays white; the map carries the colours. */
export function patternTexture(body: string, accent: string, pattern: Pattern, seed = 7) {
  const key = `pat:${body}:${accent}:${pattern}:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 512;
  const H = 256;
  const { c, ctx } = canvas(W, H);
  const rand = seeded(seed * 9973 + body.length * 31);
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = accent;
  if (pattern === "spots") {
    for (let i = 0; i < 26; i++) {
      const x = rand() * W;
      const y = 30 + rand() * (H - 60);
      const r = 7 + rand() * 13;
      for (const ox of [-W, 0, W]) {
        ctx.beginPath();
        ctx.ellipse(x + ox, y, r, r * 0.85, rand(), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (pattern === "patches") {
    for (let i = 0; i < 4; i++) blob(ctx, rand() * W, 40 + rand() * (H - 80), 34 + rand() * 26, rand, W);
  } else if (pattern === "stripes") {
    ctx.strokeStyle = accent;
    ctx.lineCap = "round";
    const n = 14;
    for (let i = 0; i < n; i++) {
      const x0 = (i / n) * W;
      ctx.lineWidth = 7 + rand() * 6;
      ctx.beginPath();
      for (let y = 18; y <= H - 18; y += 8) {
        const x = x0 + Math.sin(y * 0.045 + i) * 6;
        if (y === 18) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  furNoise(ctx, W, H, body, rand, 0.9);
  const t = finish(c);
  cache.set(key, t);
  return t;
}

export function furTexture(color: string) {
  const key = `fur:${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { c, ctx } = canvas(256, 128);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 128);
  furNoise(ctx, 256, 128, color, seeded(color.length * 17 + 3), 0.35);
  const t = finish(c);
  cache.set(key, t);
  return t;
}

/** Turtle shell: soft hexagon plates. */
export function shellTexture(color: string, seed = 3) {
  const key = `shell:${color}:${seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const W = 512;
  const H = 256;
  const { c, ctx } = canvas(W, H);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  const light = shade(color, 0.12);
  const dark = shade(color, -0.14);
  const cols = 6;
  const rows = 3;
  for (let r = 0; r < rows; r++) {
    for (let q = 0; q <= cols; q++) {
      const cx = (q + (r % 2) * 0.5) * (W / cols);
      const cy = 30 + r * 70;
      const rad = 34 - r * 4;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const x = cx + Math.cos(a) * rad;
        const y = cy + Math.sin(a) * rad * 0.82;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = light;
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = dark;
      ctx.stroke();
    }
  }
  // Rim band near the bottom of the dome.
  ctx.fillStyle = dark;
  ctx.fillRect(0, H - 34, W, 34);
  furNoise(ctx, W, H, color, seeded(seed), 0.2);
  const t = finish(c);
  cache.set(key, t);
  return t;
}

export function stripeTexture(a: string, b: string, n = 8, vertical = false) {
  const key = `stripe:${a}:${b}:${n}:${vertical}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { c, ctx } = canvas(256, 256);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? b : a;
    if (vertical) ctx.fillRect((i * 256) / n, 0, 256 / n + 1, 256);
    else ctx.fillRect(0, (i * 256) / n, 256, 256 / n + 1);
  }
  const t = finish(c, true);
  cache.set(key, t);
  return t;
}

export function knitTexture(color: string) {
  const key = `knit:${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { c, ctx } = canvas(256, 256);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  const dark = shade(color, -0.1);
  const light = shade(color, 0.08);
  for (let y = 0; y < 256; y += 16) {
    for (let x = 0; x < 256; x += 16) {
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.ellipse(x + 5, y + 8, 3.5, 7, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + 11, y + 8, 3.5, 7, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(x + 7.5, y, 1, 16);
    }
  }
  const t = finish(c, true);
  t.repeat.set(3, 2);
  cache.set(key, t);
  return t;
}

/** Radial soft dot, used for the blob shadow under the pet, glows and light pools. */
export function radialTexture(inner: string, outer: string, key2 = "") {
  const key = `rad:${inner}:${outer}:${key2}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { c, ctx } = canvas(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = finish(c);
  cache.set(key, t);
  return t;
}

export function gradientTexture(stops: [number, string][], key2: string) {
  const key = `grad:${key2}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { c, ctx } = canvas(4, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const t = finish(c);
  cache.set(key, t);
  return t;
}

/** Little floating symbols: Zzz, music notes, "!" and "?". */
export function glyphTexture(glyph: string, color: string) {
  const key = `glyph:${glyph}:${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { c, ctx } = canvas(128, 128);
  ctx.font = "bold 92px ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 14;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.strokeText(glyph, 64, 70);
  ctx.fillStyle = color;
  ctx.fillText(glyph, 64, 70);
  const t = finish(c);
  cache.set(key, t);
  return t;
}

// ---------------------------------------------------------------------------
// Room surfaces
// ---------------------------------------------------------------------------

export function wallTexture(id: string) {
  const key = `wall:${id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const S = 512;
  const { c, ctx } = canvas(S, S);
  const rand = seeded(id.length * 101 + id.charCodeAt(0));
  const fill = (col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(0, 0, S, S);
  };
  let rx = 3;
  let ry = 2;
  switch (id) {
    case "sunny": {
      fill("#fff1d2");
      ctx.fillStyle = "#ffe4b3";
      for (let y = 0; y < S; y += 64)
        for (let x = 0; x < S; x += 64) {
          ctx.beginPath();
          ctx.arc(x + ((y / 64) % 2) * 32 + 16, y + 32, 9, 0, Math.PI * 2);
          ctx.fill();
        }
      break;
    }
    case "stripes": {
      fill("#f4fbf7");
      ctx.fillStyle = "#d4f0e2";
      for (let x = 0; x < S; x += 64) ctx.fillRect(x, 0, 32, S);
      ctx.fillStyle = "#c2e8d5";
      for (let x = 30; x < S; x += 64) ctx.fillRect(x, 0, 3, S);
      rx = 4;
      ry = 1;
      break;
    }
    case "polka": {
      fill("#ffd9c9");
      ctx.fillStyle = "#fff6f0";
      for (let y = 0; y < S; y += 64)
        for (let x = 0; x < S; x += 64) {
          ctx.beginPath();
          ctx.arc(x + ((y / 64) % 2) * 32 + 16, y + 16, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      break;
    }
    case "check": {
      fill("#fbe8da");
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#cf5f4a";
      for (let x = 0; x < S; x += 128) ctx.fillRect(x, 0, 48, S);
      for (let y = 0; y < S; y += 128) ctx.fillRect(0, y, S, 48);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = "#ffffff";
      for (let x = 60; x < S; x += 128) ctx.fillRect(x, 0, 6, S);
      for (let y = 60; y < S; y += 128) ctx.fillRect(0, y, S, 6);
      ctx.globalAlpha = 1;
      break;
    }
    case "leaves": {
      fill("#dcead4");
      for (let i = 0; i < 46; i++) {
        const x = rand() * S;
        const y = rand() * S;
        const a = rand() * Math.PI * 2;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a);
        ctx.fillStyle = rand() > 0.5 ? "#a9cf9b" : "#bcd9ae";
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#8fbf80";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-20, 0);
        ctx.lineTo(20, 0);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case "lilac": {
      fill("#e8def8");
      for (let i = 0; i < 60; i++) {
        const x = rand() * S;
        const y = rand() * S;
        ctx.fillStyle = rand() > 0.5 ? "#fff" : "#d7c6f2";
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#f6d37a";
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "sky": {
      const g = ctx.createLinearGradient(0, 0, 0, S);
      g.addColorStop(0, "#c6e2fb");
      g.addColorStop(1, "#eef6fd");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      for (let i = 0; i < 7; i++) {
        const x = rand() * S;
        const y = rand() * S;
        for (let k = 0; k < 5; k++) {
          ctx.beginPath();
          ctx.arc(x + k * 14 - 28, y + Math.sin(k) * 6, 14 + (k % 2) * 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ry = 1;
      break;
    }
    case "stars": {
      fill("#323d68");
      for (let i = 0; i < 80; i++) {
        const x = rand() * S;
        const y = rand() * S;
        const r = 1 + rand() * 2.5;
        ctx.fillStyle = rand() > 0.3 ? "#ffe9a8" : "#ffffff";
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffe9a8";
      for (let i = 0; i < 6; i++) {
        const x = rand() * S;
        const y = rand() * S;
        ctx.beginPath();
        ctx.arc(x, y, 11, 0.6, Math.PI * 1.7);
        ctx.arc(x + 5, y - 3, 9, Math.PI * 1.5, 0.4, true);
        ctx.fill();
      }
      break;
    }
    case "tiles":
    default: {
      fill("#d3edf2");
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      for (let i = 0; i <= S; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, S);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(S, i);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      for (let y = 0; y < S; y += 64) for (let x = 0; x < S; x += 64) ctx.fillRect(x + 8, y + 8, 18, 6);
      rx = 4;
      ry = 3;
    }
  }
  const t = finish(c, true, 8);
  t.repeat.set(rx, ry);
  cache.set(key, t);
  return t;
}

export function floorTexture(id: string) {
  const key = `floor:${id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const S = 512;
  const { c, ctx } = canvas(S, S);
  const rand = seeded(id.length * 53 + id.charCodeAt(1));
  let rep = 3;
  const planks = (a: string, b: string, line: string) => {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, S, S);
    const ph = 64;
    for (let y = 0; y < S; y += ph) {
      const off = rand() * S;
      for (let k = 0; k < 2; k++) {
        const x = (off + k * (S / 2)) % S;
        ctx.fillStyle = k % 2 ? a : b;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(x, y, S / 2, ph);
        ctx.globalAlpha = 1;
        ctx.fillStyle = line;
        ctx.fillRect(x, y, 3, ph);
      }
      ctx.fillStyle = line;
      ctx.fillRect(0, y, S, 3);
      ctx.globalAlpha = 0.12;
      for (let g = 0; g < 10; g++) {
        ctx.fillStyle = line;
        ctx.fillRect(0, y + 8 + rand() * (ph - 16), S, 1);
      }
      ctx.globalAlpha = 1;
    }
  };
  switch (id) {
    case "walnut":
      planks("#a8724a", "#9a6843", "#7d5236");
      break;
    case "checker": {
      const n = 8;
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          ctx.fillStyle = (x + y) % 2 ? "#cdeedd" : "#fffaf0";
          ctx.fillRect((x * S) / n, (y * S) / n, S / n, S / n);
        }
      rep = 2;
      break;
    }
    case "carpet": {
      ctx.fillStyle = "#e6dcf4";
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 9000; i++) {
        ctx.fillStyle = rand() > 0.5 ? "#d9cdee" : "#f1ebfa";
        ctx.fillRect(rand() * S, rand() * S, 2, 2);
      }
      rep = 2;
      break;
    }
    case "tiles": {
      ctx.fillStyle = "#f4f9fa";
      ctx.fillRect(0, 0, S, S);
      ctx.strokeStyle = "#cfdbe0";
      ctx.lineWidth = 4;
      for (let i = 0; i <= S; i += 128) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, S);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(S, i);
        ctx.stroke();
      }
      rep = 3;
      break;
    }
    case "terrazzo": {
      ctx.fillStyle = "#f6efe6";
      ctx.fillRect(0, 0, S, S);
      const cols = ["#f4a99a", "#9fc7e8", "#f6d37a", "#a9d9b8", "#d6c2ee"];
      for (let i = 0; i < 220; i++) {
        ctx.fillStyle = cols[Math.floor(rand() * cols.length)];
        ctx.beginPath();
        const x = rand() * S;
        const y = rand() * S;
        const r = 3 + rand() * 7;
        ctx.moveTo(x + r, y);
        for (let k = 1; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          const rr = r * (0.6 + rand() * 0.5);
          ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.fill();
      }
      rep = 2;
      break;
    }
    case "rose": {
      ctx.fillStyle = "#f8d3de";
      ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 7000; i++) {
        ctx.fillStyle = rand() > 0.5 ? "#f3c2d1" : "#fbe3ea";
        ctx.fillRect(rand() * S, rand() * S, 2, 2);
      }
      rep = 2;
      break;
    }
    case "oak":
    default:
      planks("#e8c99c", "#dfbd8c", "#c9a170");
  }
  const t = finish(c, true, 8);
  t.repeat.set(rep, rep);
  cache.set(key, t);
  return t;
}

export function groundTexture(kind: "grass" | "sand" | "moss") {
  const key = `ground:${kind}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const S = 512;
  const { c, ctx } = canvas(S, S);
  const rand = seeded(kind.length * 77);
  const base = kind === "grass" ? "#9fd58a" : kind === "moss" ? "#86b97a" : "#f3dfb4";
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  if (kind === "sand") {
    for (let i = 0; i < 14000; i++) {
      ctx.fillStyle = rand() > 0.5 ? "#ead2a2" : "#fbeccb";
      ctx.fillRect(rand() * S, rand() * S, 2, 2);
    }
  } else {
    const a = kind === "grass" ? "#8cc777" : "#73a868";
    const b = kind === "grass" ? "#b4e29d" : "#9acb8c";
    for (let i = 0; i < 9000; i++) {
      const x = rand() * S;
      const y = rand() * S;
      ctx.strokeStyle = rand() > 0.5 ? a : b;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 3, y - 4 - rand() * 4);
      ctx.stroke();
    }
  }
  const t = finish(c, true, 8);
  t.repeat.set(8, 8);
  cache.set(key, t);
  return t;
}

export function woodTexture(color = "#c99a6b") {
  const key = `wood:${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { c, ctx } = canvas(256, 256);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  const rand = seeded(11);
  ctx.strokeStyle = shade(color, -0.08);
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 30; i++) {
    ctx.lineWidth = 1 + rand() * 2;
    ctx.beginPath();
    const y = rand() * 256;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(80, y + (rand() - 0.5) * 20, 170, y + (rand() - 0.5) * 20, 256, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const t = finish(c, true);
  cache.set(key, t);
  return t;
}

export function waterTexture() {
  const key = "water";
  const hit = cache.get(key);
  if (hit) return hit;
  const S = 256;
  const { c, ctx } = canvas(S, S);
  ctx.fillStyle = "#7fd0e6";
  ctx.fillRect(0, 0, S, S);
  const rand = seeded(5);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 40; i++) {
    const x = rand() * S;
    const y = rand() * S;
    ctx.beginPath();
    ctx.arc(x, y, 8 + rand() * 18, Math.PI * 1.1, Math.PI * 1.6);
    ctx.stroke();
  }
  const t = finish(c, true);
  t.repeat.set(4, 4);
  cache.set(key, t);
  return t;
}

/** Goldfish fin: deeper colour at the base, fading to a pale tip, with soft fin rays. */
export function finTexture(base: string, tip: string) {
  const key = `fin:${base}:${tip}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { c, ctx } = canvas(256, 256);
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, base);
  g.addColorStop(1, tip);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = shade(base, -0.12);
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  for (let i = 0; i < 14; i++) {
    const a = (i / 13) * Math.PI * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, 256);
    ctx.quadraticCurveTo(Math.cos(a) * 140, 256 - Math.sin(a) * 140, Math.cos(a) * 360, 256 - Math.sin(a) * 360);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const t = finish(c);
  t.flipY = false;
  cache.set(key, t);
  return t;
}
