import { rand, randRange } from "./rng";
import type { Weather } from "./state";

/* -----------------------------------------------------------------------------
   Raindrops on the window glass.

   - Tiny droplets and a soft condensation film live on persistent layers.
   - Bigger drops sit still until they are heavy enough, then slide down in
     little stop-start runs, merging with anything they touch.
   - A sliding drop wipes a clear path through the droplets and the mist and
     leaves a few beads behind it.
   - Each drop shows a tiny upside-down picture of the view behind it, just
     like a real lens of water, when a background image is available.
----------------------------------------------------------------------------- */

type Drop = {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  moving: boolean;
  /** distance travelled since the last bead was left behind */
  trail: number;
  stall: number;
  dead: boolean;
};

type Mode = {
  dropRate: number;
  maxDrops: number;
  minR: number;
  maxR: number;
  slideR: number;
  dropletRate: number;
  mist: number;
  frost: boolean;
  dry: boolean;
};

const MODES: Record<Weather, Mode> = {
  rain: { dropRate: 5, maxDrops: 120, minR: 1.5, maxR: 7.2, slideR: 4.3, dropletRate: 80, mist: 0.16, frost: false, dry: false },
  storm: { dropRate: 12, maxDrops: 180, minR: 1.7, maxR: 8.4, slideR: 4, dropletRate: 170, mist: 0.2, frost: false, dry: false },
  snow: { dropRate: 0.12, maxDrops: 14, minR: 1.4, maxR: 4.6, slideR: 4.3, dropletRate: 5, mist: 0.3, frost: true, dry: false },
  fog: { dropRate: 0.45, maxDrops: 36, minR: 1.2, maxR: 5.2, slideR: 4.4, dropletRate: 26, mist: 0.3, frost: false, dry: false },
  clear: { dropRate: 0, maxDrops: 30, minR: 1, maxR: 4, slideR: 9, dropletRate: 0, mist: 0.035, frost: false, dry: true },
};

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Shading for one drop: dark rim, bright inner crescent at the bottom and a glint near the top. */
function makeShadeSprite(highlight: string) {
  const s = 96;
  const c = makeCanvas(s, s);
  const g = c.getContext("2d")!;
  const r = s / 2;
  // Rim: transparent middle, darker edge (a bit heavier at the top where the drop is thinner).
  const rim = g.createRadialGradient(r, r * 1.08, r * 0.2, r, r, r);
  rim.addColorStop(0, "rgba(0,0,0,0)");
  rim.addColorStop(0.62, "rgba(0,0,0,0.04)");
  rim.addColorStop(0.86, "rgba(10,14,24,0.28)");
  rim.addColorStop(1, "rgba(10,14,24,0.5)");
  g.fillStyle = rim;
  g.beginPath();
  g.arc(r, r, r, 0, Math.PI * 2);
  g.fill();
  // Bright crescent along the bottom inner edge (light focused through the drop).
  g.save();
  g.beginPath();
  g.arc(r, r, r, 0, Math.PI * 2);
  g.clip();
  const cres = g.createRadialGradient(r, r * 0.55, r * 0.7, r, r * 0.7, r * 1.2);
  cres.addColorStop(0, "rgba(255,255,255,0)");
  cres.addColorStop(0.7, "rgba(255,255,255,0)");
  cres.addColorStop(0.85, "rgba(255,255,255,0.28)");
  cres.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = cres;
  g.fillRect(0, r, s, r);
  g.restore();
  // Glint
  g.fillStyle = highlight;
  g.beginPath();
  g.ellipse(r * 0.68, r * 0.55, r * 0.2, r * 0.13, -0.6, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 0.5;
  g.beginPath();
  g.arc(r * 1.3, r * 1.42, r * 0.07, 0, Math.PI * 2);
  g.fill();
  return c;
}

/** A tiny bead for the droplet layer. */
function makeBeadSprite() {
  const s = 24;
  const c = makeCanvas(s, s);
  const g = c.getContext("2d")!;
  const r = s / 2;
  const grad = g.createRadialGradient(r, r * 1.15, 0, r, r, r);
  grad.addColorStop(0, "rgba(255,255,255,0.22)");
  grad.addColorStop(0.55, "rgba(200,210,225,0.12)");
  grad.addColorStop(0.85, "rgba(20,24,34,0.28)");
  grad.addColorStop(1, "rgba(20,24,34,0)");
  g.fillStyle = grad;
  g.beginPath();
  g.arc(r, r, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.75)";
  g.beginPath();
  g.arc(r * 0.72, r * 0.66, r * 0.18, 0, Math.PI * 2);
  g.fill();
  return c;
}

export class GlassDrops {
  private ctx: CanvasRenderingContext2D;
  private w = 1;
  private h = 1;
  private dpr = 1;
  private scale = 1;
  private mode: Mode = MODES.rain;
  private reduced = false;
  private drops: Drop[] = [];
  private spawnAcc = 0;
  private beadAcc = 0;
  private dryAcc = 0;
  private fogAcc = 0;
  /** Only fill the glass once we know the real weather. */
  private ready = false;

  /** droplets that never move, drawn once onto their own layer */
  private beads!: HTMLCanvasElement;
  private beadsCtx!: CanvasRenderingContext2D;
  /** where sliding drops have wiped the glass; fades back over time */
  private wipes!: HTMLCanvasElement;
  private wipesCtx!: CanvasRenderingContext2D;
  /** condensation film, rebuilt when the mode or colour changes */
  private mistTex!: HTMLCanvasElement;
  private scratch!: HTMLCanvasElement;
  private scratchCtx!: CanvasRenderingContext2D;

  private shade = makeShadeSprite("rgba(255,255,255,0.9)");
  private bead = makeBeadSprite();
  private bg: HTMLCanvasElement | null = null;
  private mistRgb = "226,232,240";
  private highlight = "rgba(255,255,255,0.9)";

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.allocate();
  }

  private allocate() {
    const pw = this.w * this.dpr;
    const ph = this.h * this.dpr;
    this.beads = makeCanvas(pw, ph);
    this.beadsCtx = this.beads.getContext("2d")!;
    this.wipes = makeCanvas(pw, ph);
    this.wipesCtx = this.wipes.getContext("2d")!;
    this.scratch = makeCanvas(pw, ph);
    this.scratchCtx = this.scratch.getContext("2d")!;
    this.buildMist();
  }

  resize(w: number, h: number, dpr: number) {
    const oldW = this.w;
    const oldH = this.h;
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.dpr = dpr;
    this.scale = Math.min(1.7, Math.max(0.75, this.w / 420));
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    const fresh = this.drops.length === 0;
    for (const d of this.drops) {
      d.x *= this.w / oldW;
      d.y *= this.h / oldH;
    }
    this.allocate();
    if (fresh && this.ready) this.prefill();
    else if (this.ready) this.sprinkleBeads(Math.round(this.mode.dropletRate * 5));
  }

  configure(weather: Weather, reduced: boolean, mistRgb: string, highlight: string) {
    const prev = this.mode;
    this.mode = MODES[weather];
    this.reduced = reduced;
    const highlightChanged = highlight !== this.highlight;
    const mistChanged = mistRgb !== this.mistRgb;
    this.mistRgb = mistRgb;
    this.highlight = highlight;
    if (highlightChanged) this.shade = makeShadeSprite(highlight);
    if (prev !== this.mode || mistChanged) this.buildMist();
    const first = !this.ready;
    this.ready = true;
    if ((first || prev !== this.mode) && !this.mode.dry && this.drops.length < 6) this.prefill();
  }

  /** The view behind the glass, already aligned to the glass rectangle. */
  setBackground(bg: HTMLCanvasElement | null) {
    this.bg = bg;
  }

  private prefill() {
    const m = this.mode;
    if (m.dry) return;
    this.sprinkleBeads(Math.round(m.dropletRate * 9));
    const n = Math.round(m.maxDrops * 0.55);
    for (let i = 0; i < n; i++) this.drops.push(this.newDrop(rand() * this.h));
  }

  private newDrop(y: number): Drop {
    const m = this.mode;
    const r = (m.minR + (m.maxR - m.minR) * Math.pow(rand(), 2.6)) * this.scale;
    return { x: rand() * this.w, y, r, vy: 0, vx: 0, moving: false, trail: 0, stall: 0, dead: false };
  }

  private sprinkleBeads(count: number) {
    const g = this.beadsCtx;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    for (let i = 0; i < count; i++) {
      const r = randRange(0.35, 1.5) * this.scale;
      this.drawBead(g, rand() * this.w, rand() * this.h, r);
    }
  }

  private drawBead(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
    g.drawImage(this.bead, x - r, y - r, r * 2, r * 2);
  }

  private buildMist() {
    const pw = Math.max(1, Math.round(this.w * this.dpr));
    const ph = Math.max(1, Math.round(this.h * this.dpr));
    const c = makeCanvas(pw, ph);
    const g = c.getContext("2d")!;
    const a = this.mode.mist;
    // Base film, heavier towards the bottom where condensation gathers.
    const v = g.createLinearGradient(0, 0, 0, ph);
    v.addColorStop(0, `rgba(${this.mistRgb},${a * 0.7})`);
    v.addColorStop(0.7, `rgba(${this.mistRgb},${a})`);
    v.addColorStop(1, `rgba(${this.mistRgb},${Math.min(0.85, a * 1.9)})`);
    g.fillStyle = v;
    g.fillRect(0, 0, pw, ph);
    // Edges and corners fog up more.
    const e = g.createRadialGradient(pw / 2, ph * 0.45, Math.min(pw, ph) * 0.3, pw / 2, ph * 0.5, Math.max(pw, ph) * 0.75);
    e.addColorStop(0, `rgba(${this.mistRgb},0)`);
    e.addColorStop(1, `rgba(${this.mistRgb},${this.mode.frost ? 0.75 : a * 1.4})`);
    g.fillStyle = e;
    g.fillRect(0, 0, pw, ph);
    if (this.mode.frost) {
      // Soft frost creeping in from the bottom corners: a white bloom plus fine feathery lines.
      for (const cx of [0, pw]) {
        const f = g.createRadialGradient(cx, ph, 0, cx, ph, Math.min(pw, ph) * 0.55);
        f.addColorStop(0, "rgba(255,255,255,0.5)");
        f.addColorStop(0.6, "rgba(255,255,255,0.12)");
        f.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = f;
        g.fillRect(0, 0, pw, ph);
      }
      g.lineCap = "round";
      for (let i = 0; i < 140; i++) {
        const left = rand() < 0.5;
        const reach = Math.pow(rand(), 1.6) * Math.min(pw, ph) * 0.42;
        const ang = randRange(-Math.PI / 2, 0);
        const x = left ? Math.cos(ang) * reach : pw - Math.cos(ang) * reach;
        const y = ph + Math.sin(ang) * reach;
        const len = randRange(3, 9) * this.dpr;
        const dir = randRange(0, Math.PI * 2);
        g.strokeStyle = `rgba(255,255,255,${randRange(0.12, 0.3)})`;
        g.lineWidth = randRange(0.35, 0.8) * this.dpr;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(dir) * len, y + Math.sin(dir) * len);
        g.moveTo(x + Math.cos(dir) * len * 0.5, y + Math.sin(dir) * len * 0.5);
        g.lineTo(x + Math.cos(dir + 0.8) * len * 0.5, y + Math.sin(dir + 0.8) * len * 0.5);
        g.stroke();
      }
    }
    this.mistTex = c;
  }

  step(dt: number) {
    const m = this.mode;
    const slow = this.reduced ? 0.4 : 1;

    // New drops and beads land on the glass.
    this.spawnAcc += m.dropRate * slow * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.drops.length < m.maxDrops) this.drops.push(this.newDrop(rand() * this.h * 0.95));
    }
    this.beadAcc += m.dropletRate * slow * dt * Math.min(2, (this.w * this.h) / (420 * 340));
    const beadCount = Math.floor(this.beadAcc);
    if (beadCount > 0) {
      this.beadAcc -= beadCount;
      this.sprinkleBeads(beadCount);
    }

    const wg = this.wipesCtx;
    const bg = this.beadsCtx;
    wg.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    bg.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Wiped paths slowly mist over again.
    this.fogAcc += dt;
    if (this.fogAcc > 0.25) {
      wg.save();
      wg.globalCompositeOperation = "destination-out";
      wg.fillStyle = `rgba(0,0,0,${0.012 * (this.fogAcc / 0.25)})`;
      wg.fillRect(0, 0, this.w, this.h);
      wg.restore();
      this.fogAcc = 0;
    }

    // In clear weather the glass slowly dries.
    if (m.dry) {
      this.dryAcc += dt;
      if (this.dryAcc > 0.5) {
        bg.save();
        bg.globalCompositeOperation = "destination-out";
        bg.fillStyle = "rgba(0,0,0,0.02)";
        bg.fillRect(0, 0, this.w, this.h);
        bg.restore();
        this.dryAcc = 0;
      }
    }

    const gravity = 34 * this.scale * slow;
    for (const d of this.drops) {
      if (d.dead) continue;
      if (m.dry) {
        d.r -= 0.05 * dt * this.scale;
        if (d.r < 0.6) d.dead = true;
      }
      if (!d.moving) {
        // Heavy drops let go of the glass after a while.
        const heavy = d.r / (m.slideR * this.scale);
        if (heavy > 1 && rand() < dt * 0.6 * heavy) {
          d.moving = true;
          d.vy = 2;
        } else continue;
      }

      // Stop-start sliding: drops catch on the glass now and then.
      if (d.stall > 0) {
        d.stall -= dt;
        continue;
      }
      if (!this.reduced && rand() < dt * 0.9) {
        d.stall = randRange(0.05, 0.5);
        d.vy *= 0.25;
        d.vx = randRange(-1, 1) * d.r * 1.6;
        continue;
      }
      d.vy = Math.min(d.vy + gravity * (d.r / this.scale / 4) * dt, 260 * this.scale * slow);
      d.vx *= 0.92;
      const px = d.x;
      const py = d.y;
      d.y += d.vy * dt;
      d.x += d.vx * dt;
      const moved = d.y - py;

      // Clear a path through beads and mist.
      bg.save();
      bg.globalCompositeOperation = "destination-out";
      bg.lineCap = "round";
      bg.lineWidth = d.r * 1.7;
      bg.beginPath();
      bg.moveTo(px, py);
      bg.lineTo(d.x, d.y);
      bg.stroke();
      bg.restore();
      wg.lineCap = "round";
      wg.strokeStyle = "rgba(0,0,0,1)";
      wg.lineWidth = d.r * 1.5;
      wg.beginPath();
      wg.moveTo(px, py);
      wg.lineTo(d.x, d.y);
      wg.stroke();

      // Leave beads behind, and shrink a little doing so.
      d.trail += moved;
      if (d.trail > d.r * 1.6) {
        d.trail = 0;
        const br = d.r * randRange(0.18, 0.34);
        this.drawBead(bg, d.x + randRange(-0.3, 0.3) * d.r, d.y - d.r * 1.2, br);
        d.r = Math.max(1, d.r - br * 0.06);
        if (rand() < 0.08 && this.drops.length < m.maxDrops * 1.4) {
          this.drops.push({ x: d.x, y: d.y - d.r * 1.8, r: d.r * randRange(0.35, 0.5), vy: 0, vx: 0, moving: false, trail: 0, stall: 0, dead: false });
        }
      }
      // Gather up the little beads along the way.
      d.r = Math.min(m.maxR * 1.5 * this.scale, d.r + moved * 0.004 * (m.dropletRate / 60));
      if (d.y - d.r > this.h) d.dead = true;
    }

    // Merging: a moving drop swallows whatever it touches.
    for (const a of this.drops) {
      if (!a.moving || a.dead) continue;
      for (const b of this.drops) {
        if (b === a || b.dead) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const reach = (a.r + b.r) * 0.85;
        if (dx > reach || dx < -reach || dy > reach || dy < -reach) continue;
        if (dx * dx + dy * dy < reach * reach) {
          const big = a.r >= b.r ? a : b;
          const small = big === a ? b : a;
          big.r = Math.min(m.maxR * 1.6 * this.scale, Math.sqrt(big.r * big.r + small.r * small.r * 0.8));
          big.vy = Math.max(big.vy, small.vy) + small.r * 3;
          big.moving = true;
          if (big !== a) {
            big.x = (big.x + a.x) / 2;
          }
          small.dead = true;
        }
      }
    }
    if (this.drops.some((d) => d.dead)) this.drops = this.drops.filter((d) => !d.dead);
  }

  draw() {
    const { ctx } = this;
    const pw = this.canvas.width;
    const ph = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, pw, ph);

    // Mist with the wiped paths cut out of it.
    const s = this.scratchCtx;
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.globalCompositeOperation = "source-over";
    s.clearRect(0, 0, pw, ph);
    s.drawImage(this.mistTex, 0, 0);
    s.globalCompositeOperation = "destination-out";
    s.drawImage(this.wipes, 0, 0);
    s.globalCompositeOperation = "source-over";
    ctx.drawImage(this.scratch, 0, 0);

    ctx.drawImage(this.beads, 0, 0);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const bg = this.bg;
    const bx = bg ? bg.width / this.w : 1;
    const by = bg ? bg.height / this.h : 1;
    for (const d of this.drops) {
      const ry = d.moving ? d.r * 1.18 : d.r;
      const rx = d.moving ? d.r * 0.92 : d.r;
      if (bg && d.r > 1.6) {
        // The world through a drop is small and upside down.
        const k = 5;
        const sw = Math.min(bg.width, rx * 2 * k * bx);
        const sh = Math.min(bg.height, ry * 2 * k * by);
        const sx = Math.min(bg.width - sw, Math.max(0, d.x * bx - sw / 2));
        const sy = Math.min(bg.height - sh, Math.max(0, d.y * by - sh / 2));
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.translate(d.x, d.y);
        ctx.scale(-1, -1);
        ctx.drawImage(bg, sx, sy, sw, sh, -rx, -ry, rx * 2, ry * 2);
        ctx.restore();
      } else {
        ctx.fillStyle = "rgba(210,220,235,0.18)";
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.drawImage(this.shade, d.x - rx * 1.04, d.y - ry * 1.04, rx * 2.08, ry * 2.08);
    }
  }
}
