import { rand, randRange } from "./rng";
import type { TimeOfDay, Weather } from "./state";

/* -----------------------------------------------------------------------------
   Rain, snow and drifting fog seen through the window, drawn on a canvas.
   Plain class (no React) so the animation loop never re-renders anything.
----------------------------------------------------------------------------- */

type Streak = { x: number; y: number; z: number; len: number };
type Flake = { x: number; y: number; z: number; phase: number; sway: number };
type FogBlob = { x: number; y: number; w: number; h: number; v: number; a: number };
type Bolt = { pts: [number, number][][]; age: number };
type Shooting = { x: number; y: number; vx: number; vy: number; age: number };

const LAYERS = 3;

export class OutsideWeather {
  private ctx: CanvasRenderingContext2D;
  private w = 1;
  private h = 1;
  private dpr = 1;
  private weather: Weather = "rain";
  private time: TimeOfDay = "evening";
  private reduced = false;
  private color = "238,242,248";
  private fogColor = "220,225,232";
  private streaks: Streak[] = [];
  private flakes: Flake[] = [];
  private fogs: FogBlob[] = [];
  private fogSprite: HTMLCanvasElement;
  private bolt: Bolt | null = null;
  private shooting: Shooting | null = null;
  private nextShooting = 12;
  private t = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.fogSprite = document.createElement("canvas");
    this.fogSprite.width = 256;
    this.fogSprite.height = 128;
    const g = this.fogSprite.getContext("2d")!;
    const grad = g.createRadialGradient(128, 64, 0, 128, 64, 128);
    grad.addColorStop(0, "rgba(255,255,255,0.9)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.4)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.setTransform(1, 0, 0, 0.5, 0, 32);
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
  }

  resize(w: number, h: number, dpr: number) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.dpr = dpr;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.populate();
  }

  configure(weather: Weather, time: TimeOfDay, reduced: boolean, rainRgb: string, fogRgb: string) {
    const changed = weather !== this.weather || reduced !== this.reduced;
    this.weather = weather;
    this.time = time;
    this.reduced = reduced;
    this.color = rainRgb;
    this.fogColor = fogRgb;
    if (changed) this.populate();
  }

  private areaScale() {
    return Math.min(2.2, Math.max(0.5, (this.w * this.h) / (420 * 340)));
  }

  private populate() {
    const a = this.areaScale();
    const slow = this.reduced ? 0.5 : 1;
    const rainCount = this.weather === "storm" ? 300 : this.weather === "rain" ? 120 : 0;
    this.streaks = Array.from({ length: Math.round(rainCount * a * slow) }, () => this.newStreak(true));
    const snowCount = this.weather === "snow" ? 170 : 0;
    this.flakes = Array.from({ length: Math.round(snowCount * a * slow) }, () => ({
      x: rand() * this.w,
      y: rand() * this.h,
      z: rand(),
      phase: rand() * Math.PI * 2,
      sway: randRange(4, 16),
    }));
    const fogCount = this.weather === "fog" ? 9 : this.weather === "clear" ? 0 : 4;
    this.fogs = Array.from({ length: fogCount }, (_, i) => ({
      x: rand() * this.w,
      y: this.h * (0.35 + (i / Math.max(1, fogCount)) * 0.6) + randRange(-20, 20),
      w: this.w * randRange(0.7, 1.3),
      h: this.h * randRange(0.25, 0.45),
      v: randRange(3, 10) * (rand() < 0.5 ? -1 : 1),
      a: randRange(0.5, 1),
    }));
  }

  private newStreak(anywhere: boolean): Streak {
    const z = rand();
    return {
      x: randRange(-this.w * 0.3, this.w * 1.05),
      y: anywhere ? rand() * this.h : randRange(-this.h * 0.3, -10),
      z,
      len: 8 + z * 22 + rand() * 6,
    };
  }

  private wind() {
    const base = this.weather === "storm" ? 0.28 : 0.12;
    return base + Math.sin(this.t * 0.35) * (this.weather === "storm" ? 0.08 : 0.03);
  }

  /** A soft distant bolt, drawn for a moment. */
  strike() {
    if (this.reduced) return;
    const pts: [number, number][][] = [];
    let x = randRange(this.w * 0.15, this.w * 0.85);
    let y = 0;
    const main: [number, number][] = [[x, y]];
    const end = this.h * randRange(0.35, 0.55);
    while (y < end) {
      y += randRange(8, 18);
      x += randRange(-10, 10);
      main.push([x, y]);
      if (rand() < 0.12) {
        const branch: [number, number][] = [[x, y]];
        let bx = x;
        let by = y;
        for (let i = 0; i < 4; i++) {
          bx += randRange(-14, 14);
          by += randRange(6, 14);
          branch.push([bx, by]);
        }
        pts.push(branch);
      }
    }
    pts.unshift(main);
    this.bolt = { pts, age: 0 };
  }

  step(dt: number) {
    this.t += dt;
    const speedK = (this.reduced ? 0.45 : 1) * (this.h / 340);
    const wind = this.wind();
    for (const s of this.streaks) {
      const v = (520 + s.z * 820) * speedK;
      s.y += v * dt;
      s.x += v * wind * dt;
      if (s.y - s.len > this.h || s.x > this.w + 40) Object.assign(s, this.newStreak(false));
    }
    const snowK = this.reduced ? 0.5 : 1;
    for (const f of this.flakes) {
      f.y += (16 + f.z * 40) * dt * snowK;
      f.phase += dt * (0.4 + f.z * 0.6) * snowK;
      f.x += Math.sin(f.phase) * f.sway * dt * 0.6 + 6 * dt;
      if (f.y > this.h + 4) {
        f.y = -4;
        f.x = rand() * this.w;
      }
      if (f.x > this.w + 4) f.x = -4;
    }
    for (const b of this.fogs) {
      b.x += b.v * dt * (this.reduced ? 0.5 : 1);
      if (b.x - b.w / 2 > this.w) b.x = -b.w / 2;
      if (b.x + b.w / 2 < 0) b.x = this.w + b.w / 2;
    }
    if (this.bolt) {
      this.bolt.age += dt;
      if (this.bolt.age > 0.55) this.bolt = null;
    }
    // A shooting star now and then on clear nights.
    if (this.weather === "clear" && this.time !== "day" && !this.reduced) {
      this.nextShooting -= dt;
      if (this.nextShooting <= 0 && !this.shooting) {
        this.shooting = { x: randRange(this.w * 0.2, this.w * 0.9), y: randRange(this.h * 0.05, this.h * 0.3), vx: -randRange(220, 320), vy: randRange(60, 110), age: 0 };
        this.nextShooting = randRange(14, 30);
      }
    }
    if (this.shooting) {
      const s = this.shooting;
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.age > 0.9) this.shooting = null;
    }
  }

  draw() {
    const { ctx, w, h } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Drifting fog banks
    if (this.fogs.length) {
      const strength = this.weather === "fog" ? 0.42 : this.weather === "snow" ? 0.14 : 0.1;
      ctx.save();
      // Tint the white sprite by drawing it, then colouring with source-atop is costly; a light fill is enough.
      for (const b of this.fogs) {
        ctx.globalAlpha = strength * b.a;
        ctx.drawImage(this.fogSprite, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
      }
      ctx.globalCompositeOperation = "source-atop";
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = `rgb(${this.fogColor})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    if (this.shooting) {
      const s = this.shooting;
      const a = Math.sin((s.age / 0.9) * Math.PI);
      const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.18, s.y - s.vy * 0.18);
      grad.addColorStop(0, `rgba(255,250,230,${0.9 * a})`);
      grad.addColorStop(1, "rgba(255,250,230,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 0.18, s.y - s.vy * 0.18);
      ctx.stroke();
    }

    if (this.bolt) {
      const a = this.bolt.age < 0.08 ? this.bolt.age / 0.08 : Math.max(0, 1 - (this.bolt.age - 0.08) / 0.47);
      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = `rgba(214,226,255,${0.28 * a})`;
      ctx.lineWidth = 5;
      for (const line of this.bolt.pts) this.polyline(line);
      ctx.strokeStyle = `rgba(245,248,255,${0.75 * a})`;
      ctx.lineWidth = 1.3;
      for (const line of this.bolt.pts) this.polyline(line);
      ctx.restore();
    }

    // Rain, batched by depth so each layer is a single stroke call.
    if (this.streaks.length) {
      const wind = this.wind();
      ctx.lineCap = "round";
      for (let layer = 0; layer < LAYERS; layer++) {
        const lo = layer / LAYERS;
        const hi = (layer + 1) / LAYERS;
        const zMid = (lo + hi) / 2;
        ctx.strokeStyle = `rgba(${this.color},${0.1 + zMid * 0.32})`;
        ctx.lineWidth = 0.6 + zMid * 0.9;
        ctx.beginPath();
        for (const s of this.streaks) {
          if (s.z < lo || s.z >= hi) continue;
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(s.x - s.len * wind, s.y - s.len);
        }
        ctx.stroke();
      }
    }

    if (this.flakes.length) {
      for (let layer = 0; layer < LAYERS; layer++) {
        const lo = layer / LAYERS;
        const hi = (layer + 1) / LAYERS;
        const zMid = (lo + hi) / 2;
        ctx.fillStyle = `rgba(255,255,255,${0.45 + zMid * 0.5})`;
        ctx.beginPath();
        for (const f of this.flakes) {
          if (f.z < lo || f.z >= hi) continue;
          const r = 0.7 + f.z * 2.1;
          ctx.moveTo(f.x + r, f.y);
          ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    }
  }

  private polyline(line: [number, number][]) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(line[0][0], line[0][1]);
    for (let i = 1; i < line.length; i++) ctx.lineTo(line[i][0], line[i][1]);
    ctx.stroke();
  }
}
