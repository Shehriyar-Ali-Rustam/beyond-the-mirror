import * as THREE from "three";
import { audio, type Mood, type Sfx } from "./audio";
import { verdictFor } from "./catalog";
import { LAYOUTS, TANK, type RoomLayout, type XZ } from "./layouts";
import { POSE_DEFAULT, animateRig, dampPose, newAnim, squash, twitchEar, type Pose } from "./pet-anim";
import type { Rig } from "./pet-build";
import { Particles } from "./particles";
import { SPECIES, type SpeciesSpec } from "./species";
import type { BathTool, BodyPart, FoodId, RoomId, SpeciesId, Stats, Verdict, WorldEvent } from "./types";

const rand = () => Math.random();
const range = (a: number, b: number) => a + rand() * (b - a);
const clamp = THREE.MathUtils.clamp;
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export type Bubble = { icon: string; text?: string; key: number } | null;
export type CamMode = "room" | "pet" | "face" | "bath" | "bowl" | "bed" | "adopt";

type Toy = {
  active: boolean;
  kind: "ball" | "yarn";
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  held: boolean;
  spin: THREE.Quaternion;
  r: number;
  bats: number;
};

type IdleSub = "stand" | "sit" | "lie" | "look" | "sniff" | "stretch" | "scratch" | "groom" | "tailchase" | "popcorn" | "flap" | "yawn" | "beg" | "swim" | "rest" | "loop" | "bubbles" | "you";

type Act =
  | { kind: "idle"; t: number; dur: number; sub: IdleSub; x?: number; z?: number; y?: number }
  | { kind: "goto"; t: number; x: number; z: number; y?: number; run: boolean; face?: XZ | "cam"; then: () => void; timeout: number; look?: "cam" | "target" }
  | { kind: "arc"; t: number; from: THREE.Vector3; to: THREE.Vector3; g0: number; g1: number; h: number; dur: number; then: () => void }
  | { kind: "eat"; t: number; food: FoodId; verdict: Verdict }
  | { kind: "refuse"; t: number; food: FoodId }
  | { kind: "react"; t: number; part: BodyPart; side: number; dur: number }
  | { kind: "celebrate"; t: number; big: boolean }
  | { kind: "sleep"; t: number; settled: boolean }
  | { kind: "wake"; t: number }
  | { kind: "chase"; t: number }
  | { kind: "carry"; t: number }
  | { kind: "wait"; t: number }
  | { kind: "bat"; t: number; hit: boolean }
  | { kind: "hiding"; t: number }
  | { kind: "bath"; t: number }
  | { kind: "shake"; t: number; inTub: boolean }
  | { kind: "listen"; t: number }
  | { kind: "speak"; t: number; dur: number; fake: boolean; mood: ChatMood }
  | { kind: "dance"; t: number; dur: number }
  | { kind: "follow"; t: number; dur: number }
  | { kind: "pose"; t: number; dur: number; style: "present" | "sitcam" | "breathe" | "spin" }
  | { kind: "swimfollow"; t: number; dur: number }
  | { kind: "peck"; t: number };

export type ChatMood = "happy" | "excited" | "concerned" | "joke" | "calm" | "sleepy" | "love";

export type HitInfo = {
  part?: BodyPart;
  point?: THREE.Vector3;
  ground?: THREE.Vector3;
  spot?: number;
  glass?: THREE.Vector3;
  ball?: boolean;
};

export class World {
  spec: SpeciesSpec;
  species: SpeciesId;
  layout: RoomLayout;
  rig: Rig | null = null;
  pose: Pose = { ...POSE_DEFAULT };
  target: Pose = { ...POSE_DEFAULT };
  anim = newAnim();
  particles = new Particles();
  fish: boolean;

  pos = new THREE.Vector3();
  heading = 0;
  air = 0;
  vy = 0;
  ground = 0;
  alt = 0;
  altTarget = 0;
  moveSpeed = 0;
  gaitSpeed = 0;
  spin = 0;
  inflate = 0;

  act: Act = { kind: "idle", t: 0, dur: 1.5, sub: "stand" };
  time = 0;
  stats: Stats = { hunger: 80, happiness: 80, energy: 80, cleanliness: 80, health: 90 };
  friendship = 0;
  musicOn = false;
  reduced = false;
  asleep = false;
  pitch = 1;
  dim = 0;
  voice = 0;
  talkMode: "off" | "listen" | "speak" = "off";
  /** While Talk, Chat or Dress up is open the pet stays with the student instead of wandering. */
  stay: "off" | "sit" | "present" = "off";

  pointer = { ground: new THREE.Vector3(0, 0, 2), seenAt: -10, down: false, onPet: false, last: new THREE.Vector3(), rubbed: 0, stroke: 0 };
  camPos = new THREE.Vector3(0, 3, 9);

  ball: Toy = { active: false, kind: "ball", pos: new THREE.Vector3(), vel: new THREE.Vector3(), held: false, spin: new THREE.Quaternion(), r: 0.15, bats: 0 };
  playMode: "ball" | "yarn" | "hide" | null = null;
  food = { id: null as FoodId | null, amount: 0, water: 0 };
  pellets: { pos: THREE.Vector3; alive: boolean }[] = [];
  hide = { active: false, phase: "off" as "off" | "count" | "seek" | "found", spot: 0, tries: 0, t: 0, wiggle: [0, 0, 0], lift: [0, 0, 0], peek: 0 };
  bath = {
    active: false,
    water: 0,
    tool: null as BathTool | null,
    shower: false,
    soap: [] as number[],
    wet: 0,
    fluff: 0,
    maxSoap: 0,
    rinsed: false,
    dried: false,
    brushed: false,
    algae: 0,
    toolPos: new THREE.Vector3(),
    toolOn: false,
    lastEmit: 0,
    rinseT: 0,
  };
  fridgeOpen = 0;
  fridgeTarget = 0;
  camMode: CamMode = "room";
  viewShift = { x: 0, y: 0 };
  lastEmote = 0;
  /** What the last tap landed on (handy for debugging touch areas). */
  lastHit = "";
  private lastNeed = 0;
  private lastStep = 0;
  private zzzT = 0;
  private bubbleKey = 0;
  private onEvent: (e: WorldEvent) => void = () => {};
  private onBubble: (b: Bubble) => void = () => {};
  private bubbleTimer: ReturnType<typeof setTimeout> | null = null;
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();

  constructor(species: SpeciesId, room: RoomId) {
    this.species = species;
    this.spec = SPECIES[species];
    this.fish = this.spec.family === "fish";
    this.layout = LAYOUTS[room];
    this.placeAtSpawn();
  }

  // ======================================================================= wiring

  setHandlers(onEvent: (e: WorldEvent) => void, onBubble: (b: Bubble) => void) {
    this.onEvent = onEvent;
    this.onBubble = onBubble;
  }

  attachRig(rig: Rig | null) {
    this.rig = rig;
    this.anim = newAnim();
    this.bath.soap = rig ? rig.foam.map((_, i) => this.bath.soap[i] ?? 0) : [];
  }

  setSpecies(species: SpeciesId) {
    if (species === this.species) return;
    this.species = species;
    this.spec = SPECIES[species];
    this.fish = this.spec.family === "fish";
    this.placeAtSpawn();
  }

  setRoom(room: RoomId) {
    if (this.layout.id === room) return;
    this.layout = LAYOUTS[room];
    this.endPlay();
    this.endBath(false);
    this.food.id = null;
    this.food.amount = 0;
    this.particles.clear();
    if (this.asleep) this.asleep = false;
    this.placeAtSpawn();
    this.setAct({ kind: "idle", t: 0, dur: 1.2, sub: "look" });
  }

  setStats(s: Stats, friendship: number) {
    this.stats = s;
    this.friendship = friendship;
  }

  private placeAtSpawn() {
    if (this.fish) {
      this.pos.set(0, 1.35, -0.7);
      this.heading = 0.6;
      this.ground = 0;
    } else {
      const [x, z] = this.layout.spawn;
      this.pos.set(x, 0, z);
      this.heading = 0.3;
      this.ground = 0;
    }
    this.air = 0;
    this.vy = 0;
    this.alt = 0;
  }

  private emit(e: WorldEvent) {
    this.onEvent(e);
  }

  say(icon: string, text?: string, ms = 2200) {
    this.bubbleKey++;
    this.onBubble({ icon, text, key: this.bubbleKey });
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
    this.bubbleTimer = setTimeout(() => this.onBubble(null), ms);
  }

  sound(mood: Mood) {
    audio.voice(this.spec.sound, mood, this.pitch);
  }

  sfx(name: Sfx, vol = 1) {
    audio.play(name, { vol, pitch: this.pitch });
  }

  // ======================================================================= positions

  headWorld(out = new THREE.Vector3()) {
    if (this.rig) {
      this.rig.head.getWorldPosition(out);
      return out;
    }
    return out.set(this.pos.x, this.ground + 0.8, this.pos.z);
  }

  mouthWorld(out = new THREE.Vector3()) {
    if (this.rig) {
      this.rig.anchors.mouth.getWorldPosition(out);
      return out;
    }
    return this.headWorld(out);
  }

  petCenter(out = new THREE.Vector3()) {
    if (this.fish) return out.copy(this.pos);
    return out.set(this.pos.x, this.ground + this.air + this.alt + (this.rig?.dims.height ?? 1) * 0.45, this.pos.z);
  }

  // ======================================================================= commands from the UI

  /** Interrupts whatever the pet is doing (unless it's busy with something that must finish). */
  private setAct(a: Act) {
    // A twirl that gets interrupted must not leave the pet facing the wrong way.
    this.spin = 0;
    this.act = a;
  }

  idle(dur = range(1.5, 3), sub: IdleSub = "stand") {
    this.setAct({ kind: "idle", t: 0, dur, sub });
  }

  private goTo(x: number, z: number, then: () => void, o: { run?: boolean; face?: XZ | "cam"; y?: number; look?: "cam" | "target" } = {}) {
    const b = this.layout.bounds;
    if (!this.fish) {
      x = clamp(x, b.minX, b.maxX);
      z = clamp(z, b.minZ, b.maxZ);
    }
    this.setAct({ kind: "goto", t: 0, x, z, y: o.y, run: !!o.run, face: o.face, then, timeout: 9, look: o.look });
  }

  private comeToFront(then: () => void, run = false, dx = 0) {
    if (this.fish) {
      this.goTo(dx * 0.4, -0.3, then, { y: 1.35, face: "cam" });
      return;
    }
    const [fx, fz] = this.layout.front;
    this.goTo(fx + dx, fz, then, { run, face: "cam" });
  }

  greet(awayMs: number) {
    if (this.asleep) this.wake();
    const big = awayMs > 10 * 60_000;
    const eager = this.friendship >= 15 || big;
    this.comeToFront(() => {
      this.setAct({ kind: "celebrate", t: 0, big: eager });
      this.sound(big ? "excited" : "hello");
      this.say(big ? "💗" : "👋", big ? "You're back!" : "Hi!", 2600);
    }, eager);
  }

  /** Adoption preview: stand front and centre straight away. */
  presentNow() {
    this.endPlay();
    this.asleep = false;
    this.ground = 0;
    this.air = 0;
    this.vy = 0;
    this.alt = 0;
    this.spin = 0;
    if (this.fish) {
      this.pos.set(-0.15, 1.35, -0.5);
      this.heading = 0.95;
    } else {
      this.pos.set(0, 0, 0.7);
      this.heading = 0;
    }
    this.setAct({ kind: "pose", t: 0, dur: 999, style: "present" });
  }

  presentForDressUp() {
    if (this.asleep) this.wake();
    this.endPlay();
    this.comeToFront(() => this.setAct({ kind: "pose", t: 0, dur: 999, style: "present" }));
  }

  /** Reaction to a new look: twirl, sparkles and hearts. */
  happyLook() {
    this.setAct({ kind: "pose", t: 0, dur: 1.4, style: "spin" });
    this.particles.emit("sparkle", this.petCenter(this.tmp), 10, { spread: 0.4, up: 0.8, size: 0.08 });
    this.particles.emit("heart", this.headWorld(this.tmp).add(new THREE.Vector3(0, 0.3, 0)), 3, { spread: 0.2, up: 0.6, size: 0.1 });
    this.sound("happy");
    this.sfx("sparkle", 0.7);
  }

  endPresent() {
    if (this.act.kind === "pose") this.idle(1.5, "sit");
  }

  sitWithYou(dur = 999) {
    if (this.asleep) return;
    this.comeToFront(() => this.setAct({ kind: "pose", t: 0, dur, style: "sitcam" }));
  }

  // ---- Feeding

  openFridge(open: boolean) {
    this.fridgeTarget = open ? 1 : 0;
    if (open) this.sfx("fridge");
  }

  feed(food: FoodId) {
    if (this.asleep) this.wake();
    this.endPlay();
    const verdict = verdictFor(this.species, food);
    if (this.fish) {
      this.pellets = [];
      for (let i = 0; i < 6; i++) this.pellets.push({ pos: new THREE.Vector3(range(-0.6, 0.6), TANK.waterTop - 0.05, range(-0.9, -0.5)), alive: true });
      this.food.id = food;
      this.sfx("pop");
      this.say(verdict === "dislike" ? "🤔" : "✨", undefined, 1500);
      this.setAct({ kind: "peck", t: 0 });
      return;
    }
    const bowl = food === "water" ? this.layout.water : this.layout.bowl;
    if (!bowl) return;
    if (food === "water") this.food.water = 1;
    else {
      this.food.id = food;
      this.food.amount = 1;
    }
    this.sfx("crunch", 0.5);
    this.sound("excited");
    // The pet eats from behind the bowl so the student can see its face.
    this.goTo(bowl[0], bowl[1] - 0.5, () => this.setAct(verdict === "dislike" ? { kind: "refuse", t: 0, food } : { kind: "eat", t: 0, food, verdict }), { run: true, face: [bowl[0], bowl[1] + 1] });
  }

  // ---- Sleep

  goToSleep() {
    this.endPlay();
    if (this.asleep) return;
    const bed = this.layout.bed;
    if (this.fish) {
      this.goTo(0.7, -0.9, () => this.setAct({ kind: "sleep", t: 0, settled: false }), { y: TANK.inner.minY + 0.1 });
      return;
    }
    if (bed) {
      this.goTo(bed.x, bed.z + 0.7, () => {
        this.setAct({ kind: "arc", t: 0, from: this.pos.clone(), to: new THREE.Vector3(bed.x, 0, bed.z), g0: 0, g1: bed.y, h: 0.3, dur: 0.55, then: () => this.setAct({ kind: "sleep", t: 0, settled: false }) });
        this.sfx("boing", 0.4);
      }, { face: [bed.x, bed.z] });
    } else {
      this.setAct({ kind: "sleep", t: 0, settled: false });
    }
  }

  wake() {
    if (!this.asleep && this.act.kind !== "sleep") return;
    this.asleep = false;
    this.setAct({ kind: "wake", t: 0 });
    this.emit({ type: "woke" });
  }

  // ---- Play

  startPlay(mode: "ball" | "yarn" | "hide") {
    if (this.asleep) this.wake();
    this.endBath(false);
    this.endPlay();
    this.playMode = mode;
    if (mode === "hide") {
      this.startHide();
      return;
    }
    const b = this.ball;
    b.active = true;
    b.kind = mode;
    b.held = false;
    b.bats = 0;
    b.r = mode === "yarn" ? 0.14 : 0.13;
    if (this.fish) {
      b.pos.set(range(-0.6, 0.6), TANK.waterTop - 0.06, -0.7);
      b.vel.set(0, 0, 0);
      if (mode === "ball") this.setAct({ kind: "chase", t: 0 });
      else this.setAct({ kind: "swimfollow", t: 0, dur: 30 });
      return;
    }
    // Drop the toy in front of the pet, then the student can tap the floor to throw it.
    b.pos.set(this.pos.x + Math.sin(this.heading) * 0.6, 1.2, this.pos.z + Math.cos(this.heading) * 0.6 + 0.2);
    b.vel.set(0, 0, 0);
    this.say(mode === "ball" ? "🎾" : "🧶", "Tap the floor to throw!", 2600);
    this.setAct({ kind: "chase", t: 0 });
  }

  endPlay() {
    if (this.playMode === "hide") this.hide = { ...this.hide, active: false, phase: "off" };
    this.playMode = null;
    this.ball.active = false;
    this.ball.held = false;
    if (["chase", "carry", "bat", "wait", "hiding", "swimfollow"].includes(this.act.kind)) this.idle(1, "sit");
  }

  /** Throw the ball or roll the yarn towards a point on the floor. */
  throwTo(point: THREE.Vector3) {
    const b = this.ball;
    if (!b.active) return;
    if (this.fish) {
      b.pos.set(clamp(point.x, TANK.inner.minX + 0.2, TANK.inner.maxX - 0.2), TANK.waterTop + 0.4, -0.7);
      b.vel.set(0, -1, 0);
      this.sfx("splash", 0.4);
      this.setAct({ kind: "chase", t: 0 });
      return;
    }
    const bd = this.layout.bounds;
    const tx = clamp(point.x, bd.minX, bd.maxX);
    const tz = clamp(point.z, bd.minZ, bd.maxZ);
    const from = b.held ? this.mouthWorld(this.tmp).clone() : new THREE.Vector3(clamp(tx * 0.3, -1.5, 1.5), 1.3, 2.8);
    b.held = false;
    b.pos.copy(from);
    const T = b.kind === "yarn" ? 0.55 : 0.85;
    const g = 9.8;
    b.vel.set((tx - from.x) / T, 0, (tz - from.z) / T);
    b.vel.y = (b.r - from.y + 0.5 * g * T * T) / T;
    if (b.kind === "yarn") b.vel.multiplyScalar(0.9);
    this.sfx("whoosh");
    this.target.earPerk = 1;
    this.setAct({ kind: "chase", t: 0 });
  }

  // ---- Hide and seek

  private startHide() {
    const spots = this.fish ? TANK.hide : this.layout.hide;
    const spot = Math.floor(rand() * spots.length);
    this.hide = { active: true, phase: "count", spot, tries: 0, t: 0, wiggle: [0, 0, 0], lift: [0, 0, 0], peek: 0 };
    const [x, z] = spots[spot];
    if (this.fish) this.goTo(x, z - 0.12, () => this.setAct({ kind: "hiding", t: 0 }), { y: TANK.inner.minY + 0.15 });
    else this.goTo(x + range(-0.2, 0.2), z - 0.85, () => this.setAct({ kind: "hiding", t: 0 }), { run: true, face: "cam" });
    this.sound("giggle");
  }

  private guess(i: number) {
    const h = this.hide;
    if (h.phase !== "seek") return;
    h.tries++;
    if (i === h.spot) {
      h.phase = "found";
      h.lift[i] = 1;
      h.t = 0;
      this.sfx("found");
      this.sound("excited");
      const spots = this.fish ? TANK.hide : this.layout.hide;
      const [x, z] = spots[i];
      if (this.fish) {
        this.goTo(x, z + 0.4, () => this.setAct({ kind: "celebrate", t: 0, big: true }), { y: 1.4 });
      } else {
        this.setAct({ kind: "arc", t: 0, from: this.pos.clone(), to: new THREE.Vector3(x, 0, z + 0.85), g0: 0, g1: 0, h: 0.8, dur: 0.6, then: () => this.setAct({ kind: "celebrate", t: 0, big: true }) });
      }
      this.particles.emit("sparkle", this.tmp.set(spots[i][0], 0.9, spots[i][1]), 14, { spread: 0.4, up: 1.2, size: 0.1 });
      this.emit({ type: "found", tries: h.tries });
      this.say("🎉", h.tries === 1 ? "First try!" : "You found me!", 2600);
    } else {
      h.lift[i] = 1;
      h.wiggle[i] = 1;
      this.sfx("nope", 0.6);
      this.emit({ type: "hideMiss" });
      // A giggle from the right spot is a clue.
      setTimeout(() => this.sound("giggle"), 500);
      if (h.tries >= 2) h.peek = 1;
    }
  }

  // ---- Bath

  startBath() {
    if (this.asleep) this.wake();
    this.endPlay();
    const b = this.bath;
    b.active = true;
    b.tool = null;
    b.shower = false;
    b.wet = 0;
    b.fluff = 0;
    b.maxSoap = 0;
    b.rinsed = false;
    b.dried = false;
    b.brushed = false;
    b.rinseT = 0;
    b.soap = this.rig ? this.rig.foam.map(() => 0) : [];
    if (this.fish) {
      b.algae = Math.max(0.65, 1 - this.stats.cleanliness / 100);
      b.wet = 0;
      this.goTo(0, -0.7, () => this.setAct({ kind: "bath", t: 0 }), { y: 1.35 });
      return;
    }
    const tub = this.layout.tub;
    if (!tub) return;
    b.water = 0;
    this.goTo(tub.x + 0.2, tub.z + 1.1, () => {
      this.setAct({
        kind: "arc",
        t: 0,
        from: this.pos.clone(),
        to: new THREE.Vector3(tub.x, 0, tub.z),
        g0: 0,
        g1: tub.floor,
        h: tub.rim + 0.15,
        dur: 0.75,
        then: () => {
          this.sfx("splash");
          this.particles.emit("drop", this.tmp.set(tub.x, tub.floor + 0.4, tub.z), 20, { spread: 0.4, up: 2.2, size: 0.05 });
          this.setAct({ kind: "bath", t: 0 });
        },
      });
      this.sfx("boing", 0.5);
    }, { face: [tub.x, tub.z] });
  }

  setTool(tool: BathTool | null) {
    const b = this.bath;
    b.tool = tool;
    if (tool !== "shower" && b.shower) this.setShower(false);
    if (tool === "shower") this.setShower(!b.shower);
    audio.loop("dryer", false);
  }

  setShower(on: boolean) {
    const b = this.bath;
    b.shower = on;
    audio.loop("shower", on);
    if (!on && !this.fish && b.wet > 0.6 && b.soap.every((s) => s < 0.2) && this.act.kind === "bath") {
      setTimeout(() => {
        if (this.bath.active && this.act.kind === "bath") this.setAct({ kind: "shake", t: 0, inTub: true });
      }, 700);
    }
  }

  endBath(jumpOut = true) {
    const b = this.bath;
    if (!b.active) return;
    b.active = false;
    b.tool = null;
    b.toolOn = false;
    this.setShower(false);
    audio.loop("dryer", false);
    b.soap = b.soap.map(() => 0);
    const tub = this.layout.tub;
    if (jumpOut && tub && !this.fish) {
      const wet = b.wet > 0.3;
      this.setAct({
        kind: "arc",
        t: 0,
        from: this.pos.clone(),
        to: new THREE.Vector3(tub.x + 0.3, 0, tub.z + 1.25),
        g0: this.ground,
        g1: 0,
        h: 0.5,
        dur: 0.7,
        then: () => (wet ? this.setAct({ kind: "shake", t: 0, inTub: false }) : this.setAct({ kind: "celebrate", t: 0, big: b.brushed })),
      });
      this.sfx("boing", 0.5);
    } else if (!jumpOut) {
      this.ground = 0;
      if (this.act.kind === "bath") this.idle();
    }
    b.water = Math.min(b.water, 1);
  }

  bathScore() {
    const b = this.bath;
    if (this.fish) return { soap: b.maxSoap > 0.6, rinse: b.rinsed, dry: true, brush: b.brushed };
    return { soap: b.maxSoap > 0.45, rinse: b.rinsed, dry: b.dried, brush: b.brushed };
  }

  // ---- Talk and chat

  listen(on: boolean) {
    if (this.asleep && on) this.wake();
    this.talkMode = on ? "listen" : "off";
    if (on) {
      this.endPlay();
      if (this.act.kind !== "listen") this.setAct({ kind: "listen", t: 0 });
      this.sfx("tap");
    } else if (this.act.kind === "listen") this.idle(1, "sit");
  }

  speak(on: boolean) {
    this.talkMode = on ? "speak" : "off";
    if (on) this.setAct({ kind: "speak", t: 0, dur: 99, fake: false, mood: "happy" });
    else if (this.act.kind === "speak") {
      this.setAct({ kind: "celebrate", t: 0, big: false });
    }
  }

  chatReply(mood: ChatMood, length: number) {
    if (this.asleep) this.wake();
    const dur = clamp(length / 26, 0.8, 3.2);
    this.setAct({ kind: "speak", t: 0, dur, fake: true, mood });
    const s: Mood = mood === "concerned" ? "content" : mood === "excited" || mood === "joke" ? "excited" : mood === "sleepy" ? "sleepy" : "happy";
    this.sound(s);
    if (mood === "love" || mood === "happy") this.particles.emit("heart", this.headWorld(this.tmp).add(new THREE.Vector3(0, 0.25, 0)), mood === "love" ? 4 : 2, { size: 0.09, up: 0.6 });
  }

  breathe() {
    this.setAct({ kind: "pose", t: 0, dur: 30, style: "breathe" });
  }

  dance(dur = 6) {
    if (this.asleep) return;
    this.setAct({ kind: "dance", t: 0, dur });
    this.emit({ type: "dance" });
  }

  // ======================================================================= input from the canvas

  pointerMove(ground: THREE.Vector3 | null, hit: HitInfo | null) {
    if (ground) {
      this.pointer.ground.copy(ground);
      this.pointer.seenAt = this.time;
    }
    const b = this.bath;
    const onPet = !!hit?.part || !!hit?.glass;
    this.pointer.onPet = onPet;
    if (b.active && b.tool && hit && (hit.point || hit.glass)) {
      b.toolPos.copy((hit.point ?? hit.glass)!);
      b.toolOn = true;
    } else if (b.active && b.tool && ground) {
      b.toolPos.copy(ground).setY(this.fish ? 1.3 : 0.9);
      b.toolOn = true;
    }
    if (!this.pointer.down) return;
    const p = hit?.point ?? hit?.glass;
    if (p) {
      const d = this.pointer.last.distanceTo(p);
      this.pointer.last.copy(p);
      if (d > 0.5) return;
      if (b.active && b.tool) this.applyTool(p, d, hit!);
      else if (hit?.part === "back" || hit?.part === "head") {
        this.pointer.stroke += d;
        if (this.pointer.stroke > 0.35) {
          this.pointer.stroke = 0;
          this.touch(hit.part, p, true);
        }
      }
    }
  }

  pointerDown(hit: HitInfo) {
    this.lastHit = hit.part ?? (hit.spot !== undefined ? `spot${hit.spot}` : hit.glass ? "glass" : hit.ground ? "ground" : "none");
    this.pointer.down = true;
    this.pointer.stroke = 0;
    const p = hit.point ?? hit.glass;
    if (p) this.pointer.last.copy(p);
    if (this.hide.active && this.hide.phase === "seek" && (hit.spot !== undefined || hit.part)) {
      // Tapping a peeking ear counts as finding them too.
      this.guess(hit.part ? this.hide.spot : hit.spot!);
      return;
    }
    if (this.bath.active && this.bath.tool) {
      if (this.bath.tool === "dryer") audio.loop("dryer", true);
      if (p) this.applyTool(p, 0.05, hit);
      return;
    }
    if (hit.part && hit.point) {
      if (this.ball.active && this.ball.held && hit.ground) {
        this.throwTo(hit.ground);
        return;
      }
      this.touch(hit.part, hit.point, false);
      return;
    }
    if (this.ball.active && hit.ground) {
      this.throwTo(hit.ground);
      return;
    }
    if (this.fish && hit.glass) {
      this.particles.emit("bubble", hit.glass, 4, { spread: 0.05, up: 0.4, size: 0.04 });
      this.sfx("pop", 0.5);
      if (this.isIdleish()) this.goTo(hit.glass.x, -0.5, () => this.idle(2, "you"), { y: clamp(hit.glass.y, TANK.inner.minY, TANK.inner.maxY), face: "cam" });
      return;
    }
    if (hit.ground && this.isIdleish() && !this.fish) {
      // Come here!
      this.sfx("tap");
      this.goTo(hit.ground.x, hit.ground.z, () => this.idle(2, this.friendship > 40 ? "you" : "look"), { run: this.friendship > 25, look: "target" });
    }
  }

  pointerUp() {
    this.pointer.down = false;
    if (this.bath.tool === "dryer") audio.loop("dryer", false);
  }

  pointerLeave() {
    this.pointer.down = false;
    this.bath.toolOn = false;
    audio.loop("dryer", false);
  }

  private isIdleish() {
    return this.act.kind === "idle" || this.act.kind === "follow" || (this.act.kind === "goto" && !this.playMode && !this.bath.active);
  }

  private touch(part: BodyPart, point: THREE.Vector3, stroke: boolean) {
    if (this.bath.active || this.hide.active) {
      this.particles.emit("heart", this.tmp.copy(point).add(new THREE.Vector3(0, 0.15, 0)), 1, { size: 0.08 });
      this.sound("giggle");
      return;
    }
    if (this.asleep) {
      if (part === "head" || stroke) {
        this.particles.emit("heart", this.tmp.copy(point).add(new THREE.Vector3(0, 0.2, 0)), 1, { size: 0.08 });
        audio.purr(0.8);
        return;
      }
      this.wake();
      return;
    }
    const local = this.tmp2.copy(point);
    this.rig?.root.worldToLocal(local);
    const side = local.x >= 0 ? 1 : -1;
    if (stroke && this.act.kind === "react") {
      this.act.t = Math.min(this.act.t, 0.4);
      this.particles.emit("heart", this.tmp.copy(point).add(new THREE.Vector3(0, 0.2, 0)), 1, { size: 0.07 });
      this.emit({ type: "touch", part });
      return;
    }
    this.setAct({ kind: "react", t: 0, part, side, dur: part === "belly" ? 2.2 : part === "tail" ? 1.8 : part === "nose" ? 1.6 : 1.5 });
    if (part === "ear") twitchEar(this.anim, side > 0 ? 0 : 1);
    squash(this.anim, 0.08);
    this.emit({ type: "touch", part });
    const hp = this.tmp.copy(point).add(new THREE.Vector3(0, 0.15, 0));
    switch (part) {
      case "head":
        this.particles.emit("heart", hp, 2, { size: 0.08, up: 0.5 });
        if (this.species === "cat") audio.purr(1.4);
        else this.sound("content");
        break;
      case "ear":
        this.sound("giggle");
        break;
      case "belly":
        this.sound("giggle");
        this.particles.emit("sparkle", hp, 5, { size: 0.06 });
        break;
      case "paw":
        setTimeout(() => {
          this.sfx("clap");
          this.particles.emit("sparkle", this.mouthWorld(this.tmp).add(new THREE.Vector3(side * 0.2, 0.15, 0.2)), 8, { size: 0.08, spread: 0.1 });
        }, 380);
        this.say("✋", "High five!", 1500);
        break;
      case "tail":
        this.sound("happy");
        break;
      case "back":
        if (this.species === "cat" || this.species === "rabbit" || this.species === "guineapig") audio.purr(1.6);
        else this.sound("content");
        this.particles.emit("heart", hp, 2, { size: 0.08 });
        break;
      case "nose":
        this.sfx("kiss");
        break;
    }
  }

  private applyTool(p: THREE.Vector3, dist: number, hit: HitInfo) {
    const b = this.bath;
    const amt = Math.min(0.25, dist);
    if (b.tool === "shampoo") {
      if (this.fish) {
        b.algae = Math.max(0, b.algae - amt * 0.45);
        b.maxSoap = Math.max(b.maxSoap, 1 - b.algae);
        if (rand() < 0.5) this.particles.emit("bubble", p, 2, { spread: 0.08, up: 0.3, size: 0.05 });
        if (this.time - b.lastEmit > 0.15) {
          this.sfx("rub", 0.6);
          b.lastEmit = this.time;
        }
      } else if (hit.part && this.rig) {
        // Lather builds up on the foam blobs nearest the finger.
        this.rig.foam.forEach((blob, i) => {
          blob.getWorldPosition(this.tmp);
          const d = this.tmp.distanceTo(p);
          // Lather builds fastest under the finger and spreads a little everywhere.
          const near = d < 0.45 ? amt * 3.4 * (1 - d / 0.45) + 0.03 : 0;
          b.soap[i] = Math.min(1, (b.soap[i] ?? 0) + near + amt * 0.35);
        });
        const avg = b.soap.reduce((a, s) => a + s, 0) / Math.max(1, b.soap.length);
        b.maxSoap = Math.max(b.maxSoap, avg);
        b.wet = Math.max(b.wet, 0.35);
        if (rand() < 0.6) this.particles.emit("bubble", p, 2, { spread: 0.06, up: 0.35, size: 0.06 });
        if (this.time - b.lastEmit > 0.14) {
          this.sfx("squish", 0.7);
          b.lastEmit = this.time;
          if (rand() < 0.15) this.sound("giggle");
        }
        this.target.happy = 0.7;
      }
    } else if (b.tool === "towel") {
      if (!hit.part) return;
      b.wet = Math.max(0, b.wet - amt * 0.6);
      if (this.time - b.lastEmit > 0.18) {
        this.sfx("rub", 0.5);
        b.lastEmit = this.time;
      }
      if (b.rinsed && b.wet < 0.15) b.dried = true;
    } else if (b.tool === "dryer") {
      // Handled continuously in update while held.
    } else if (b.tool === "brush") {
      if (this.fish) {
        b.fluff = Math.min(1, b.fluff + amt * 0.5);
        if (rand() < 0.5) this.particles.emit("sparkle", p, 1, { spread: 0.05, size: 0.06 });
        if (b.fluff > 0.8) b.brushed = true;
        return;
      }
      if (!hit.part) return;
      if (b.wet > 0.35) {
        if (this.time - b.lastEmit > 1.2) {
          this.say("💧", "Dry me first!", 1400);
          b.lastEmit = this.time;
        }
        return;
      }
      b.fluff = Math.min(1, b.fluff + amt * 0.8);
      if (rand() < 0.45) this.particles.emit("sparkle", p, 1, { spread: 0.05, size: 0.06 });
      if (this.time - b.lastEmit > 0.2) {
        this.sfx("rub", 0.35);
        b.lastEmit = this.time;
      }
      this.target.happy = 0.9;
      if (b.fluff > 0.85 && !b.brushed) {
        b.brushed = true;
        this.sfx("sparkle");
        this.say("✨", "So fluffy!", 1800);
      }
    }
  }

  // ======================================================================= the frame

  update(dt: number) {
    dt = Math.min(dt, 0.05);
    this.time += dt;
    const T = this.target;
    Object.assign(T, POSE_DEFAULT);
    this.moveSpeed = 0;
    this.gaitSpeed = 0;
    this.particles.scale = this.reduced ? 0.5 : 1;
    this.voice = this.talkMode === "speak" ? audio.voiceLevel() : this.voice * 0.85;

    this.runAct(dt);
    this.moodLayer(dt);
    this.updateToys(dt);
    this.updateBath(dt);
    this.updateHide(dt);
    this.fridgeOpen += (this.fridgeTarget - this.fridgeOpen) * (1 - Math.exp(-6 * dt));
    this.dim += ((this.asleep ? 1 : 0) - this.dim) * (1 - Math.exp(-1.5 * dt));

    // Physics for jumps
    if (this.vy !== 0 || this.air > 0) {
      this.air += this.vy * dt;
      this.vy -= 14 * dt;
      if (this.air <= 0) {
        this.air = 0;
        this.vy = 0;
        this.sfx("step", 0.6);
      }
    }
    // Parrots fly for longer trips.
    this.alt += (this.altTarget - this.alt) * (1 - Math.exp(-3 * dt));

    // Hop gait gets its height from the gait phase.
    let hopAir = 0;
    if (this.spec.gait === "hop" && this.gaitSpeed > 0.05) hopAir = Math.max(0, Math.sin(this.anim.phase)) * 0.2 * this.pose.walk;
    if (this.spec.gait === "flutter" && this.gaitSpeed > 0.05 && this.alt < 0.05) hopAir = Math.max(0, Math.sin(this.anim.phase * 2)) * 0.05;

    dampPose(this.pose, T, dt);
    const rig = this.rig;
    if (!rig) {
      this.particles.update(dt);
      return;
    }
    const totalAir = this.air + hopAir;
    if (this.fish) rig.root.position.copy(this.pos);
    else rig.root.position.set(this.pos.x, this.ground + totalAir + this.alt, this.pos.z);
    rig.root.rotation.y = this.heading + this.spin;
    animateRig(rig, this.spec, this.pose, this.anim, {
      dt,
      speed: this.gaitSpeed || this.moveSpeed,
      air: totalAir + this.alt,
      voice: this.voice,
      reduced: this.reduced,
      soap: this.bath.soap,
    });
    if (this.inflate > 0.001) rig.torso.scale.multiplyScalar(1 + this.inflate * 0.12);
    this.anim.wet = this.bath.wet;
    this.anim.fluff = this.bath.fluff;
    // Footsteps
    if (!this.fish && this.moveSpeed > 0.2 && this.air < 0.01 && this.alt < 0.05) {
      if (Math.sin(this.anim.phase) > 0.95 && this.time - this.lastStep > 0.18) {
        this.lastStep = this.time;
        this.sfx("step", this.spec.gait === "plod" ? 0.8 : 0.35);
      }
    }
    this.particles.update(dt, this.ground);
  }

  // ----------------------------------------------------------------------- moods

  private moodLayer(dt: number) {
    const T = this.target;
    const s = this.stats;
    const busy = this.act.kind !== "idle";
    if (this.act.kind !== "sleep") {
      if (s.energy < 22) {
        T.lid = Math.max(T.lid, 0.35);
        T.earPerk = Math.min(T.earPerk, -0.3);
      }
      if (s.happiness < 30 && !busy) {
        T.sad = Math.max(T.sad, 0.7);
        T.earPerk = Math.min(T.earPerk, -0.5);
        T.tailWag = Math.min(T.tailWag, 0.1);
      } else if (s.happiness > 75) {
        T.tailWag = Math.max(T.tailWag, 0.45);
        if (T.earPerk === 0) T.earPerk = 0.25;
      }
      if (s.health < 45) T.sad = Math.max(T.sad, 0.4);
    }
    // Needs: a gentle reminder now and then, never nagging.
    if (!busy && !this.asleep && this.time - this.lastNeed > 16) {
      this.lastNeed = this.time;
      if (s.hunger < 30) {
        this.say("🍽️", rand() < 0.5 ? "I'm a bit peckish" : undefined, 2600);
        this.sound("ask");
        if (this.layout.bowl && !this.fish) this.goTo(this.layout.bowl[0] - 0.55, this.layout.bowl[1] + 0.2, () => this.idle(4, "beg"), { face: "cam" });
      } else if (s.energy < 18) {
        this.say("💤", "So sleepy...", 2600);
        this.idle(2.5, "yawn");
        if (s.energy < 10 && (this.layout.bed || this.fish)) setTimeout(() => this.isIdleish() && this.goToSleep(), 2500);
      } else if (s.cleanliness < 28) {
        this.say("🛁", rand() < 0.5 ? "Bath time?" : undefined, 2400);
        this.idle(2, "scratch");
      } else if (s.happiness < 35) {
        this.say("🧸", "Play with me?", 2400);
        this.sound("ask");
      }
    }
    void dt;
  }

  // ----------------------------------------------------------------------- acts

  private runAct(dt: number) {
    const a = this.act;
    a.t += dt;
    const T = this.target;
    const spec = this.spec;
    switch (a.kind) {
      case "idle":
        this.runIdle(a, dt);
        break;
      case "goto": {
        const speed = spec.speed * (a.run ? 1.7 : 1) * (this.stats.energy < 20 ? 0.8 : 1);
        let arrived: boolean;
        if (this.fish) arrived = this.swim(a.x, a.y ?? this.pos.y, a.z, speed, dt);
        else arrived = this.steer(a.x, a.z, speed, dt, a.run);
        T.walk = this.moveSpeed > 0.05 || this.gaitSpeed > 0.05 ? 1 : 0;
        T.run = a.run ? 1 : 0;
        T.tailWag = a.run ? 0.8 : 0.4;
        T.earPerk = a.run ? 0.5 : 0.2;
        if (a.look === "cam") this.lookAt(this.camPos, 0.6);
        else this.lookAt(this.tmp.set(a.x, 0.3, a.z), 0.4);
        if (arrived || a.t > a.timeout) {
          if (a.face && !this.fish) {
            const fx = a.face === "cam" ? this.camPos.x : a.face[0];
            const fz = a.face === "cam" ? this.camPos.z : a.face[1];
            const want = Math.atan2(fx - this.pos.x, fz - this.pos.z);
            if (Math.abs(wrapAngle(want - this.heading)) > 0.12 && a.t < a.timeout + 1.5) {
              this.turnTo(want, dt, 6);
              T.walk = 0.4;
              this.gaitSpeed = 0.5;
              break;
            }
          } else if (a.face === "cam" && this.fish) {
            this.turnTo(Math.atan2(this.camPos.x - this.pos.x, this.camPos.z - this.pos.z), dt, 4);
          }
          this.altTarget = 0;
          a.then();
        }
        break;
      }
      case "arc": {
        const k = Math.min(1, a.t / a.dur);
        this.pos.lerpVectors(a.from, a.to, k);
        this.ground = THREE.MathUtils.lerp(a.g0, a.g1, k);
        this.air = 4 * a.h * k * (1 - k);
        T.crouch = k < 0.15 ? 1 : 0;
        T.earPerk = 0.6;
        T.tailWag = 0.7;
        const want = Math.atan2(a.to.x - a.from.x, a.to.z - a.from.z);
        if (a.from.distanceTo(a.to) > 0.1) this.turnTo(want, dt, 10);
        if (k >= 1) {
          this.air = 0;
          squash(this.anim, 0.18);
          a.then();
        }
        break;
      }
      case "eat":
        this.runEat(a, dt);
        break;
      case "refuse":
        this.runRefuse(a, dt);
        break;
      case "react":
        this.runReact(a, dt);
        break;
      case "celebrate": {
        T.happy = 1;
        T.tailWag = 1;
        T.earPerk = 1;
        T.mouth = 0.4;
        this.lookAt(this.camPos, 0.8);
        if (this.fish) {
          this.spin += dt * 7 * (a.t < 1 ? 1 : 0);
          this.pos.y += Math.sin(a.t * 8) * dt * 0.4;
        } else if (spec.family === "bird") T.wing = a.t < 1.2 ? 1 : 0;
        const hops = a.big ? 2 : 1;
        for (let i = 0; i < hops; i++) {
          const at = 0.1 + i * 0.55;
          if (a.t - dt < at && a.t >= at && this.air <= 0) {
            this.vy = a.big ? 3.6 : 2.8;
            this.sfx("boing", 0.6);
            this.particles.emit("heart", this.headWorld(this.tmp).add(new THREE.Vector3(0, 0.3, 0)), a.big ? 3 : 2, { size: 0.1, up: 0.8 });
          }
        }
        if (a.t > 1.15 && a.t < 1.75 && a.big) this.spin += dt * Math.PI * 2 / 0.6;
        if (a.t > (a.big ? 2.1 : 1.3)) {
          this.spin = 0;
          if (this.stay !== "off") this.chooseIdle();
          else this.idle(range(1.5, 3), "sit");
        }
        break;
      }
      case "sleep":
        this.runSleep(a, dt);
        break;
      case "wake": {
        T.stretch = a.t < 1.2 ? 1 : 0;
        T.mouth = a.t > 0.2 && a.t < 1.0 ? 1 : 0;
        T.lid = a.t < 1.1 ? 0.6 : 0;
        T.earPerk = -0.2;
        if (a.t > 0.2 && a.t - dt <= 0.2) this.sfx("yawn");
        if (this.ground > 0 && a.t > 1.3 && !this.fish) {
          const bed = this.layout.bed;
          if (bed) {
            this.setAct({ kind: "arc", t: 0, from: this.pos.clone(), to: new THREE.Vector3(bed.x + 0.2, 0, bed.z + 0.8), g0: this.ground, g1: 0, h: 0.3, dur: 0.5, then: () => this.idle(1.5, "look") });
            break;
          }
          this.ground = 0;
        }
        if (a.t > 1.6) this.idle(1.5, "look");
        break;
      }
      case "chase":
        this.runChase(a, dt);
        break;
      case "carry":
        this.runCarry(a, dt);
        break;
      case "wait": {
        T.sit = 1;
        T.tailWag = 0.8;
        T.earPerk = 0.6;
        T.happy = a.t < 1 ? 0.6 : 0;
        this.lookAt(this.ball.active && !this.ball.held ? this.ball.pos : this.camPos, 0.9);
        if (a.t > 8 && this.ball.active) {
          this.say(this.ball.kind === "ball" ? "🎾" : "🧶", "Again?", 1800);
          a.t = 0;
        }
        break;
      }
      case "bat":
        this.runBat(a, dt);
        break;
      case "hiding": {
        // Lie low behind the hiding spot. After two wrong guesses, peek out a little as a clue.
        const peek = this.hide.peek > 0;
        T.lie = peek ? 0.2 : 1;
        T.sit = peek ? 1 : 0;
        T.curl = peek ? 0 : 0.35;
        T.headDip = peek ? 0 : 0.4;
        T.happy = 0.5;
        T.tailWag = 0.5;
        T.earPerk = -0.2;
        if (this.fish) this.pos.y = TANK.inner.minY + 0.15 + Math.sin(this.time) * 0.02;
        break;
      }
      case "bath":
        this.runBath(a, dt);
        break;
      case "shake": {
        T.shake = a.t > 0.15 && a.t < 1.25 ? 1 : 0;
        T.lid = 0.7;
        T.earPerk = 0.2;
        if (a.t > 0.15 && a.t < 1.25 && rand() < 0.7) {
          const c = this.petCenter(this.tmp);
          const dir = new THREE.Vector3(range(-1, 1), range(0.2, 1), range(-1, 1)).normalize();
          this.particles.emit("drop", c, 2, { spread: 0.25, speed: 2.4, dir, size: 0.045 });
        }
        if (a.t > 0.15 && a.t - dt <= 0.15) this.sfx("shake");
        if (a.t > 1.25) this.bath.wet = Math.max(this.bath.active ? 0.35 : 0.15, this.bath.wet - dt * 0.8);
        if (a.t > 1.6) {
          if (a.inTub && this.bath.active) {
            this.setAct({ kind: "bath", t: 0 });
            this.say("😄", "Brrr! Towel please!", 2000);
          } else this.setAct({ kind: "celebrate", t: 0, big: false });
        }
        break;
      }
      case "listen": {
        T.earPerk = 1;
        T.sit = this.fish ? 0 : 1;
        T.headTilt = Math.sin(a.t * 1.7) * 0.28;
        T.tailWag = 0.3 + this.voice * 0.7;
        this.lookAt(this.camPos, 1);
        const lvl = audio.micLevel();
        T.happy = lvl > 0.3 ? 0.3 : 0;
        if (lvl > 0.35 && rand() < 0.03) twitchEar(this.anim, rand() < 0.5 ? 0 : 1);
        this.faceCam(dt);
        break;
      }
      case "speak": {
        T.sit = this.fish ? 0 : 0.8;
        T.earPerk = 0.6;
        T.tailWag = 0.8;
        this.lookAt(this.camPos, 1);
        this.faceCam(dt);
        if (a.fake) {
          const k = a.t / a.dur;
          T.mouth = k < 1 ? Math.max(0, Math.sin(a.t * 17) * 0.6 + Math.sin(a.t * 7) * 0.3) : 0;
          if (a.mood === "concerned") {
            T.sad = 0.6;
            T.headTilt = 0.25;
            T.earPerk = -0.2;
            T.tailWag = 0.2;
          } else if (a.mood === "joke") {
            T.wiggle = k > 0.6 ? 1 : 0;
            T.happy = k > 0.6 ? 1 : 0;
          } else if (a.mood === "excited") {
            T.happy = 0.6;
            if (a.t > 0.2 && a.t - dt <= 0.2 && this.air <= 0) this.vy = 2.6;
          } else if (a.mood === "sleepy") T.lid = 0.5;
          else if (a.mood === "love") T.happy = 0.9;
          else T.happy = 0.3;
          if (a.t > a.dur + 0.8) this.setAct({ kind: "pose", t: 0, dur: 999, style: "sitcam" });
        } else {
          T.dance = this.voice * 0.4;
          T.happy = this.voice > 0.4 ? 0.3 : 0;
        }
        break;
      }
      case "dance": {
        T.dance = 1;
        T.happy = 0.8;
        T.tailWag = 1;
        T.earPerk = 0.8;
        if (this.spec.family === "bird") T.wing = 0.5;
        if (this.fish) {
          this.pos.y = 1.35 + Math.sin(a.t * 3) * 0.2;
          this.heading += dt * 2;
        }
        this.lookAt(this.camPos, 0.7);
        if (rand() < dt * 2) this.particles.emit("note", this.headWorld(this.tmp).add(new THREE.Vector3(range(-0.3, 0.3), 0.4, 0)), 1, { size: 0.28, up: 0.5, life: 1.8 });
        if (a.t > a.dur) this.idle(2, "sit");
        break;
      }
      case "follow": {
        const p = this.pointer.ground;
        const far = this.tmp.set(p.x - this.pos.x, 0, p.z - this.pos.z).length();
        if (far > 0.7) {
          this.steer(p.x, p.z, spec.speed, dt, false);
          T.walk = 1;
        } else {
          T.sit = 1;
          this.faceToward(p.x, p.z, dt);
        }
        T.tailWag = 0.8;
        T.happy = 0.2;
        this.lookAt(this.tmp.set(p.x, 0.4, p.z), 1);
        if (a.t > a.dur || this.time - this.pointer.seenAt > 3) this.idle(1.5, "sit");
        break;
      }
      case "swimfollow": {
        const p = this.pointer.ground;
        const tx = clamp(p.x * 0.5, TANK.inner.minX + 0.2, TANK.inner.maxX - 0.2);
        const ty = 1.4 + Math.sin(this.time * 0.8) * 0.25;
        this.swim(tx, ty, -0.45, spec.speed * 1.3, dt);
        T.walk = 1;
        T.happy = 0.3;
        if (rand() < dt * 0.6) {
          this.emit({ type: "yarn" });
          this.particles.emit("bubble", this.mouthWorld(this.tmp), 2, { size: 0.04, up: 0.4 });
        }
        if (a.t > a.dur) this.endPlay();
        break;
      }
      case "peck":
        this.runPeck(a, dt);
        break;
      case "pose": {
        if (a.style === "present") {
          T.sit = this.fish ? 0 : 1;
          T.happy = Math.sin(a.t * 0.55) > 0.94 ? 0.8 : 0.05;
          T.tailWag = 0.6;
          T.earPerk = 0.5;
          T.headTilt = Math.sin(a.t * 0.8) * 0.15;
          this.lookAt(this.camPos, 1);
          this.faceCam(dt);
        } else if (a.style === "sitcam") {
          T.sit = this.fish ? 0 : 1;
          T.tailWag = 0.5;
          T.earPerk = 0.3;
          T.headTilt = Math.sin(a.t * 0.7) * 0.1;
          this.lookAt(this.camPos, 1);
          this.faceCam(dt);
          if (a.t > a.dur) this.idle(2, "sit");
        } else if (a.style === "breathe") {
          // 4 seconds in, 6 seconds out: the pet puffs up and lets go.
          const cyc = a.t % 10;
          const k = cyc < 4 ? cyc / 4 : 1 - (cyc - 4) / 6;
          this.inflate = Math.sin((k * Math.PI) / 2);
          T.sit = this.fish ? 0 : 1;
          T.lid = 0.55 + (1 - k) * 0.3;
          T.happy = 0;
          this.lookAt(this.camPos, 1);
          this.faceCam(dt);
          if (a.t > 30) {
            this.inflate = 0;
            this.setAct({ kind: "celebrate", t: 0, big: false });
          }
        } else if (a.style === "spin") {
          T.happy = 1;
          T.tailWag = 1;
          T.earPerk = 1;
          const k = Math.min(1, a.t / 0.9);
          this.spin = k * Math.PI * 2;
          if (a.t > 0.1 && a.t - dt <= 0.1 && this.air <= 0) this.vy = 2.6;
          if (a.t > a.dur) {
            this.spin = 0;
            this.setAct({ kind: "pose", t: 0, dur: 999, style: "present" });
          }
        }
        if (a.style !== "breathe") this.inflate *= 0.9;
        break;
      }
    }
  }

  /** Turn to the student, at a slight angle so the pet reads as a 3D character. */
  private faceCam(dt: number) {
    const off = this.fish ? 0.85 : this.species === "gecko" ? 0.55 : this.species === "turtle" ? 0.4 : 0.22;
    const want = Math.atan2(this.camPos.x - this.pos.x, this.camPos.z - this.pos.z) + (this.pos.x > 0.4 ? -off : off);
    if (this.fish) {
      this.turnTo(want, dt, 3);
      return;
    }
    const diff = wrapAngle(want - this.heading);
    if (Math.abs(diff) > 0.1) {
      this.turnTo(want, dt, 5);
      this.gaitSpeed = Math.max(this.gaitSpeed, 0.4);
      this.target.walk = Math.max(this.target.walk, 0.4);
    }
  }

  private faceToward(x: number, z: number, dt: number) {
    const want = Math.atan2(x - this.pos.x, z - this.pos.z);
    const diff = wrapAngle(want - this.heading);
    if (Math.abs(diff) > 0.1) {
      this.turnTo(want, dt, 5);
      this.gaitSpeed = Math.max(this.gaitSpeed, 0.4);
      this.target.walk = Math.max(this.target.walk, 0.4);
    }
  }

  private runIdle(a: Extract<Act, { kind: "idle" }>, dt: number) {
    const T = this.target;
    const sp = this.spec;
    switch (a.sub) {
      case "sit":
        T.sit = this.fish ? 0 : 1;
        this.lookAround(a.t);
        break;
      case "lie":
        T.lie = 1;
        T.lid = 0.25;
        this.lookAround(a.t * 0.5);
        break;
      case "look":
        this.lookAround(a.t);
        break;
      case "you":
        T.sit = this.fish ? 0 : 1;
        T.tailWag = 0.7;
        T.happy = a.t < 0.6 ? 0.6 : 0;
        this.lookAt(this.camPos, 1);
        this.faceCam(dt);
        break;
      case "sniff":
        T.headDip = 0.7 + Math.sin(a.t * 9) * 0.15;
        T.earPerk = 0.3;
        if (rand() < dt * 1.5 && this.spec.sound === "snuffle") this.sound("content");
        break;
      case "stretch":
        T.stretch = a.t < 1.6 ? 1 : 0;
        T.lid = 0.5;
        T.mouth = a.t > 0.4 && a.t < 1.1 ? 0.8 : 0;
        break;
      case "yawn":
        T.mouth = a.t > 0.2 && a.t < 1.0 ? 1 : 0;
        T.lid = 0.6;
        T.earPerk = -0.5;
        if (a.t > 0.2 && a.t - dt <= 0.2) this.sfx("yawn", 0.7);
        break;
      case "scratch":
        T.sit = 1;
        T.headTilt = 0.3;
        T.lid = 0.4;
        T.pawR = sp.family === "quad" ? 0.5 + Math.sin(a.t * 22) * 0.25 : 0;
        if (sp.family === "bird") {
          T.headDip = 0.5;
          T.headYaw = 0.9;
        }
        break;
      case "groom":
        T.sit = 1;
        T.pawL = 0.7;
        T.headDip = 0.3;
        T.lid = 0.6;
        T.tongue = Math.sin(a.t * 8) > 0 ? 0.6 : 0;
        break;
      case "tailchase":
        this.spin += dt * 6;
        T.walk = 1;
        this.gaitSpeed = 1.2;
        T.tailWag = 1;
        T.happy = 0.5;
        T.headYaw = 0.8;
        if (a.t > a.dur) this.spin = 0;
        break;
      case "popcorn":
        if (this.air <= 0 && this.vy === 0 && a.t % 0.6 < dt) {
          this.vy = 3;
          this.sound("excited");
        }
        T.happy = 1;
        this.spin = Math.sin(a.t * 6) * 0.5;
        if (a.t > a.dur) this.spin = 0;
        break;
      case "flap":
        T.wing = 1;
        T.happy = 0.6;
        if (a.t < 0.05) this.sound("happy");
        break;
      case "beg":
        T.sit = 1;
        T.beg = this.spec.id === "dog" || this.spec.id === "hamster" || this.spec.id === "rabbit" || this.spec.id === "guineapig" ? 0.8 : 0;
        T.earPerk = 0.4;
        T.tailWag = 0.6;
        T.sad = 0.4;
        this.lookAt(this.camPos, 1);
        this.faceCam(dt);
        break;
      case "swim":
        if (a.x !== undefined) {
          if (this.swim(a.x, a.y ?? 1.3, a.z ?? -0.7, this.spec.speed * 0.6, dt)) a.dur = Math.min(a.dur, a.t + 0.5);
        }
        T.walk = 0.6;
        break;
      case "rest":
        T.lid = 0.3;
        T.walk = 0.1;
        this.pos.y += (TANK.inner.minY + 0.12 - this.pos.y) * dt;
        break;
      case "loop":
        T.roll = Math.min(1, a.t / 0.8) < 1 ? Math.sin(Math.min(1, a.t / 1.4) * Math.PI) : 0;
        T.walk = 1;
        T.happy = 0.6;
        break;
      case "bubbles":
        T.mouth = Math.sin(a.t * 10) > 0.5 ? 0.6 : 0;
        if (rand() < dt * 5) this.particles.emit("bubble", this.mouthWorld(this.tmp), 1, { size: 0.035, up: 0.4, spread: 0.02 });
        break;
      case "stand":
      default:
        this.lookAround(a.t);
    }
    if (this.fish) {
      this.pos.y += Math.sin(this.time * 1.3) * dt * 0.03;
    }
    if (a.t > a.dur) this.chooseIdle();
  }

  private lookAround(t: number) {
    const ptrFresh = this.time - this.pointer.seenAt < 2.5;
    if (ptrFresh) this.lookAt(this.tmp.set(this.pointer.ground.x, this.fish ? 1.3 : 0.4, this.pointer.ground.z), 0.8);
    else {
      this.target.headYaw = Math.sin(t * 0.7 + this.time * 0.3) * 0.45;
      this.target.headPitch = Math.sin(t * 0.5) * 0.1;
      this.target.lookX = Math.sin(t * 1.1) * 0.4;
    }
  }

  private chooseIdle() {
    if (this.stay !== "off" && !this.asleep) {
      this.comeToFront(() => this.setAct({ kind: "pose", t: 0, dur: 999, style: this.stay === "present" ? "present" : "sitcam" }));
      return;
    }
    const s = this.stats;
    const f = this.friendship;
    const sp = this.spec;
    if (this.fish) {
      const r = rand();
      if (r < 0.55) {
        const I = TANK.inner;
        this.setAct({ kind: "idle", t: 0, dur: range(3, 6), sub: "swim", x: range(I.minX + 0.2, I.maxX - 0.2), y: range(I.minY + 0.1, I.maxY - 0.1), z: range(I.minZ + 0.2, I.maxZ - 0.15) });
      } else if (r < 0.65) this.idle(2.2, "loop");
      else if (r < 0.8) this.idle(2.5, "bubbles");
      else if (r < 0.9 && s.energy < 50) this.idle(5, "rest");
      else this.setAct({ kind: "goto", t: 0, x: range(-0.5, 0.5), z: -0.35, y: 1.35, run: false, face: "cam", then: () => this.idle(2.5, "you"), timeout: 6, look: "cam" });
      return;
    }
    if (this.musicOn && s.happiness > 50 && rand() < 0.25 && !this.reduced) {
      this.dance(range(4, 7));
      return;
    }
    if (s.energy < 12 && (this.layout.bed || rand() < 0.3)) {
      this.goToSleep();
      return;
    }
    const opts: [() => void, number][] = [
      [() => this.wander(), 34],
      [() => this.idle(range(2, 4), "sit"), 14],
      [() => this.idle(range(2, 3.5), "look"), 12],
      [() => this.idle(range(3, 6), "lie"), s.energy < 60 ? 14 : 5],
      [() => this.idle(range(1.5, 2.5), "sniff"), 9],
      [() => this.idle(2, "stretch"), 5],
      [() => this.idle(1.6, "yawn"), s.energy < 50 ? 6 : 1],
      [() => this.sitWithYou(range(4, 7)), f >= 60 ? 12 : 0],
      [() => this.comeToFront(() => this.idle(3, "you"), false, range(-1, 1)), 5 + f * 0.1],
      [() => this.setAct({ kind: "follow", t: 0, dur: range(4, 7) }), f >= 35 && this.time - this.pointer.seenAt < 1.5 ? 25 : 0],
      [() => this.idle(1.6, "tailchase"), sp.id === "dog" && s.happiness > 55 ? 5 : 0],
      [() => this.idle(2.4, "groom"), sp.id === "cat" || sp.id === "rabbit" || sp.id === "hamster" ? 7 : 0],
      [() => this.idle(1.8, "popcorn"), (sp.id === "guineapig" || sp.id === "rabbit") && s.happiness > 60 && !this.reduced ? 5 : 0],
      [() => this.idle(1.2, "flap"), sp.family === "bird" ? 7 : 0],
      [() => this.idle(1.6, "scratch"), s.cleanliness < 45 ? 8 : 1],
    ];
    const total = opts.reduce((a, [, w]) => a + w, 0);
    let r = rand() * total;
    for (const [fn, w] of opts) {
      r -= w;
      if (r <= 0) {
        fn();
        return;
      }
    }
    this.wander();
  }

  private wander() {
    const b = this.layout.bounds;
    const x = range(b.minX + 0.4, b.maxX - 0.4);
    const z = range(b.minZ + 0.3, b.maxZ - 0.3);
    this.goTo(x, z, () => this.idle(range(1, 2.5), rand() < 0.4 ? "sniff" : "look"));
  }

  private runEat(a: Extract<Act, { kind: "eat" }>, dt: number) {
    const T = this.target;
    const dur = a.food === "water" ? 2.6 : 3.4;
    const k = a.t / dur;
    if (k < 1) {
      T.headDip = 1;
      T.mouth = a.food === "water" ? 0.3 : Math.max(0, Math.sin(a.t * 13)) * 0.6;
      T.tongue = a.food === "water" ? (Math.sin(a.t * 14) > 0 ? 0.7 : 0) : 0;
      T.cheeks = this.species === "hamster" ? Math.min(1, k * 1.5) : 0;
      T.tailWag = 0.8;
      T.lid = 0.3;
      if (a.food === "water") this.food.water = Math.max(0, 1 - k);
      else this.food.amount = Math.max(0, 1 - k);
      const period = a.food === "water" ? 0.45 : 0.36;
      if (Math.floor(a.t / period) !== Math.floor((a.t - dt) / period)) {
        this.sfx(a.food === "water" ? "slurp" : "crunch", 0.7);
        if (a.food !== "water") this.particles.emit("crumb", this.mouthWorld(this.tmp), 2, { spread: 0.05, up: 0.8, size: 0.025, color: crumbColor(a.food) });
      }
    } else if (a.t < dur + 0.6) {
      T.tongue = 0.8;
      T.happy = 0.8;
      T.cheeks = this.species === "hamster" ? 1 : 0;
      this.lookAt(this.camPos, 1);
      if (a.food === "water") this.food.water = 0;
      else {
        this.food.amount = 0;
        this.food.id = null;
      }
    } else {
      this.emit({ type: "ate", food: a.food, verdict: a.verdict });
      if (a.verdict === "love") {
        this.say("😋", "My favourite!", 2200);
        this.sound("excited");
        this.setAct({ kind: "celebrate", t: 0, big: true });
      } else {
        this.say("😊", a.food === "water" ? "Refreshing!" : "Yum, thank you!", 2000);
        this.sound("happy");
        this.idle(2.5, "sit");
      }
    }
  }

  private runRefuse(a: Extract<Act, { kind: "refuse" }>, dt: number) {
    const T = this.target;
    const t = a.t;
    if (t < 0.9) {
      T.headDip = 0.6 + Math.sin(t * 10) * 0.1;
      T.earPerk = 0.3;
    } else if (t < 2.4) {
      T.headDip = 0;
      T.lean = -0.8;
      T.headYaw = Math.sin(t * 13) * 0.5 * (t < 2.0 ? 1 : 0);
      T.tongue = t > 1.3 && t < 2.1 ? 1 : 0;
      T.sad = 0.5;
      T.lid = 0.4;
      if (t - dt < 0.9 && t >= 0.9) {
        this.sfx("nope");
        this.say("🙅", "Not my thing!", 2000);
      }
    } else {
      this.food.amount = 0;
      this.food.id = null;
      this.emit({ type: "refused", food: a.food });
      this.sound("sad");
      this.wander();
    }
  }

  private runReact(a: Extract<Act, { kind: "react" }>, dt: number) {
    const T = this.target;
    const t = a.t;
    const fam = this.spec.family;
    this.lookAt(this.camPos, 0.6);
    switch (a.part) {
      case "head":
        T.happy = 1;
        T.headTilt = a.side * 0.3;
        T.lean = 0.25;
        T.tailWag = 1;
        T.earPerk = -0.3;
        if (this.species === "turtle") T.retract = t < 0.3 ? 0.4 : 0;
        break;
      case "ear":
        T.headTilt = Math.sin(t * 20) * 0.2 * (t < 0.6 ? 1 : 0) + a.side * 0.15;
        T.happy = t > 0.5 ? 0.6 : 0;
        T.mouth = t > 0.4 && t < 1 ? 0.5 : 0;
        break;
      case "belly":
        if (fam === "quad" && this.species !== "turtle" && this.species !== "gecko" && !this.fish) {
          T.roll = t < a.dur - 0.4 ? 1 : 0;
          T.lie = t < a.dur - 0.3 ? 1 : 0;
        } else T.wiggle = t < a.dur - 0.3 ? 1 : 0;
        if (this.fish) T.roll = Math.sin(Math.min(1, t / 1.6) * Math.PI);
        T.happy = 1;
        T.mouth = Math.max(0, Math.sin(t * 16)) * 0.6;
        T.tailWag = 1;
        break;
      case "paw": {
        const up = t > 0.1 && t < 0.95 ? 1 : 0;
        if (a.side > 0) T.pawL = up;
        else T.pawR = up;
        T.sit = this.fish ? 0 : 1;
        T.happy = t > 0.4 ? 1 : 0;
        T.mouth = t > 0.4 ? 0.4 : 0;
        this.faceCam(dt);
        break;
      }
      case "tail":
        T.tailWag = 1;
        T.happy = 0.7;
        if (this.species === "dog" || this.species === "cat") {
          this.spin = Math.sin(Math.min(1, t / 1.4) * Math.PI) * (this.species === "dog" ? Math.PI * 2 * Math.min(1, t / 1.4) : 0.8);
          if (this.species === "dog") this.spin = Math.min(1, t / 1.4) * Math.PI * 2;
          T.walk = t < 1.4 ? 1 : 0;
          this.gaitSpeed = t < 1.4 ? 1.2 : 0;
          T.headYaw = 0.9;
        } else T.headYaw = Math.sin(t * 3) * 0.9;
        if (t > a.dur - 0.05) this.spin = 0;
        break;
      case "back":
        T.lid = 0.55;
        T.happy = 0.7;
        T.lie = this.spec.id === "cat" || this.spec.id === "dog" ? 0.25 : 0;
        T.tailWag = 0.6;
        if (this.species === "hedgehog") T.curl = t < 0.7 ? 1 : 0;
        if (this.species === "turtle") T.retract = t < 0.8 ? 1 : 0;
        break;
      case "nose":
        T.lid = t > 0.2 && t < 0.75 ? 0.8 : 0;
        T.headPitch = t < 0.6 ? -0.25 : t < 0.8 ? 0.35 : 0;
        T.mouth = t > 0.55 && t < 0.85 ? 0.8 : 0;
        if (t > 0.62 && t - dt <= 0.62) {
          this.sfx("pop");
          this.particles.emit("sparkle", this.mouthWorld(this.tmp), 6, { spread: 0.05, size: 0.05, speed: 1.2 });
          this.say("🤧", "Achoo!", 1300);
        }
        T.happy = t > 0.9 ? 1 : 0;
        break;
    }
    if (t > a.dur) {
      this.spin = 0;
      this.idle(range(1.5, 2.5), this.fish ? "you" : "you");
    }
  }

  private runSleep(a: Extract<Act, { kind: "sleep" }>, dt: number) {
    const T = this.target;
    if (!a.settled) {
      // Circle once, then curl up.
      T.walk = 1;
      this.gaitSpeed = 0.8;
      if (!this.fish) this.heading += dt * 4.2;
      T.lid = 0.4;
      if (a.t > 1.4) {
        a.settled = true;
        a.t = 0;
        this.asleep = true;
        this.emit({ type: "asleep" });
        this.sfx("yawn", 0.6);
        this.faceToward(this.camPos.x, this.camPos.z, 1);
      }
      return;
    }
    T.lie = 1;
    T.sleep = 1;
    T.lid = 1;
    T.tailWag = 0.05;
    T.earPerk = -0.6;
    if (this.fish) this.pos.y += (TANK.inner.minY + 0.1 - this.pos.y) * dt;
    this.zzzT += dt;
    if (this.zzzT > 1.3) {
      this.zzzT = 0;
      this.particles.emit("zzz", this.headWorld(this.tmp).add(new THREE.Vector3(0.15, 0.25, 0)), 1, { size: 0.26, up: 0.35, spread: 0.02, life: 2.4 });
      if (rand() < 0.3) this.sfx("snore", 0.5);
    }
    if (this.stats.energy >= 99 && a.t > 20) this.wake();
  }

  private runChase(a: Extract<Act, { kind: "chase" }>, dt: number) {
    const T = this.target;
    const b = this.ball;
    if (!b.active) {
      this.idle();
      return;
    }
    const spec = this.spec;
    if (this.fish) {
      const reached = this.swim(b.pos.x, b.pos.y - 0.25, b.pos.z, spec.speed * 1.6, dt);
      T.walk = 1;
      T.earPerk = 1;
      if (reached || this.pos.distanceTo(this.tmp.set(b.pos.x, b.pos.y - 0.25, b.pos.z)) < 0.2) {
        b.vel.set(range(-1.2, 1.2), 1.4, 0);
        this.sfx("splash", 0.5);
        this.particles.emit("drop", b.pos, 8, { spread: 0.1, up: 1.5, size: 0.04 });
        this.emit({ type: "fetch" });
        this.setAct({ kind: "idle", t: 0, dur: 1.2, sub: "you" });
        setTimeout(() => this.ball.active && this.setAct({ kind: "chase", t: 0 }), 1600);
      }
      return;
    }
    const speed = spec.speed * 1.75;
    const dx = b.pos.x - this.pos.x;
    const dz = b.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const flying = b.pos.y > b.r + 0.05 || b.vel.length() > 2.5;
    this.lookAt(b.pos, 1);
    T.earPerk = 1;
    T.tailWag = 1;
    T.run = 1;
    // Leap to catch a ball that's coming down close by.
    if (b.kind === "ball" && dist < 0.7 && b.pos.y > 0.45 && b.pos.y < 1.3 && b.vel.y < 0 && this.air <= 0 && spec.family !== "fish" && spec.gait !== "plod") {
      this.vy = 3.4;
    }
    if (dist > 0.32 || (flying && b.kind === "ball")) {
      // Aim a little ahead of a rolling toy.
      const lead = Math.min(0.5, dist / 4);
      this.steer(b.pos.x + b.vel.x * lead, b.pos.z + b.vel.z * lead, speed, dt, true);
      T.walk = 1;
      if (a.t > 14) {
        this.say("😅", "Where did it go?", 1600);
        b.pos.set(this.pos.x, 1, this.pos.z + 0.6);
        b.vel.set(0, 0, 0);
        a.t = 0;
      }
      return;
    }
    if (b.kind === "ball" && b.pos.y < 0.5) {
      b.held = true;
      this.sfx("bounce", 0.6);
      this.setAct({ kind: "carry", t: 0 });
    } else if (b.kind === "yarn") {
      this.setAct({ kind: "bat", t: 0, hit: false });
    }
  }

  private runCarry(a: Extract<Act, { kind: "carry" }>, dt: number) {
    const T = this.target;
    const [fx, fz] = this.layout.front;
    const done = this.steer(fx, fz, this.spec.speed * 1.4, dt, true);
    T.walk = done ? 0 : 1;
    T.tailWag = 1;
    T.earPerk = 0.7;
    T.mouth = 0.35;
    this.lookAt(this.camPos, 0.5);
    if (done || a.t > 10) {
      this.faceCam(dt);
      if (Math.abs(wrapAngle(Math.atan2(this.camPos.x - this.pos.x, this.camPos.z - this.pos.z) - this.heading)) < 0.2 || a.t > 11) {
        const b = this.ball;
        b.held = false;
        this.mouthWorld(b.pos);
        b.vel.set(Math.sin(this.heading) * 0.8, 0.5, Math.cos(this.heading) * 0.8);
        this.sound("happy");
        this.emit({ type: "fetch" });
        this.particles.emit("heart", this.headWorld(this.tmp).add(new THREE.Vector3(0, 0.3, 0)), 1, { size: 0.09 });
        this.setAct({ kind: "wait", t: 0 });
      }
    }
  }

  private runBat(a: Extract<Act, { kind: "bat" }>, dt: number) {
    const T = this.target;
    const b = this.ball;
    this.faceToward(b.pos.x, b.pos.z, dt);
    this.lookAt(b.pos, 1);
    T.crouch = a.t < 0.25 ? 1 : 0;
    T.earPerk = 1;
    T.tailWag = 1;
    const swing = a.t > 0.2 && a.t < 0.6;
    if (this.spec.family === "bird") T.headDip = swing ? 1 : 0.2;
    else T.pawL = swing ? 1 : 0;
    if (!a.hit && a.t > 0.32) {
      a.hit = true;
      b.bats++;
      const dir = this.tmp.set(b.pos.x - this.pos.x, 0, b.pos.z - this.pos.z).normalize();
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), range(-0.9, 0.9));
      b.vel.set(dir.x * range(2.2, 3.2), 1.2, dir.z * range(2.2, 3.2));
      this.sfx("bounce", 0.5);
      this.sound("happy");
      this.emit({ type: "yarn" });
    }
    if (a.t > 0.75) {
      if (b.bats >= 5) {
        b.bats = 0;
        this.say("🧶", "That was fun!", 1800);
        this.setAct({ kind: "react", t: 0, part: "belly", side: 1, dur: 2.2 });
      } else this.setAct({ kind: "chase", t: 0 });
    }
  }

  private runBath(a: Extract<Act, { kind: "bath" }>, dt: number) {
    const T = this.target;
    const b = this.bath;
    T.sit = this.fish ? 0 : 0.7;
    T.tailWag = 0.5;
    T.earPerk = b.shower ? -0.3 : 0.2;
    T.lid = b.shower ? 0.5 : 0;
    T.happy = b.shower ? 0.4 : T.happy;
    if (this.fish) {
      this.pos.y = 1.35 + Math.sin(this.time * 1.2) * 0.12;
      this.pos.x = Math.sin(this.time * 0.4) * 0.6;
      this.heading = Math.cos(this.time * 0.4) > 0 ? 1.4 : -1.4;
      T.walk = 0.6;
      return;
    }
    if (this.pointer.down && this.pointer.onPet) this.lookAt(this.camPos, 1);
    else this.lookAround(a.t);
    this.faceCam(dt);
  }

  private runPeck(a: Extract<Act, { kind: "peck" }>, dt: number) {
    // Fish feeding: chase each flake as it sinks.
    const T = this.target;
    const food = this.food.id;
    const verdict = food ? verdictFor(this.species, food) : "like";
    const next = this.pellets.find((p) => p.alive);
    if (!next || !food) {
      if (food) {
        if (verdict === "dislike") this.emit({ type: "refused", food });
        else {
          this.emit({ type: "ate", food, verdict });
          this.say(verdict === "love" ? "😋" : "😊", verdict === "love" ? "My favourite!" : "Yum!", 2000);
        }
      }
      this.food.id = null;
      this.pellets = [];
      this.setAct(verdict === "love" ? { kind: "celebrate", t: 0, big: true } : { kind: "idle", t: 0, dur: 2, sub: "you" });
      return;
    }
    const arrived = this.swim(next.pos.x, next.pos.y, next.pos.z, this.spec.speed * 1.5, dt);
    T.walk = 1;
    T.mouth = this.pos.distanceTo(next.pos) < 0.35 ? 0.7 : 0.2;
    if (arrived || this.pos.distanceTo(next.pos) < 0.12) {
      if (verdict === "dislike") {
        this.pellets.forEach((p) => (p.alive = false));
        this.say("🙅", "Not my thing!", 1800);
        this.sfx("nope");
        return;
      }
      next.alive = false;
      this.sfx("pop");
      this.particles.emit("bubble", next.pos, 3, { spread: 0.03, up: 0.3, size: 0.03 });
    }
    if (a.t > 15) this.pellets.forEach((p) => (p.alive = false));
  }

  // ----------------------------------------------------------------------- locomotion

  private turnTo(want: number, dt: number, rate: number) {
    const diff = wrapAngle(want - this.heading);
    const step = Math.sign(diff) * Math.min(Math.abs(diff), rate * dt);
    this.heading = wrapAngle(this.heading + step);
  }

  /** Walk towards a point, avoiding furniture. Returns true when it has arrived. */
  private steer(tx: number, tz: number, speed: number, dt: number, run: boolean): boolean {
    const dx = tx - this.pos.x;
    const dz = tz - this.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.1) return true;
    let vx = dx / dist;
    let vz = dz / dist;
    const obstacles = this.obstacles();
    for (const o of obstacles) {
      const ox = this.pos.x - o.x;
      const oz = this.pos.z - o.z;
      const d = Math.hypot(ox, oz);
      const reach = o.r + 0.55;
      if (d < reach && d > 0.001) {
        const push = (1 - d / reach) * 1.6;
        vx += (ox / d) * push;
        vz += (oz / d) * push;
        // Slide around rather than straight into it
        vx += (-oz / d) * push * 0.6 * Math.sign(dx * -oz + dz * ox || 1);
        vz += (ox / d) * push * 0.6 * Math.sign(dx * -oz + dz * ox || 1);
      }
    }
    const want = Math.atan2(vx, vz);
    this.turnTo(want, dt, run ? 8 : 5.5);
    const facing = Math.cos(wrapAngle(want - this.heading));
    let sp = speed * Math.max(0.15, facing) * Math.min(1, dist / 0.35 + 0.35);
    this.gaitSpeed = sp;
    // Parrots fly for longer trips
    if (this.spec.gait === "flutter") {
      if (dist > 2.2) this.altTarget = 1.1;
      if (dist < 0.9) this.altTarget = 0;
      if (this.alt > 0.2) {
        sp = speed * 1.6;
        this.target.wing = 1;
      }
    }
    if (this.spec.gait === "hop") sp *= this.air + Math.max(0, Math.sin(this.anim.phase)) > 0.02 ? 1.5 : 0.25;
    this.pos.x += Math.sin(this.heading) * sp * dt;
    this.pos.z += Math.cos(this.heading) * sp * dt;
    this.moveSpeed = sp;
    // Resolve collisions and keep inside the room.
    for (const o of obstacles) {
      const ox = this.pos.x - o.x;
      const oz = this.pos.z - o.z;
      const d = Math.hypot(ox, oz);
      const min = o.r + 0.25;
      if (d < min && d > 0.0001) {
        this.pos.x = o.x + (ox / d) * min;
        this.pos.z = o.z + (oz / d) * min;
      }
    }
    const b = this.layout.bounds;
    this.pos.x = clamp(this.pos.x, b.minX, b.maxX);
    this.pos.z = clamp(this.pos.z, b.minZ, b.maxZ);
    return dist < 0.14;
  }

  private obstacles() {
    const list = this.layout.obstacles.slice();
    if (this.hide.active && this.hide.phase !== "count") for (const [x, z] of this.layout.hide) list.push({ x, z, r: 0.45 });
    if (this.bath.active || this.ground > 0) return [];
    return list;
  }

  /** Swim towards a point inside the tank. */
  private swim(tx: number, ty: number, tz: number, speed: number, dt: number) {
    const I = TANK.inner;
    tx = clamp(tx, I.minX + 0.15, I.maxX - 0.15);
    ty = clamp(ty, I.minY, I.maxY);
    tz = clamp(tz, I.minZ + 0.1, I.maxZ - 0.05);
    const d = this.tmp.set(tx - this.pos.x, ty - this.pos.y, tz - this.pos.z);
    const dist = d.length();
    if (dist < 0.06) return true;
    const want = Math.atan2(d.x, d.z);
    this.turnTo(want, dt, 3.5);
    const facing = Math.max(0.2, Math.cos(wrapAngle(want - this.heading)));
    const sp = speed * facing * Math.min(1, dist / 0.3 + 0.3);
    this.pos.addScaledVector(d.normalize(), sp * dt);
    this.gaitSpeed = sp;
    this.moveSpeed = sp;
    this.target.lean = clamp(-d.y * 1.5, -0.6, 0.6);
    return dist < 0.1;
  }

  lookAt(p: THREE.Vector3, weight: number) {
    const T = this.target;
    const head = this.headWorld(this.tmp2);
    const dx = p.x - head.x;
    const dy = p.y - head.y;
    const dz = p.z - head.z;
    const ang = wrapAngle(Math.atan2(dx, dz) - this.heading - this.spin);
    const yaw = clamp(ang, -1.1, 1.1);
    const pitch = clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -0.6, 0.5);
    T.headYaw = yaw * 0.7 * weight;
    T.headPitch = pitch * 0.55 * weight;
    T.lookX = clamp((ang - T.headYaw) * 0.8, -1, 1) * weight;
    T.lookY = clamp(-pitch * 0.6, -1, 1) * weight;
  }

  /** Writes the sinking fish flakes into an instanced mesh. Returns how many are visible. */
  writePellets(mesh: THREE.InstancedMesh, m4: THREE.Matrix4) {
    let n = 0;
    for (const p of this.pellets) {
      if (!p.alive) continue;
      m4.makeScale(0.035, 0.012, 0.035).setPosition(p.pos);
      mesh.setMatrixAt(n++, m4);
    }
    return n;
  }

  // ----------------------------------------------------------------------- toys, bath, hide

  private updateToys(dt: number) {
    for (const p of this.pellets) {
      if (!p.alive) continue;
      if (p.pos.y > TANK.inner.minY) p.pos.y -= dt * 0.12;
      p.pos.x += Math.sin(p.pos.y * 9) * dt * 0.05;
    }
    const b = this.ball;
    if (!b.active) return;
    if (b.held) {
      this.mouthWorld(b.pos);
      b.vel.set(0, 0, 0);
      return;
    }
    if (this.fish) {
      // Floats on the water surface.
      const surf = TANK.waterTop - 0.05;
      b.vel.y += (b.pos.y > surf ? -9.8 : (surf - b.pos.y) * 30) * dt;
      b.vel.multiplyScalar(Math.exp(-(b.pos.y < surf + 0.02 ? 2.5 : 0.2) * dt));
      b.pos.addScaledVector(b.vel, dt);
      const I = TANK.inner;
      if (b.pos.x < I.minX + 0.12 || b.pos.x > I.maxX - 0.12) {
        b.vel.x *= -0.6;
        b.pos.x = clamp(b.pos.x, I.minX + 0.12, I.maxX - 0.12);
      }
      b.pos.z = -0.7;
      return;
    }
    b.vel.y -= 9.8 * dt;
    b.pos.addScaledVector(b.vel, dt);
    const r = b.r;
    if (b.pos.y < r) {
      b.pos.y = r;
      if (Math.abs(b.vel.y) > 0.8) this.sfx("bounce", Math.min(1, Math.abs(b.vel.y) / 5));
      b.vel.y = -b.vel.y * (b.kind === "yarn" ? 0.25 : 0.55);
      if (Math.abs(b.vel.y) < 0.4) b.vel.y = 0;
      const fr = Math.exp(-(b.kind === "yarn" ? 2.2 : 1.1) * dt * 8);
      b.vel.x *= fr;
      b.vel.z *= fr;
    }
    if (b.pos.y <= r + 0.001) {
      const fr = Math.exp(-(b.kind === "yarn" ? 2.4 : 1.0) * dt);
      b.vel.x *= fr;
      b.vel.z *= fr;
    }
    const bd = this.layout.bounds;
    const pad = 0.5;
    if (b.pos.x < bd.minX - pad || b.pos.x > bd.maxX + pad) {
      b.vel.x *= -0.6;
      b.pos.x = clamp(b.pos.x, bd.minX - pad, bd.maxX + pad);
    }
    if (b.pos.z < bd.minZ - pad || b.pos.z > bd.maxZ + 0.2) {
      b.vel.z *= -0.6;
      b.pos.z = clamp(b.pos.z, bd.minZ - pad, bd.maxZ + 0.2);
    }
    for (const o of this.layout.obstacles) {
      const ox = b.pos.x - o.x;
      const oz = b.pos.z - o.z;
      const d = Math.hypot(ox, oz);
      if (d < o.r + r && b.pos.y < 1 && d > 0.001) {
        const nx = ox / d;
        const nz = oz / d;
        b.pos.x = o.x + nx * (o.r + r);
        b.pos.z = o.z + nz * (o.r + r);
        const dot = b.vel.x * nx + b.vel.z * nz;
        if (dot < 0) {
          b.vel.x -= 1.6 * dot * nx;
          b.vel.z -= 1.6 * dot * nz;
        }
      }
    }
    // Rolling spin
    const sp = Math.hypot(b.vel.x, b.vel.z);
    if (sp > 0.01) {
      const axis = this.tmp.set(b.vel.z, 0, -b.vel.x).normalize();
      const q = new THREE.Quaternion().setFromAxisAngle(axis, (sp / r) * dt);
      b.spin.premultiply(q);
    }
  }

  private updateBath(dt: number) {
    const b = this.bath;
    const tub = this.layout.tub;
    b.water += ((b.active ? 1 : 0) - b.water) * (1 - Math.exp(-1.2 * dt));
    if (!b.active) {
      b.fluff = Math.max(0, b.fluff - dt * 0.004);
      b.wet = Math.max(0, b.wet - dt * 0.05);
      return;
    }
    if (b.shower) {
      const head = this.fish ? this.tmp.set(range(-1, 1), TANK.waterTop + 0.3, -0.7) : this.tmp.set(...(this.layout.shower ?? [0, 2.6, -2.6]));
      if (this.fish) {
        if (rand() < 0.8) this.particles.emit("bubble", this.tmp.set(range(-1.1, 1.1), TANK.inner.minY, range(-1.1, -0.3)), 1, { spread: 0.02, up: 0.6, size: 0.04 });
        b.rinseT += dt;
        if (b.rinseT > 3 && b.maxSoap > 0.5) b.rinsed = true;
      } else {
        const dir = this.tmp2.set((tub?.x ?? 0) - head.x, -2.2, (tub?.z ?? 0) + 0.2 - head.z).normalize();
        this.particles.emit("drop", head, 3, { spread: 0.12, speed: 3.2, dir, size: 0.035, life: 0.9 });
        b.wet = Math.min(1, b.wet + dt * 0.6);
        const before = b.soap.reduce((a, s) => a + s, 0);
        b.soap = b.soap.map((s) => Math.max(0, s - dt * 0.28));
        if (before > 0.01 && rand() < 0.3) this.particles.emit("bubble", this.petCenter(this.tmp), 1, { spread: 0.3, up: 0.6, size: 0.05 });
        if (b.maxSoap > 0.45 && b.soap.every((s) => s < 0.05)) b.rinsed = true;
        b.fluff = Math.max(0, b.fluff - dt * 0.5);
      }
    }
    if (b.tool === "dryer" && this.pointer.down && this.pointer.onPet && !this.fish) {
      b.wet = Math.max(0, b.wet - dt * 0.35);
      if (rand() < 0.6) this.particles.emit("air", b.toolPos, 1, { spread: 0.05, speed: 0.6, size: 0.04, life: 0.5 });
      this.target.earPerk = -0.8;
      this.target.lid = 0.5;
      this.target.happy = 0.5;
      if (b.rinsed && b.wet < 0.15) b.dried = true;
    }
    if (!this.fish && b.wet > 0.4 && !b.shower && rand() < dt * 2) {
      this.particles.emit("drop", this.petCenter(this.tmp), 1, { spread: 0.2, up: -0.2, size: 0.03 });
    }
    if (b.rinsed && !b.dried && b.wet < 0.15) b.dried = true;
  }

  private updateHide(dt: number) {
    const h = this.hide;
    if (!h.active) return;
    h.t += dt;
    for (let i = 0; i < 3; i++) {
      h.wiggle[i] = Math.max(0, h.wiggle[i] - dt * 1.5);
      if (h.phase !== "found" || i !== h.spot) h.lift[i] = Math.max(0, h.lift[i] - dt * 1.2);
    }
    if (h.phase === "count" && h.t > 3.2 && this.act.kind === "hiding") {
      h.phase = "seek";
      h.t = 0;
      this.emit({ type: "hidden" });
    }
    if (h.phase === "count" && h.t > 7) {
      // Safety: never get stuck counting.
      h.phase = "seek";
      h.t = 0;
      this.setAct({ kind: "hiding", t: 0 });
      this.emit({ type: "hidden" });
    }
    if (h.phase === "seek" && h.t > 7 && Math.floor(h.t) % 5 === 0 && h.t % 1 < dt) {
      h.wiggle[h.spot] = 0.6;
      this.sound("giggle");
    }
    if (h.phase === "found" && h.t > 3) {
      h.active = false;
      h.phase = "off";
      this.playMode = null;
    }
  }

  // ----------------------------------------------------------------------- camera

  /** Where the camera wants to look and how much it needs to see. */
  camGoal(out: { target: THREE.Vector3; width: number; height: number }, aspect: number) {
    const narrow = aspect < 1.1;
    const petX = this.fish ? this.pos.x * 0.3 : this.pos.x;
    const h = this.rig?.dims.height ?? 1;
    switch (this.camMode) {
      case "pet":
      case "face": {
        const face = this.camMode === "face";
        const c = this.fish ? this.pos : this.tmp.set(this.pos.x, this.ground + this.air * 0.3 + h * (face ? 0.58 : 0.5), this.pos.z);
        out.target.set(c.x, c.y + 0.05, c.z);
        out.width = face ? 2.5 : 3.0;
        out.height = face ? 2.0 : 2.4;
        if (this.fish) {
          out.width = 2.4;
          out.height = 1.8;
        }
        break;
      }
      case "bath": {
        if (this.fish) {
          out.target.set(0, 1.35, -0.7);
          out.width = 3.4;
          out.height = 2.4;
        } else {
          const t = this.layout.tub;
          out.target.set(t?.x ?? 0, 0.95, (t?.z ?? 0) + 0.3);
          out.width = 3.3;
          out.height = 2.5;
        }
        break;
      }
      case "bowl": {
        if (this.fish) {
          out.target.set(0, 1.4, -0.7);
          out.width = 3.4;
          out.height = 2.4;
        } else {
          const bw = this.layout.bowl ?? [0, 0];
          out.target.set(bw[0] + 0.6, 1.0, bw[1] - 0.3);
          out.width = narrow ? 3.6 : 6.2;
          out.height = 3.6;
        }
        break;
      }
      case "bed": {
        const bd = this.layout.bed;
        out.target.set(bd?.x ?? this.pos.x, 0.6, (bd?.z ?? this.pos.z) + 0.3);
        out.width = 3.6;
        out.height = 2.6;
        break;
      }
      case "adopt":
        out.target.set(this.pos.x, this.fish ? this.pos.y : h * 0.5, this.pos.z);
        out.width = narrow ? 2.5 : 3.4;
        out.height = narrow ? 3.0 : 2.5;
        if (this.fish) {
          out.width = narrow ? 2.4 : 3.0;
          out.height = 2.2;
        }
        break;
      default: {
        if (this.fish) {
          // The tank is the goldfish's home, so frame it nicely.
          out.target.set(0, 1.3, -0.6);
          out.width = narrow ? 3.2 : 4.4;
          out.height = 2.6;
        } else {
          const follow = narrow ? 0.9 : 0.3;
          out.target.set(clamp(petX * follow, -2.6, 2.6), 1.0, clamp(this.pos.z * 0.2, -0.3, 0.4));
          out.width = narrow ? Math.max(3.0, aspect * 4.6) : 7.6;
          out.height = 4.2;
        }
      }
    }
  }

  dispose() {
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
    audio.loop("shower", false);
    audio.loop("dryer", false);
    this.particles.dispose();
  }
}

function crumbColor(food: FoodId) {
  switch (food) {
    case "carrot":
      return "#f39a3d";
    case "lettuce":
    case "peas":
      return "#7cc56a";
    case "strawberry":
      return "#ef5a6a";
    case "cupcake":
      return "#f7c6d9";
    case "fish":
      return "#f2b8a0";
    case "chicken":
      return "#e3b07a";
    case "seeds":
      return "#d9c08a";
    case "bugs":
      return "#9a6a4a";
    default:
      return "#c99a6b";
  }
}
