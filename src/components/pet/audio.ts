import type { SoundKind } from "./species";
import type { Lighting, RoomId } from "./types";

// Every sound is synthesised with the Web Audio API. There are no audio files.

export type Sfx =
  | "crunch"
  | "slurp"
  | "splash"
  | "pop"
  | "squish"
  | "step"
  | "boing"
  | "chime"
  | "whoosh"
  | "bounce"
  | "yawn"
  | "snore"
  | "clap"
  | "fridge"
  | "tap"
  | "tada"
  | "shake"
  | "rub"
  | "nope"
  | "sparkle"
  | "found"
  | "kiss";

export type Mood = "hello" | "happy" | "sad" | "giggle" | "ask" | "content" | "excited" | "sleepy";

export type MicResult = { ok: true; buffer: AudioBuffer } | { ok: false; reason: "denied" | "unsupported" | "nomic" | "quiet" | "error" };

const rand = () => Math.random();

class Engine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private ambBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private loops = new Map<string, { stop: () => void }>();
  private sfxOn = true;
  private musicOn = false;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private nextNote = 0;
  private step = 0;
  private chord = 0;
  private ambTimer: ReturnType<typeof setInterval> | null = null;
  private ambRoom: RoomId | null = null;
  private ambLight: Lighting = "day";
  private ambBed: { stop: () => void } | null = null;
  private voiceAnalyser: AnalyserNode | null = null;
  private voiceData: Float32Array<ArrayBuffer> | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private lastStep = 0;

  /** Creates the AudioContext. Call from a user gesture only. */
  ensure() {
    if (typeof window === "undefined") return false;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return false;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0.8;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(ctx.destination);
      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = this.sfxOn ? 0.9 : 0;
      this.sfxBus.connect(this.master);
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 0;
      this.musicBus.connect(this.master);
      this.ambBus = ctx.createGain();
      this.ambBus.gain.value = this.sfxOn ? 0.5 : 0;
      this.ambBus.connect(this.master);
      const len = ctx.sampleRate * 2;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = rand() * 2 - 1;
      if (this.musicOn) this.startMusic();
      if (this.ambRoom) this.setAmbient(this.ambRoom, this.ambLight);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return true;
  }

  get ready() {
    return !!this.ctx;
  }

  setSfx(on: boolean) {
    this.sfxOn = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sfxBus.gain.setTargetAtTime(on ? 0.9 : 0, t, 0.05);
    this.ambBus.gain.setTargetAtTime(on ? 0.5 : 0, t, 0.3);
    if (!on) for (const l of this.loops.values()) l.stop();
    if (!on) this.loops.clear();
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    if (!this.ctx) return;
    this.musicBus.gain.setTargetAtTime(on ? 0.32 : 0, this.ctx.currentTime, 0.6);
    if (on) this.startMusic();
  }

  suspend(hidden: boolean) {
    if (!this.ctx) return;
    if (hidden) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  // ------------------------------------------------------------ building blocks

  private env(g: GainNode, t: number, vol: number, a: number, d: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  private tone(o: { f: number; to?: number; mid?: number; type?: OscillatorType; vol?: number; a?: number; d?: number; at?: number; vib?: number; vibRate?: number; filter?: { type: BiquadFilterType; f: number; q?: number }; bus?: AudioNode; pan?: number }) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + (o.at ?? 0);
    const a = o.a ?? 0.01;
    const d = o.d ?? 0.15;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(o.f, t);
    if (o.mid) osc.frequency.exponentialRampToValueAtTime(o.mid, t + (a + d) * 0.4);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + a + d);
    if (o.vib) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = o.vibRate ?? 7;
      lg.gain.value = o.vib;
      lfo.connect(lg).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + a + d + 0.05);
    }
    const g = ctx.createGain();
    this.env(g, t, o.vol ?? 0.2, a, d);
    let node: AudioNode = osc;
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = o.filter.type;
      f.frequency.value = o.filter.f;
      f.Q.value = o.filter.q ?? 1;
      node.connect(f);
      node = f;
    }
    node.connect(g);
    let out: AudioNode = g;
    if (o.pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = o.pan;
      g.connect(p);
      out = p;
    }
    out.connect(o.bus ?? this.sfxBus);
    osc.start(t);
    osc.stop(t + a + d + 0.05);
  }

  private noise(o: { type?: BiquadFilterType; f?: number; to?: number; q?: number; vol?: number; a?: number; d?: number; at?: number; bus?: AudioNode }) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + (o.at ?? 0);
    const a = o.a ?? 0.005;
    const d = o.d ?? 0.1;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? "bandpass";
    f.frequency.setValueAtTime(o.f ?? 1000, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + a + d);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    this.env(g, t, o.vol ?? 0.2, a, d);
    src.connect(f).connect(g).connect(o.bus ?? this.sfxBus);
    src.start(t, rand() * 1.5);
    src.stop(t + a + d + 0.05);
  }

  // ------------------------------------------------------------ effects

  play(name: Sfx, o: { pitch?: number; vol?: number } = {}) {
    if (!this.ctx || !this.sfxOn) return;
    const p = o.pitch ?? 1;
    const v = o.vol ?? 1;
    switch (name) {
      case "crunch":
        for (let i = 0; i < 3; i++) this.noise({ type: "bandpass", f: 2200 + rand() * 1500, q: 2, vol: 0.18 * v, d: 0.04, at: i * 0.07 });
        break;
      case "slurp":
        this.tone({ f: 380 * p, to: 820 * p, type: "sine", vol: 0.14 * v, a: 0.02, d: 0.16 });
        this.noise({ type: "lowpass", f: 1200, vol: 0.08 * v, d: 0.12 });
        break;
      case "splash":
        this.noise({ type: "lowpass", f: 3200, to: 500, vol: 0.32 * v, a: 0.01, d: 0.5 });
        this.noise({ type: "bandpass", f: 900, q: 0.8, vol: 0.12 * v, a: 0.02, d: 0.3, at: 0.05 });
        break;
      case "pop":
        this.tone({ f: (700 + rand() * 500) * p, to: 1500 * p, type: "sine", vol: 0.12 * v, a: 0.002, d: 0.05 });
        break;
      case "squish":
      case "rub":
        this.noise({ type: "bandpass", f: 700 + rand() * 500, q: 3, vol: 0.12 * v, a: 0.01, d: 0.09 });
        this.tone({ f: 500 * p, to: 300 * p, type: "sine", vol: 0.04 * v, d: 0.08 });
        break;
      case "step": {
        const now = this.ctx.currentTime;
        if (now - this.lastStep < 0.12) return;
        this.lastStep = now;
        this.noise({ type: "lowpass", f: 380, vol: 0.12 * v, d: 0.05 });
        break;
      }
      case "boing":
        this.tone({ f: 220 * p, to: 640 * p, type: "sine", vol: 0.14 * v, a: 0.01, d: 0.22, vib: 30, vibRate: 18 });
        break;
      case "chime":
      case "sparkle":
        [1046, 1318, 1568, 2093].forEach((f, i) => this.tone({ f: f * p, type: "triangle", vol: 0.07 * v, a: 0.005, d: 0.35, at: i * 0.06 }));
        break;
      case "tada":
      case "found":
        [523, 659, 784, 1046].forEach((f, i) => this.tone({ f, type: "triangle", vol: 0.1 * v, a: 0.01, d: 0.4, at: i * 0.09 }));
        this.tone({ f: 1046, type: "sine", vol: 0.06 * v, a: 0.01, d: 0.8, at: 0.36 });
        break;
      case "whoosh":
        this.noise({ type: "bandpass", f: 400, to: 2200, q: 1.5, vol: 0.14 * v, a: 0.05, d: 0.25 });
        break;
      case "bounce":
        this.tone({ f: 190 * p, to: 110 * p, type: "sine", vol: 0.16 * v, a: 0.002, d: 0.09 });
        break;
      case "yawn":
        this.tone({ f: 520 * p, mid: 600 * p, to: 230 * p, type: "sawtooth", vol: 0.05 * v, a: 0.15, d: 0.8, filter: { type: "lowpass", f: 900 } });
        break;
      case "snore":
        this.noise({ type: "lowpass", f: 260, vol: 0.1 * v, a: 0.5, d: 0.7 });
        break;
      case "clap":
        this.noise({ type: "highpass", f: 1200, vol: 0.26 * v, a: 0.002, d: 0.07 });
        this.tone({ f: 1568, type: "triangle", vol: 0.06 * v, d: 0.25, at: 0.04 });
        break;
      case "fridge":
        this.noise({ type: "lowpass", f: 300, vol: 0.18 * v, a: 0.005, d: 0.12 });
        this.tone({ f: 90, type: "sine", vol: 0.06 * v, a: 0.05, d: 0.6 });
        break;
      case "tap":
        this.tone({ f: 880 * p, to: 1200 * p, type: "sine", vol: 0.05 * v, a: 0.002, d: 0.05 });
        break;
      case "shake":
        for (let i = 0; i < 6; i++) this.noise({ type: "bandpass", f: 1800 + rand() * 1200, q: 1.5, vol: 0.08 * v, d: 0.05, at: i * 0.07 });
        break;
      case "nope":
        this.tone({ f: 300 * p, to: 200 * p, type: "triangle", vol: 0.12 * v, a: 0.01, d: 0.18 });
        this.tone({ f: 260 * p, to: 170 * p, type: "triangle", vol: 0.1 * v, a: 0.01, d: 0.2, at: 0.2 });
        break;
      case "kiss":
        this.tone({ f: 1800 * p, to: 900 * p, type: "sine", vol: 0.08 * v, a: 0.002, d: 0.06 });
        break;
    }
  }

  /** The pet's own voice, by species and mood. `pitch` lets each pet sound a little different. */
  voice(kind: SoundKind, mood: Mood = "happy", pitch = 1) {
    if (!this.ctx || !this.sfxOn) return;
    const p = pitch * (mood === "sad" || mood === "sleepy" ? 0.85 : mood === "excited" ? 1.15 : 1);
    const v = mood === "sleepy" ? 0.6 : 1;
    const times = mood === "excited" ? 3 : mood === "hello" || mood === "happy" ? 2 : 1;
    switch (kind) {
      case "bark":
        for (let i = 0; i < times; i++) {
          const at = i * 0.2;
          this.tone({ f: 420 * p, to: 230 * p, type: "sawtooth", vol: 0.18 * v, a: 0.01, d: mood === "sad" ? 0.35 : 0.12, at, filter: { type: "bandpass", f: 900, q: 1.4 } });
          this.noise({ type: "bandpass", f: 1400, q: 1, vol: 0.08 * v, d: 0.05, at });
        }
        if (mood === "sad" || mood === "ask") this.tone({ f: 900 * p, to: 700 * p, type: "sine", vol: 0.06, a: 0.05, d: 0.5, at: 0.15, vib: 15 });
        break;
      case "meow": {
        const d = mood === "giggle" ? 0.18 : mood === "content" ? 0.1 : 0.42;
        if (mood === "content" || mood === "sleepy") {
          this.purr(1.2);
          break;
        }
        for (let i = 0; i < (mood === "excited" ? 2 : 1); i++)
          this.tone({ f: 520 * p, mid: 780 * p, to: (mood === "ask" || mood === "sad" ? 480 : 600) * p, type: "sawtooth", vol: 0.12 * v, a: 0.04, d, at: i * 0.5, vib: 12, vibRate: 6, filter: { type: "bandpass", f: 1300, q: 2 } });
        break;
      }
      case "squeak":
        for (let i = 0; i < times + 1; i++) this.tone({ f: (1900 + rand() * 300) * p, to: 2600 * p, type: "sine", vol: 0.09 * v, a: 0.005, d: 0.06, at: i * 0.11 });
        break;
      case "wheek":
        for (let i = 0; i < times; i++) this.tone({ f: 900 * p, to: 2300 * p, type: "triangle", vol: 0.1 * v, a: 0.02, d: 0.26, at: i * 0.32, vib: 40, vibRate: 22 });
        break;
      case "chirp":
        for (let i = 0; i < times + 1; i++) this.tone({ f: (1900 + i * 200) * p, mid: 3100 * p, to: 2300 * p, type: "sine", vol: 0.09 * v, a: 0.01, d: 0.11, at: i * 0.14, vib: 80, vibRate: 30 });
        if (mood === "hello") this.tone({ f: 1200 * p, to: 1900 * p, type: "sine", vol: 0.08, a: 0.02, d: 0.3, at: 0.45 });
        break;
      case "quack":
        for (let i = 0; i < times; i++) {
          this.tone({ f: 300 * p, to: 210 * p, type: "sawtooth", vol: 0.16 * v, a: 0.01, d: 0.16, at: i * 0.22, vib: 40, vibRate: 32, filter: { type: "bandpass", f: 1250, q: 3.5 } });
        }
        break;
      case "bubble":
        for (let i = 0; i < times + 2; i++) this.tone({ f: (280 + rand() * 120) * p, to: (800 + rand() * 300) * p, type: "sine", vol: 0.1 * v, a: 0.005, d: 0.07, at: i * 0.1 + rand() * 0.04 });
        break;
      case "snuffle":
        for (let i = 0; i < 4 + times; i++) this.noise({ type: "bandpass", f: 1500 + rand() * 800, q: 2.5, vol: 0.12 * v, a: 0.005, d: 0.045, at: i * 0.09 });
        if (mood !== "sad") this.tone({ f: 1500 * p, to: 2100 * p, type: "sine", vol: 0.05, d: 0.06, at: 0.45 });
        break;
      case "click":
        for (let i = 0; i < 3 + times; i++) this.tone({ f: 2800 * p, type: "square", vol: 0.04 * v, a: 0.001, d: 0.015, at: i * 0.06 });
        this.tone({ f: 1500 * p, to: 2200 * p, type: "sine", vol: 0.06 * v, d: 0.08, at: 0.3 });
        break;
      case "hum":
        this.tone({ f: 170 * p, to: mood === "sad" ? 140 * p : 210 * p, type: "triangle", vol: 0.12 * v, a: 0.08, d: 0.5, vib: 4, vibRate: 5, filter: { type: "lowpass", f: 900 } });
        break;
      case "thump":
        this.tone({ f: 95, to: 50, type: "sine", vol: 0.22 * v, a: 0.002, d: 0.14 });
        this.noise({ type: "lowpass", f: 300, vol: 0.1 * v, d: 0.06 });
        if (mood !== "sad") this.tone({ f: 1400 * p, to: 1900 * p, type: "sine", vol: 0.05, d: 0.08, at: 0.2 });
        break;
    }
    if (mood === "giggle") {
      for (let i = 0; i < 4; i++) this.tone({ f: (1300 - i * 90) * p, to: (1100 - i * 90) * p, type: "triangle", vol: 0.07, a: 0.01, d: 0.07, at: 0.05 + i * 0.1, vib: 30, vibRate: 25 });
    }
  }

  purr(dur = 1.4) {
    const ctx = this.ctx;
    if (!ctx || !this.sfxOn) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 240;
    const am = ctx.createGain();
    am.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 24;
    const lg = ctx.createGain();
    lg.gain.value = 0.5;
    lfo.connect(lg).connect(am.gain);
    const g = ctx.createGain();
    this.env(g, t, 0.35, 0.2, dur);
    src.connect(f).connect(am).connect(g).connect(this.sfxBus);
    src.start(t);
    lfo.start(t);
    src.stop(t + dur + 0.3);
    lfo.stop(t + dur + 0.3);
  }

  /** Continuous sounds: the shower and the hairdryer. */
  loop(name: "shower" | "dryer", on: boolean) {
    const ctx = this.ctx;
    const existing = this.loops.get(name);
    if (!on) {
      existing?.stop();
      this.loops.delete(name);
      return;
    }
    if (!ctx || existing || !this.sfxOn) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(name === "shower" ? 0.12 : 0.1, t + 0.3);
    let osc: OscillatorNode | null = null;
    if (name === "shower") {
      f.type = "bandpass";
      f.frequency.value = 3500;
      f.Q.value = 0.4;
    } else {
      f.type = "bandpass";
      f.frequency.value = 1400;
      f.Q.value = 0.7;
      osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = 190;
      const og = ctx.createGain();
      og.gain.value = 0.015;
      osc.connect(og).connect(this.sfxBus);
      osc.start(t);
    }
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t);
    this.loops.set(name, {
      stop: () => {
        const n = ctx.currentTime;
        g.gain.setTargetAtTime(0.0001, n, 0.08);
        src.stop(n + 0.4);
        osc?.stop(n + 0.1);
      },
    });
  }

  // ------------------------------------------------------------ ambience

  setAmbient(room: RoomId | null, light: Lighting) {
    this.ambRoom = room;
    this.ambLight = light;
    const ctx = this.ctx;
    if (!ctx) return;
    this.ambBed?.stop();
    this.ambBed = null;
    if (this.ambTimer) clearInterval(this.ambTimer);
    this.ambTimer = null;
    if (!room) return;
    // A soft continuous bed for each place.
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    g.gain.value = 0;
    let level = 0.02;
    let lfoRate = 0;
    if (room === "beach") {
      f.type = "lowpass";
      f.frequency.value = 700;
      level = 0.16;
      lfoRate = 0.11;
    } else if (room === "forest" || room === "garden") {
      f.type = "bandpass";
      f.frequency.value = 900;
      f.Q.value = 0.5;
      level = room === "forest" ? 0.05 : 0.03;
      lfoRate = 0.07;
    } else {
      f.type = "lowpass";
      f.frequency.value = room === "kitchen" ? 180 : 300;
      level = room === "kitchen" ? 0.05 : 0.02;
    }
    g.gain.setTargetAtTime(level, t, 1);
    src.connect(f).connect(g).connect(this.ambBus);
    src.start(t);
    let lfo: OscillatorNode | null = null;
    if (lfoRate) {
      lfo = ctx.createOscillator();
      lfo.frequency.value = lfoRate;
      const lg = ctx.createGain();
      lg.gain.value = level * 0.8;
      lfo.connect(lg).connect(g.gain);
      lfo.start(t);
    }
    this.ambBed = {
      stop: () => {
        const n = ctx.currentTime;
        g.gain.setTargetAtTime(0, n, 0.3);
        src.stop(n + 1.5);
        lfo?.stop(n + 1.5);
      },
    };
    // Occasional details: birds, gulls, drips, crickets.
    this.ambTimer = setInterval(() => this.ambientDetail(), 900);
  }

  private ambientDetail() {
    if (!this.ctx || !this.sfxOn || this.ctx.state !== "running") return;
    const room = this.ambRoom;
    const night = this.ambLight === "night";
    const r = rand();
    const bus = this.ambBus;
    if ((room === "garden" || room === "forest") && !night && r < 0.35) {
      const base = 2200 + rand() * 1400;
      const n = 2 + Math.floor(rand() * 4);
      for (let i = 0; i < n; i++) this.tone({ f: base, mid: base * 1.3, to: base * 0.9, type: "sine", vol: 0.05, a: 0.01, d: 0.08, at: i * 0.12, bus, pan: rand() * 1.6 - 0.8 });
    } else if ((room === "garden" || room === "forest" || room === "bedroom") && night && r < 0.5) {
      for (let i = 0; i < 3; i++) this.tone({ f: 4200, type: "square", vol: 0.012, a: 0.005, d: 0.04, at: i * 0.07, bus, pan: 0.5 });
    } else if (room === "beach" && r < 0.08) {
      this.tone({ f: 1300, mid: 1700, to: 1100, type: "sawtooth", vol: 0.025, a: 0.03, d: 0.25, filter: { type: "bandpass", f: 1500, q: 3 }, bus, pan: -0.6 });
    } else if (room === "bathroom" && r < 0.15) {
      this.tone({ f: 1400, to: 700, type: "sine", vol: 0.05, a: 0.002, d: 0.12, bus, pan: -0.4 });
    } else if (room === "playroom" && r < 0.06) {
      [1568, 1318, 1046].forEach((f, i) => this.tone({ f, type: "triangle", vol: 0.025, a: 0.005, d: 0.4, at: i * 0.18, bus }));
    }
  }

  // ------------------------------------------------------------ music

  private startMusic() {
    if (!this.ctx || this.musicTimer) return;
    this.nextNote = this.ctx.currentTime + 0.1;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 120);
  }

  private scheduleMusic() {
    const ctx = this.ctx;
    if (!ctx) return;
    if (!this.musicOn) {
      if (this.musicTimer) clearInterval(this.musicTimer);
      this.musicTimer = null;
      return;
    }
    const beat = 60 / 76 / 2;
    // I - vi - IV - V in C, soft and slow.
    const chords = [
      [261.6, 329.6, 392.0],
      [220.0, 261.6, 329.6],
      [174.6, 220.0, 261.6],
      [196.0, 246.9, 293.7],
    ];
    const scale = [523.3, 587.3, 659.3, 784.0, 880.0, 1046.5];
    while (this.nextNote < ctx.currentTime + 0.4) {
      const at = this.nextNote - ctx.currentTime;
      if (this.step % 16 === 0) {
        const c = chords[this.chord % chords.length];
        this.chord++;
        for (const f of c) {
          this.tone({ f, type: "sine", vol: 0.05, a: 0.6, d: beat * 15, at, bus: this.musicBus });
          this.tone({ f: f / 2, type: "triangle", vol: 0.03, a: 0.4, d: beat * 14, at, bus: this.musicBus, filter: { type: "lowpass", f: 600 } });
        }
      }
      if (this.step % 2 === 0 && rand() < 0.62) {
        const f = scale[Math.floor(rand() * scale.length)];
        this.tone({ f, type: "triangle", vol: 0.05, a: 0.02, d: beat * 2.4, at, bus: this.musicBus });
        this.tone({ f: f * 2, type: "sine", vol: 0.012, a: 0.02, d: beat * 1.5, at, bus: this.musicBus });
      }
      this.step++;
      this.nextNote += beat;
    }
  }

  // ------------------------------------------------------------ voice (Talk)

  /** Records up to `maxMs` of microphone audio. Resolves when stopped or time runs out. */
  async record(maxMs: number, signal: { stop?: () => void; cancelled?: boolean }): Promise<MicResult> {
    if (!this.ensure() || !this.ctx) return { ok: false, reason: "unsupported" };
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return { ok: false, reason: "unsupported" };
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) {
      const name = (e as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") return { ok: false, reason: "denied" };
      if (name === "NotFoundError" || name === "OverconstrainedError") return { ok: false, reason: "nomic" };
      return { ok: false, reason: "error" };
    }
    const ctx = this.ctx;
    const srcNode = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 1024;
    srcNode.connect(an);
    this.micAnalyser = an;
    const chunks: Blob[] = [];
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream);
    } catch {
      stream.getTracks().forEach((tr) => tr.stop());
      return { ok: false, reason: "unsupported" };
    }
    return new Promise<MicResult>((resolve) => {
      let done = false;
      const timer = setTimeout(() => finish(), maxMs);
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (rec.state !== "inactive") rec.stop();
      };
      signal.stop = finish;
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunks.push(ev.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop());
        srcNode.disconnect();
        this.micAnalyser = null;
        try {
          const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
          const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
          const trimmed = this.trim(buf);
          if (!trimmed) resolve({ ok: false, reason: "quiet" });
          else resolve({ ok: true, buffer: trimmed });
        } catch {
          resolve({ ok: false, reason: "error" });
        }
      };
      rec.start();
      if (signal.cancelled) setTimeout(finish, 250);
    });
  }

  private trim(buf: AudioBuffer) {
    const ctx = this.ctx!;
    const d = buf.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    if (peak < 0.015) return null;
    const th = Math.max(0.01, peak * 0.12);
    let s = 0;
    let e = d.length - 1;
    while (s < d.length && Math.abs(d[s]) < th) s++;
    while (e > s && Math.abs(d[e]) < th) e--;
    const pad = Math.floor(buf.sampleRate * 0.06);
    s = Math.max(0, s - pad);
    e = Math.min(d.length, e + pad);
    if (e - s < buf.sampleRate * 0.12) return null;
    const out = ctx.createBuffer(buf.numberOfChannels, e - s, buf.sampleRate);
    for (let c = 0; c < buf.numberOfChannels; c++) out.copyToChannel(buf.getChannelData(c).slice(s, e), c);
    // Normalise so quiet voices still come back clearly.
    const gain = Math.min(4, 0.9 / peak);
    for (let c = 0; c < out.numberOfChannels; c++) {
      const ch = out.getChannelData(c);
      for (let i = 0; i < ch.length; i++) ch[i] *= gain;
    }
    return out;
  }

  /** Plays the recording back in a funny high voice. Resolves when it finishes. */
  playVoice(buf: AudioBuffer, rate: number) {
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve();
    void ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 180;
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    const g = ctx.createGain();
    g.gain.value = 1.1;
    src.connect(hp).connect(an).connect(g).connect(this.master);
    this.voiceAnalyser = an;
    this.voiceData = new Float32Array(an.fftSize);
    return new Promise<void>((resolve) => {
      src.onended = () => {
        this.voiceAnalyser = null;
        resolve();
      };
      src.start();
    });
  }

  private rms(an: AnalyserNode | null, data: Float32Array<ArrayBuffer> | null) {
    if (!an) return 0;
    const d = data && data.length === an.fftSize ? data : new Float32Array(an.fftSize);
    an.getFloatTimeDomainData(d);
    let s = 0;
    for (let i = 0; i < d.length; i++) s += d[i] * d[i];
    return Math.sqrt(s / d.length);
  }

  /** 0..1 loudness of the pet's playback, for lip sync. */
  voiceLevel() {
    return Math.min(1, this.rms(this.voiceAnalyser, this.voiceData) * 5.5);
  }

  /** 0..1 loudness of the microphone while recording, so the pet can react. */
  micLevel() {
    return Math.min(1, this.rms(this.micAnalyser, null) * 8);
  }
}

export const audio = new Engine();
