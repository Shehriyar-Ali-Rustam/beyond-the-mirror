import { rand, randRange } from "./rng";
import type { TimeOfDay, Weather } from "./state";

/* -----------------------------------------------------------------------------
   Every sound in the Cozy Room is synthesised here with the Web Audio API:
   rain (filtered noise and little taps on the glass), wind, thunder, a
   generative lo-fi music loop, night crickets, morning birds and small
   interaction sounds. Create it only from a user gesture.
----------------------------------------------------------------------------- */

export type Sfx = "click" | "clink" | "page" | "swish" | "purr" | "pour" | "chime" | "rustle" | "needle" | "pop" | "unpop" | "blow" | "match" | "tap";

type AmbienceMix = { hiss: number; hissCut: number; body: number; wind: number; patter: number; taps: number };

const AMBIENCE: Record<Weather, AmbienceMix> = {
  rain: { hiss: 0.16, hissCut: 5200, body: 0.22, wind: 0.04, patter: 7, taps: 2.2 },
  storm: { hiss: 0.3, hissCut: 7600, body: 0.42, wind: 0.16, patter: 16, taps: 5 },
  snow: { hiss: 0, hissCut: 3000, body: 0, wind: 0.24, patter: 0, taps: 0 },
  fog: { hiss: 0.015, hissCut: 3000, body: 0.03, wind: 0.11, patter: 0.6, taps: 0.15 },
  clear: { hiss: 0, hissCut: 3000, body: 0, wind: 0.05, patter: 0.25, taps: 0 },
};

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

type Chord = { bass: number; notes: number[] };
const PROGRESSIONS: Chord[][] = [
  [
    { bass: 41, notes: [57, 60, 64, 67] },
    { bass: 40, notes: [55, 59, 62, 67] },
    { bass: 38, notes: [53, 57, 60, 64] },
    { bass: 36, notes: [52, 55, 59, 62] },
  ],
  [
    { bass: 38, notes: [53, 57, 60, 64] },
    { bass: 43, notes: [53, 59, 62, 64] },
    { bass: 36, notes: [52, 55, 59, 62] },
    { bass: 45, notes: [55, 60, 64, 67] },
  ],
  [
    { bass: 46, notes: [57, 60, 62, 65] },
    { bass: 45, notes: [55, 60, 64, 67] },
    { bass: 43, notes: [53, 58, 62, 65] },
    { bass: 48, notes: [55, 58, 62, 64] },
  ],
];
const MELODY_SCALE = [65, 67, 69, 72, 74, 76, 77, 79, 81];

const BPM = 72;
const STEP = 60 / BPM / 2; // eighth notes

export class CozyAudio {
  readonly ctx: AudioContext;
  private master: GainNode;
  private ambienceBus: GainNode;
  private musicBus: GainNode;
  private thunderBus: GainNode;
  private sfxBus: GainNode;
  private reverb: ConvolverNode;
  private reverbSend: GainNode;
  private delay: DelayNode;
  private delaySend: GainNode;
  private white: AudioBuffer;
  private pink: AudioBuffer;
  private brown: AudioBuffer;

  private hissGain: GainNode;
  private hissFilter: BiquadFilterNode;
  private bodyGain: GainNode;
  private windGain: GainNode;
  private keysBus: GainNode;
  private wow: GainNode;
  private crackleGain: GainNode;

  private mix: AmbienceMix = AMBIENCE.rain;
  private weather: Weather = "rain";
  private time: TimeOfDay = "evening";
  private ambienceOn = true;
  private musicOn = false;
  private thunderOn = true;
  private breathing = 1;

  private timer: ReturnType<typeof setInterval> | null = null;
  private ambienceUntil = 0;
  private musicNext = 0;
  private musicStep = 0;
  private bar = 0;
  private progression = 0;
  private lastMelody = 4;
  private critterNext = 0;

  constructor() {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
    const ctx = this.ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 8;
    limiter.ratio.value = 4;
    this.master.connect(limiter).connect(ctx.destination);

    this.ambienceBus = this.bus(1);
    this.musicBus = this.bus(0);
    this.thunderBus = this.bus(0.75);
    this.sfxBus = this.bus(0.9);

    this.white = this.noiseBuffer("white");
    this.pink = this.noiseBuffer("pink");
    this.brown = this.noiseBuffer("brown");

    // Shared space: a generated reverb and a soft echo for the music.
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.8);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.32;
    this.reverbSend.connect(this.reverb).connect(this.master);
    this.delay = ctx.createDelay(2);
    this.delay.delayTime.value = STEP * 1.5;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const delayTone = ctx.createBiquadFilter();
    delayTone.type = "lowpass";
    delayTone.frequency.value = 1800;
    this.delaySend = ctx.createGain();
    this.delaySend.gain.value = 0.3;
    this.delaySend.connect(this.delay);
    this.delay.connect(delayTone).connect(fb).connect(this.delay);
    delayTone.connect(this.musicBus);

    // Rain: a bright hiss and a deeper wash.
    const hiss = this.loop(this.pink);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 450;
    this.hissFilter = ctx.createBiquadFilter();
    this.hissFilter.type = "lowpass";
    this.hissFilter.frequency.value = 5200;
    this.hissGain = ctx.createGain();
    this.hissGain.gain.value = 0;
    hiss.connect(hp).connect(this.hissFilter).connect(this.hissGain).connect(this.ambienceBus);

    const body = this.loop(this.brown);
    const bodyLp = ctx.createBiquadFilter();
    bodyLp.type = "lowpass";
    bodyLp.frequency.value = 650;
    this.bodyGain = ctx.createGain();
    this.bodyGain.gain.value = 0;
    body.connect(bodyLp).connect(this.bodyGain).connect(this.ambienceBus);

    // Wind: slowly breathing band of noise.
    const wind = this.loop(this.brown);
    const windBp = ctx.createBiquadFilter();
    windBp.type = "bandpass";
    windBp.frequency.value = 380;
    windBp.Q.value = 0.9;
    const windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.07;
    const windLfoAmt = ctx.createGain();
    windLfoAmt.gain.value = 170;
    windLfo.connect(windLfoAmt).connect(windBp.frequency);
    windLfo.start();
    const windSwell = ctx.createGain();
    const swellLfo = ctx.createOscillator();
    swellLfo.frequency.value = 0.045;
    const swellAmt = ctx.createGain();
    swellAmt.gain.value = 0.35;
    windSwell.gain.value = 0.65;
    swellLfo.connect(swellAmt).connect(windSwell.gain);
    swellLfo.start();
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    wind.connect(windBp).connect(windSwell).connect(this.windGain).connect(this.ambienceBus);

    // Music chain: warm keys with tremolo, wow and flutter, and vinyl crackle.
    const lofi = ctx.createBiquadFilter();
    lofi.type = "lowpass";
    lofi.frequency.value = 3600;
    lofi.connect(this.musicBus);
    this.keysBus = ctx.createGain();
    this.keysBus.gain.value = 0.85;
    const trem = ctx.createOscillator();
    trem.frequency.value = 4.2;
    const tremAmt = ctx.createGain();
    tremAmt.gain.value = 0.1;
    trem.connect(tremAmt).connect(this.keysBus.gain);
    trem.start();
    this.keysBus.connect(lofi);
    const wowLfo = ctx.createOscillator();
    wowLfo.frequency.value = 0.45;
    this.wow = ctx.createGain();
    this.wow.gain.value = 7;
    wowLfo.connect(this.wow);
    wowLfo.start();
    const crackle = this.loop(this.white);
    const crackleHp = ctx.createBiquadFilter();
    crackleHp.type = "highpass";
    crackleHp.frequency.value = 3500;
    this.crackleGain = ctx.createGain();
    this.crackleGain.gain.value = 0.006;
    crackle.connect(crackleHp).connect(this.crackleGain).connect(this.musicBus);

    this.timer = setInterval(() => this.schedule(), 90);
  }

  /* --------------------------------- setup -------------------------------- */

  private bus(level: number) {
    const g = this.ctx.createGain();
    g.gain.value = level;
    g.connect(this.master);
    return g;
  }

  private noiseBuffer(kind: "white" | "pink" | "brown") {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * 4);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < len; i++) {
        const w = rand() * 2 - 1;
        if (kind === "white") d[i] = w * 0.5;
        else if (kind === "pink") {
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856;
          b4 = 0.55 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        } else {
          last = (last + 0.02 * w) / 1.02;
          d[i] = last * 3.2;
        }
      }
      // Smooth the loop point so it never clicks.
      const fade = 2048;
      for (let i = 0; i < fade; i++) {
        const t = i / fade;
        d[len - fade + i] = d[len - fade + i] * (1 - t) + d[i] * t;
      }
    }
    return buf;
  }

  private impulse(seconds: number) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (rand() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    return buf;
  }

  private loop(buffer: AudioBuffer) {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.start(0, rand() * buffer.duration);
    return src;
  }

  /** A short burst of a noise buffer starting at a random point. */
  private burst(buffer: AudioBuffer, at: number, dur: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    if (dur > buffer.duration * 0.8) {
      // Longer than the buffer (thunder): loop it, the seam is already smoothed.
      src.loop = true;
      src.start(at, rand() * buffer.duration);
      src.stop(at + dur + 0.05);
    } else {
      src.start(at, rand() * (buffer.duration - dur - 0.1), dur + 0.05);
    }
    return src;
  }

  private env(g: GainNode, at: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  }

  /* -------------------------------- controls ------------------------------- */

  resume() {
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  private sleepTimer: ReturnType<typeof setTimeout> | null = null;

  /** Fades everything in or out; the context sleeps while muted to save battery. */
  setEnabled(on: boolean, volume: number) {
    if (this.sleepTimer) clearTimeout(this.sleepTimer);
    this.sleepTimer = null;
    if (on) {
      this.resume();
      this.setVolume(volume);
    } else {
      this.setVolume(0);
      this.sleepTimer = setTimeout(() => {
        if (this.ctx.state === "running") void this.ctx.suspend();
      }, 1200);
    }
  }

  setVolume(v: number) {
    this.master.gain.setTargetAtTime(Math.pow(Math.max(0, Math.min(1, v)), 1.6) * 1.1, this.ctx.currentTime, 0.25);
  }

  setScene(weather: Weather, time: TimeOfDay) {
    this.weather = weather;
    this.time = time;
    this.mix = AMBIENCE[weather];
    this.applyAmbience();
  }

  setAmbience(on: boolean) {
    this.ambienceOn = on;
    this.applyAmbience();
  }

  /** Gently swells the rain with a breathing exercise (0..1). */
  setBreath(level: number) {
    this.breathing = level;
    this.applyAmbience(1.2);
  }

  private applyAmbience(tc = 1.4) {
    const t = this.ctx.currentTime;
    const on = this.ambienceOn ? 1 : 0;
    const b = this.breathing;
    this.hissGain.gain.setTargetAtTime(this.mix.hiss * on * b, t, tc);
    this.bodyGain.gain.setTargetAtTime(this.mix.body * on * (0.7 + 0.3 * b), t, tc);
    this.windGain.gain.setTargetAtTime(this.mix.wind * on, t, tc);
    this.hissFilter.frequency.setTargetAtTime(this.mix.hissCut, t, tc);
  }

  setMusic(on: boolean) {
    if (on === this.musicOn) return;
    this.musicOn = on;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setTargetAtTime(on ? 0.6 : 0, t, on ? 0.8 : 0.5);
    if (on) {
      this.musicNext = t + 0.15;
      this.musicStep = 0;
      this.bar = 0;
      this.progression = Math.floor(rand() * PROGRESSIONS.length);
    }
  }

  setThunder(on: boolean) {
    this.thunderOn = on;
  }

  dispose() {
    if (this.timer) clearInterval(this.timer);
    if (this.sleepTimer) clearTimeout(this.sleepTimer);
    this.timer = null;
    void this.ctx.close();
  }

  /* ------------------------------- scheduling ------------------------------ */

  private schedule() {
    const ctx = this.ctx;
    if (ctx.state !== "running") return;
    const horizon = ctx.currentTime + (document.hidden ? 1.6 : 0.3);

    // Raindrops tapping on the glass and the sill.
    if (this.ambienceUntil < ctx.currentTime) this.ambienceUntil = ctx.currentTime;
    while (this.ambienceUntil < horizon) {
      const rate = (this.mix.patter + this.mix.taps) * (this.ambienceOn ? 1 : 0);
      if (rate <= 0) {
        this.ambienceUntil = horizon;
        break;
      }
      this.ambienceUntil += -Math.log(1 - rand()) / rate;
      if (rand() < this.mix.taps / rate) this.tapOnGlass(this.ambienceUntil);
      else this.patter(this.ambienceUntil);
    }

    // Crickets after dark on clear nights, birds on clear days.
    if (this.ambienceOn && (this.weather === "clear" || (this.weather === "fog" && this.time === "day"))) {
      if (this.critterNext < ctx.currentTime) this.critterNext = ctx.currentTime + randRange(0.5, 2);
      while (this.critterNext < horizon) {
        if (this.time === "day") this.bird(this.critterNext);
        else this.cricket(this.critterNext);
        this.critterNext += this.time === "day" ? randRange(2.5, 7) : randRange(0.6, 2.2);
      }
    }

    if (this.musicOn) {
      if (this.musicNext < ctx.currentTime) this.musicNext = ctx.currentTime + 0.05;
      while (this.musicNext < horizon) {
        this.musicTick(this.musicNext, this.musicStep);
        this.musicStep = (this.musicStep + 1) % 8;
        if (this.musicStep === 0) {
          this.bar++;
          if (this.bar % 8 === 0) this.progression = (this.progression + 1) % PROGRESSIONS.length;
        }
        this.musicNext += STEP;
      }
    }
  }

  private patter(at: number) {
    const ctx = this.ctx;
    const src = this.burst(this.white, at, 0.06);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = randRange(900, 3800);
    bp.Q.value = randRange(2, 6);
    const g = ctx.createGain();
    const pan = ctx.createStereoPanner();
    pan.pan.value = randRange(-0.8, 0.8);
    this.env(g, at, randRange(0.04, 0.14) * (this.weather === "storm" ? 1.2 : 1), 0.002, randRange(0.03, 0.08));
    src.connect(bp).connect(g).connect(pan).connect(this.ambienceBus);
  }

  private tapOnGlass(at: number) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(randRange(2400, 4200), at);
    o.frequency.exponentialRampToValueAtTime(randRange(1200, 2000), at + 0.04);
    const g = ctx.createGain();
    this.env(g, at, randRange(0.012, 0.035), 0.001, 0.05);
    const pan = ctx.createStereoPanner();
    pan.pan.value = randRange(-0.5, 0.5);
    o.connect(g).connect(pan).connect(this.ambienceBus);
    o.start(at);
    o.stop(at + 0.1);
  }

  private cricket(at: number) {
    const ctx = this.ctx;
    const f = randRange(4300, 4700);
    const pan = ctx.createStereoPanner();
    pan.pan.value = randRange(-0.7, 0.7);
    pan.connect(this.ambienceBus);
    const pulses = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < pulses; i++) {
      const t = at + i * 0.07;
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const g = ctx.createGain();
      this.env(g, t, 0.012, 0.005, 0.045);
      o.connect(g).connect(pan);
      o.start(t);
      o.stop(t + 0.07);
    }
  }

  private bird(at: number) {
    const ctx = this.ctx;
    const pan = ctx.createStereoPanner();
    pan.pan.value = randRange(-0.8, 0.8);
    pan.connect(this.ambienceBus);
    const notes = 2 + Math.floor(rand() * 3);
    const base = randRange(2600, 3600);
    for (let i = 0; i < notes; i++) {
      const t = at + i * randRange(0.11, 0.16);
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(base * randRange(0.9, 1.1), t);
      o.frequency.exponentialRampToValueAtTime(base * randRange(1.25, 1.5), t + 0.07);
      const g = ctx.createGain();
      this.env(g, t, 0.014, 0.01, 0.08);
      o.connect(g).connect(pan);
      o.start(t);
      o.stop(t + 0.12);
    }
  }

  /* ---------------------------------- music -------------------------------- */

  private musicTick(at: number, step: number) {
    const chord = PROGRESSIONS[this.progression][this.bar % 4];
    const swing = step % 2 === 1 ? STEP * 0.18 : 0;
    const t = at + swing;
    if (step === 0) this.chord(t, chord.notes, 0.075);
    if ((step === 3 && rand() < 0.5) || (step === 5 && rand() < 0.35)) this.chord(t, chord.notes.slice(1), 0.04);
    if (step === 0 || (step === 4 && rand() < 0.75) || (step === 7 && rand() < 0.25)) this.bassNote(t, chord.bass);
    if (step === 0 || step === 4 || (step === 5 && rand() < 0.25)) this.kick(t);
    if (step === 2 || step === 6) this.snare(t);
    this.hat(t, step % 2 === 0 ? 0.022 : 0.012);
    if (step !== 0 && rand() < 0.3) this.melody(t, chord);
    // The odd vinyl pop.
    if (rand() < 0.08) this.vinylPop(at + rand() * STEP);
  }

  private keyVoice(at: number, midi: number, peak: number, decay: number, dest: AudioNode) {
    const ctx = this.ctx;
    const f = mtof(midi);
    const g = ctx.createGain();
    this.env(g, at, peak, 0.012, decay);
    const partials: [OscillatorType, number, number][] = [
      ["sine", 1, 1],
      ["triangle", 1, 0.18],
      ["sine", 2, 0.12],
      ["sine", 3.01, 0.04],
    ];
    for (const [type, mul, amp] of partials) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mul;
      o.detune.value = randRange(-5, 5);
      this.wow.connect(o.detune);
      // Let finished voices go so the graph never grows.
      o.onended = () => this.wow.disconnect(o.detune);
      const pg = ctx.createGain();
      pg.gain.value = amp;
      o.connect(pg).connect(g);
      o.start(at);
      o.stop(at + decay + 0.1);
    }
    g.connect(dest);
    return g;
  }

  private chord(at: number, notes: number[], peak: number) {
    notes.forEach((n, i) => {
      const g = this.keyVoice(at + i * 0.018, n, peak, 2.8, this.keysBus);
      g.connect(this.reverbSend);
    });
  }

  private bassNote(at: number, midi: number) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = mtof(midi);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    const g = ctx.createGain();
    this.env(g, at, 0.16, 0.02, 0.9);
    o.connect(lp).connect(g).connect(this.musicBus);
    o.start(at);
    o.stop(at + 1.1);
  }

  private melody(at: number, chord: Chord) {
    // Wander gently around the scale, leaning towards chord tones.
    let idx = this.lastMelody + Math.round(randRange(-2, 2));
    idx = Math.max(0, Math.min(MELODY_SCALE.length - 1, idx));
    let note = MELODY_SCALE[idx];
    const tones = chord.notes.map((n) => n + 12);
    if (rand() < 0.5) {
      const near = tones.reduce((a, b) => (Math.abs(b - note) < Math.abs(a - note) ? b : a));
      if (Math.abs(near - note) <= 2) note = near;
    }
    this.lastMelody = idx;
    const g = this.keyVoice(at, note, 0.045, 1.2, this.keysBus);
    g.connect(this.delaySend);
    g.connect(this.reverbSend);
  }

  private kick(at: number) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(115, at);
    o.frequency.exponentialRampToValueAtTime(44, at + 0.13);
    const g = ctx.createGain();
    this.env(g, at, 0.32, 0.004, 0.32);
    o.connect(g).connect(this.musicBus);
    o.start(at);
    o.stop(at + 0.4);
  }

  private snare(at: number) {
    const ctx = this.ctx;
    const src = this.burst(this.white, at, 0.2);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1900;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    this.env(g, at, 0.07, 0.003, 0.17);
    src.connect(bp).connect(g).connect(this.musicBus);
    g.connect(this.reverbSend);
  }

  private hat(at: number, peak: number) {
    const ctx = this.ctx;
    const src = this.burst(this.white, at, 0.06);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = ctx.createGain();
    this.env(g, at, peak, 0.002, 0.045);
    src.connect(hp).connect(g).connect(this.musicBus);
  }

  private vinylPop(at: number) {
    const ctx = this.ctx;
    const src = this.burst(this.white, at, 0.01);
    const g = ctx.createGain();
    this.env(g, at, randRange(0.02, 0.06), 0.0005, 0.008);
    src.connect(g).connect(this.musicBus);
  }

  /* --------------------------------- thunder ------------------------------- */

  thunder(intensity: number, delay: number) {
    if (!this.thunderOn || this.ctx.state !== "running") return;
    const ctx = this.ctx;
    const at = ctx.currentTime + delay;
    const len = randRange(5, 8);
    const src = this.burst(this.brown, at, len);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(900, at);
    lp.frequency.exponentialRampToValueAtTime(110, at + len * 0.6);
    const g = ctx.createGain();
    const peak = 0.55 * intensity;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + randRange(0.25, 0.7));
    // A few rolling swells as the rumble travels.
    let t = at + 0.8;
    while (t < at + len * 0.7) {
      g.gain.setTargetAtTime(peak * randRange(0.35, 1), t, 0.25);
      t += randRange(0.3, 0.9);
    }
    g.gain.setTargetAtTime(0.0001, at + len * 0.7, len * 0.12);
    const pan = ctx.createStereoPanner();
    pan.pan.value = randRange(-0.4, 0.4);
    src.connect(lp).connect(g).connect(pan).connect(this.thunderBus);
    g.connect(this.reverbSend);
  }

  /* ---------------------------------- sfx ---------------------------------- */

  sfx(name: Sfx) {
    if (this.ctx.state !== "running") return;
    const ctx = this.ctx;
    const at = ctx.currentTime + 0.01;
    const out = this.sfxBus;
    const tone = (f: number, peak: number, decay: number, when = at, type: OscillatorType = "sine", to?: number) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f, when);
      if (to) o.frequency.exponentialRampToValueAtTime(to, when + decay * 0.8);
      const g = ctx.createGain();
      this.env(g, when, peak, 0.004, decay);
      o.connect(g).connect(out);
      o.start(when);
      o.stop(when + decay + 0.05);
      return g;
    };
    const noise = (dur: number, type: BiquadFilterType, f: number, q: number, peak: number, attack: number, buffer = this.white, f2?: number) => {
      const src = this.burst(buffer, at, dur);
      const filt = ctx.createBiquadFilter();
      filt.type = type;
      filt.frequency.setValueAtTime(f, at);
      if (f2) filt.frequency.exponentialRampToValueAtTime(f2, at + dur);
      filt.Q.value = q;
      const g = ctx.createGain();
      this.env(g, at, peak, attack, Math.max(0.01, dur - attack));
      src.connect(filt).connect(g).connect(out);
      return g;
    };
    switch (name) {
      case "click":
        noise(0.03, "bandpass", 3200, 1.2, 0.22, 0.001);
        tone(1500, 0.06, 0.03);
        break;
      case "tap":
        tone(660, 0.05, 0.08);
        break;
      case "clink":
        [2637, 3951, 5274].forEach((f, i) => tone(f, [0.07, 0.04, 0.025][i], [0.7, 0.45, 0.3][i]));
        [2489, 3729].forEach((f, i) => tone(f, [0.035, 0.02][i], 0.4, at + 0.09));
        break;
      case "page":
        noise(0.32, "bandpass", 1100, 1.1, 0.13, 0.08, this.white, 3400);
        break;
      case "swish":
        noise(1.1, "bandpass", 500, 0.7, 0.12, 0.35, this.pink, 1400);
        break;
      case "rustle":
        for (let i = 0; i < 5; i++) {
          const t = at + i * randRange(0.05, 0.1);
          const src = this.burst(this.white, t, 0.08);
          const hp = ctx.createBiquadFilter();
          hp.type = "highpass";
          hp.frequency.value = 2500;
          const g = ctx.createGain();
          this.env(g, t, randRange(0.03, 0.06), 0.01, 0.07);
          src.connect(hp).connect(g).connect(out);
        }
        break;
      case "purr": {
        const src = this.burst(this.brown, at, 2.4);
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 280;
        const am = ctx.createGain();
        am.gain.value = 0.5;
        const lfo = ctx.createOscillator();
        lfo.type = "triangle";
        lfo.frequency.value = 24;
        const depth = ctx.createGain();
        depth.gain.value = 0.5;
        lfo.connect(depth).connect(am.gain);
        lfo.start(at);
        lfo.stop(at + 2.5);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.9, at + 0.3);
        g.gain.setTargetAtTime(0.5, at + 0.9, 0.1);
        g.gain.setTargetAtTime(0.9, at + 1.2, 0.15);
        g.gain.setTargetAtTime(0.0001, at + 1.9, 0.18);
        src.connect(lp).connect(am).connect(g).connect(out);
        break;
      }
      case "pour": {
        const src = this.burst(this.pink, at, 1.6);
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.Q.value = 3;
        for (let t = 0; t < 1.6; t += 0.045) bp.frequency.setValueAtTime(randRange(1400, 2600) + t * 300, at + t);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.16, at + 0.15);
        g.gain.setTargetAtTime(0.0001, at + 1.3, 0.12);
        src.connect(bp).connect(g).connect(out);
        [2637, 3951].forEach((f, i) => tone(f, [0.05, 0.03][i], 0.5, at + 1.75));
        break;
      }
      case "chime":
        [1046.5, 1318.5, 1568, 2093].forEach((f, i) => {
          const g = tone(f, 0.05, 1.6, at + i * 0.13);
          g.connect(this.reverbSend);
          tone(f * 2.76, 0.012, 0.7, at + i * 0.13);
        });
        break;
      case "needle":
        tone(70, 0.12, 0.25, at, "sine", 45);
        for (let i = 0; i < 8; i++) {
          const t = at + 0.1 + rand() * 0.6;
          const src = this.burst(this.white, t, 0.01);
          const g = ctx.createGain();
          this.env(g, t, 0.05, 0.0005, 0.01);
          src.connect(g).connect(out);
        }
        break;
      case "pop":
        tone(520, 0.07, 0.12, at, "sine", 900);
        break;
      case "unpop":
        tone(820, 0.06, 0.12, at, "sine", 420);
        break;
      case "blow":
        noise(0.5, "lowpass", 900, 0.5, 0.14, 0.12, this.pink);
        break;
      case "match":
        noise(0.12, "bandpass", 2600, 1, 0.12, 0.004);
        noise(0.5, "lowpass", 700, 0.6, 0.12, 0.08, this.pink);
        break;
    }
  }
}
