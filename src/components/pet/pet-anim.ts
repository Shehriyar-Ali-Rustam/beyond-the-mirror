import * as THREE from "three";
import type { Rig } from "./pet-build";
import type { SpeciesSpec } from "./species";

/** Everything the animator understands. The brain sets targets; the animator smooths and applies them. */
export type Pose = {
  walk: number;
  run: number;
  sit: number;
  lie: number;
  sleep: number;
  roll: number;
  crouch: number;
  beg: number;
  curl: number;
  lid: number;
  happy: number;
  sad: number;
  mouth: number;
  tongue: number;
  cheeks: number;
  earPerk: number;
  tailWag: number;
  headYaw: number;
  headPitch: number;
  headTilt: number;
  headDip: number;
  lookX: number;
  lookY: number;
  pawL: number;
  pawR: number;
  wing: number;
  shake: number;
  dance: number;
  wiggle: number;
  retract: number;
  lean: number;
  stretch: number;
};

export const POSE_DEFAULT: Pose = {
  walk: 0,
  run: 0,
  sit: 0,
  lie: 0,
  sleep: 0,
  roll: 0,
  crouch: 0,
  beg: 0,
  curl: 0,
  lid: 0,
  happy: 0,
  sad: 0,
  mouth: 0,
  tongue: 0,
  cheeks: 0,
  earPerk: 0,
  tailWag: 0.25,
  headYaw: 0,
  headPitch: 0,
  headTilt: 0,
  headDip: 0,
  lookX: 0,
  lookY: 0,
  pawL: 0,
  pawR: 0,
  wing: 0,
  shake: 0,
  dance: 0,
  wiggle: 0,
  retract: 0,
  lean: 0,
  stretch: 0,
};

/** How quickly each channel follows its target (per second). */
const RATE: Partial<Record<keyof Pose, number>> = {
  walk: 7,
  run: 5,
  sit: 4.5,
  lie: 3.2,
  sleep: 2,
  roll: 3.5,
  crouch: 6,
  beg: 4,
  curl: 5,
  lid: 14,
  happy: 9,
  sad: 4,
  mouth: 22,
  tongue: 10,
  cheeks: 4,
  earPerk: 8,
  tailWag: 4,
  headYaw: 6,
  headPitch: 6,
  headTilt: 5,
  headDip: 6,
  lookX: 10,
  lookY: 10,
  pawL: 9,
  pawR: 9,
  wing: 8,
  shake: 10,
  dance: 4,
  wiggle: 8,
  retract: 6,
  lean: 5,
  stretch: 4,
};

export function dampPose(cur: Pose, target: Pose, dt: number) {
  for (const k of Object.keys(target) as (keyof Pose)[]) {
    const r = RATE[k] ?? 6;
    cur[k] += (target[k] - cur[k]) * (1 - Math.exp(-r * dt));
  }
}

export type AnimState = {
  t: number;
  phase: number;
  blinkIn: number;
  blink: number;
  tailPhase: number;
  twitch: [number, number];
  squash: number;
  squashV: number;
  wet: number;
  fluff: number;
  bases: Map<THREE.Object3D, { p: THREE.Vector3; r: THREE.Euler; s: THREE.Vector3 }>;
  wasAir: boolean;
};

export function newAnim(): AnimState {
  return { t: 0, phase: 0, blinkIn: 2, blink: 0, tailPhase: 0, twitch: [0, 0], squash: 0, squashV: 0, wet: 0, fluff: 0, bases: new Map(), wasAir: false };
}

function base(a: AnimState, o: THREE.Object3D) {
  let b = a.bases.get(o);
  if (!b) {
    b = { p: o.position.clone(), r: o.rotation.clone(), s: o.scale.clone() };
    a.bases.set(o, b);
  }
  return b;
}

/** Pokes the body with a little squash (on landing, when touched). */
export function squash(a: AnimState, amount: number) {
  a.squashV += amount * 9;
}

export function twitchEar(a: AnimState, side: 0 | 1) {
  a.twitch[side] = 1;
}

type Frame = {
  dt: number;
  /** Actual ground speed (m/s), drives gait phase. */
  speed: number;
  /** Height above the ground from jumps or hops (set by the brain). */
  air: number;
  /** Speaking level 0..1 from audio, added to the mouth. */
  voice: number;
  reduced: boolean;
  soap: number[];
};

const tmpColor = new THREE.Color();
const SIT_ANGLE: Record<string, number> = { dog: 0.55, cat: 0.6, rabbit: 0.3, hamster: 0.3, guineapig: 0.12, hedgehog: 0.2, turtle: 0, gecko: 0.35 };

export function animateRig(rig: Rig, spec: SpeciesSpec, p: Pose, a: AnimState, f: Frame) {
  const dt = f.dt;
  a.t += dt;
  const t = a.t;
  const fam = spec.family;

  // Gait phase follows ground speed so feet don't slide.
  const stride = spec.gait === "hop" ? 0.55 : spec.gait === "scurry" ? 0.22 : spec.gait === "plod" ? 0.32 : spec.gait === "waddle" ? 0.24 : spec.gait === "swim" ? 0.5 : 0.42;
  a.phase += (f.speed / stride) * Math.PI * dt + (fam === "fish" ? dt * 2.2 : 0);
  const ph = a.phase;
  const walk = p.walk;

  // Squash spring
  a.squashV += (-a.squash * 120 - a.squashV * 11) * dt;
  a.squash += a.squashV * dt;
  if (f.air <= 0.001 && a.wasAir) squash(a, 0.12);
  a.wasAir = f.air > 0.02;

  // ---------------------------------------------------------------- body
  const bb = base(a, rig.body);
  const tb = base(a, rig.torso);
  const asleep = p.sleep;
  const breathRate = asleep > 0.5 ? 1.5 : 2.4 + walk * 2;
  const breath = Math.sin(t * breathRate) * (f.reduced ? 0.5 : 1);
  const sq = THREE.MathUtils.clamp(a.squash, -0.25, 0.3);
  const fl = 1 + a.fluff * 0.035 - a.wet * 0.03;
  rig.torso.scale.set(tb.s.x * fl * (1 + breath * 0.012 + sq * 0.5), tb.s.y * fl * (1 + breath * 0.02 - sq), tb.s.z * fl * (1 + breath * 0.012 + sq * 0.4));

  let bodyY = bb.p.y;
  let bodyPitch = bb.r.x;
  let bodyRoll = 0;
  let bodyYaw = 0;
  let torsoY = tb.p.y;

  const dance = p.dance;
  const shake = p.shake;
  if (fam === "quad") {
    const sitA = SIT_ANGLE[spec.id] ?? 0.3;
    bodyPitch += -p.sit * sitA - p.beg * 1.05 + p.crouch * 0.32 + p.lean * 0.25 - p.stretch * 0.0;
    bodyY += -p.sit * rig.dims.legLen * 0.35 - p.lie * rig.dims.legLen * 0.85 + p.beg * 0.06 - p.curl * 0.06;
    bodyRoll += p.roll * 2.55;
    bodyY += p.roll * 0.04;
    if (spec.gait === "trot" || spec.gait === "prowl") torsoY += Math.abs(Math.sin(ph)) * 0.025 * walk;
    if (spec.gait === "scurry") torsoY += Math.abs(Math.sin(ph * 1.0)) * 0.018 * walk;
    if (spec.gait === "plod") {
      bodyRoll += Math.sin(ph) * 0.05 * walk;
      torsoY += Math.abs(Math.sin(ph)) * 0.012 * walk;
    }
    if (spec.gait === "scuttle") bodyYaw += Math.sin(ph) * 0.22 * walk;
    if (spec.gait === "hop") bodyPitch += -Math.cos(ph) * 0.22 * walk * (f.air > 0.01 ? 1 : 0.3);
    bodyRoll += Math.sin(ph) * 0.03 * walk;
  } else if (fam === "bird") {
    if (spec.gait === "waddle") {
      bodyRoll += Math.sin(ph) * 0.2 * walk;
      bodyYaw += Math.sin(ph) * 0.08 * walk;
      torsoY += Math.abs(Math.sin(ph)) * 0.03 * walk;
    } else {
      torsoY += Math.max(0, Math.sin(ph * 2)) * 0.06 * walk;
    }
    bodyY += -p.sit * 0.1 - p.lie * 0.12;
    bodyPitch += p.lean * 0.3 + p.crouch * 0.25;
  } else {
    // Fish: gentle undulation
    bodyYaw += Math.sin(ph * 1.6) * (0.06 + walk * 0.08);
    bodyPitch += Math.sin(t * 0.9) * 0.04 + p.lean * 0.3;
    bodyRoll += p.roll * 2.8;
  }
  // Dancing, shaking, wiggling
  if (dance > 0.01) {
    torsoY += Math.abs(Math.sin(t * 6.4)) * 0.07 * dance;
    bodyRoll += Math.sin(t * 3.2) * 0.16 * dance;
    bodyYaw += Math.sin(t * 3.2 + 1) * 0.2 * dance;
  }
  if (shake > 0.01) {
    bodyRoll += Math.sin(t * 40) * 0.32 * shake;
    bodyYaw += Math.sin(t * 40 + 0.8) * 0.12 * shake;
  }
  if (p.wiggle > 0.01) {
    bodyRoll += Math.sin(t * 14) * 0.12 * p.wiggle;
    bodyYaw += Math.sin(t * 9) * 0.08 * p.wiggle;
  }
  if (asleep > 0.01 && fam !== "fish") bodyRoll += asleep * (fam === "quad" ? 0.12 : 0);
  rig.body.position.y = bodyY;
  rig.body.rotation.set(bodyPitch, bodyYaw, bodyRoll);
  rig.torso.position.y = torsoY;

  // ---------------------------------------------------------------- head
  const hb = base(a, rig.head);
  const dip = p.headDip;
  let hPitch = p.headPitch + dip * 0.55 + p.sit * ((spec.id === "dog" || spec.id === "cat") ? 0.38 : 0.15) + p.beg * 0.7 - p.crouch * 0.25;
  let hYaw = p.headYaw;
  let hTilt = p.headTilt;
  hPitch += asleep * (fam === "bird" ? 0.55 : 0.32) + p.lie * 0.12;
  if (fam === "bird" && asleep > 0.01) hYaw += asleep * 0.4;
  if (dance > 0.01) hTilt += Math.sin(t * 3.2 + 0.5) * 0.25 * dance;
  if (shake > 0.01) hTilt += Math.sin(t * 40 + 0.6) * 0.45 * shake;
  if (spec.gait === "plod" || spec.gait === "waddle") hPitch += Math.sin(ph * 2) * 0.05 * walk;
  if (fam === "quad" && spec.gait === "trot") hPitch += Math.sin(ph * 2) * 0.03 * walk;
  // Keep the face level-ish when the body pitches.
  hPitch -= (bodyPitch - bb.r.x) * 0.55;
  rig.head.rotation.set(hb.r.x + hPitch, hb.r.y + hYaw, hb.r.z + hTilt);
  rig.head.position.y = hb.p.y - p.lie * 0.04 - asleep * 0.05 - p.curl * 0.08 + Math.sin(t * breathRate) * 0.004;
  rig.head.position.z = hb.p.z - p.curl * 0.12 + dip * 0.04;

  if (rig.neck) {
    const nb = base(a, rig.neck);
    rig.neck.position.z = nb.p.z - p.retract * 0.24 + dip * 0.05;
    rig.neck.position.y = nb.p.y - p.retract * 0.05 - dip * 0.05;
  }

  // ---------------------------------------------------------------- eyes
  a.blinkIn -= dt;
  if (a.blinkIn <= 0) {
    a.blink = 1;
    a.blinkIn = 1.8 + ((((Math.sin(t * 12.9898) * 43758.5453) % 1) + 1) % 1) * 3.4;
  }
  a.blink = Math.max(0, a.blink - dt * 7);
  const blinkLid = a.blink > 0 ? Math.sin(a.blink * Math.PI) : 0;
  const lid = Math.min(1, Math.max(p.lid, blinkLid, asleep));
  const happy = Math.min(1, p.happy) * (1 - asleep);
  for (let i = 0; i < rig.eyes.length; i++) {
    const e = rig.eyes[i];
    const s = i === 0 ? 1 : -1;
    // Upper lid: -1.3 open, ~1.45 closed. Lower lid: 1.25 open, rises when happy.
    const up = THREE.MathUtils.lerp(-1.3, 1.5, Math.max(lid, happy * 0.88));
    const low = THREE.MathUtils.lerp(1.25, -0.15, Math.max(lid * 0.85, happy));
    e.upper.rotation.set(up, 0, s * p.sad * 0.35);
    e.lower.rotation.x = low;
    const closed = Math.max(lid, happy);
    e.lash.visible = closed > 0.82;
    e.lash.rotation.z = happy > lid ? 0 : Math.PI;
    e.lash.position.y = (happy > lid ? 0.02 : -0.05) * e.upper.scale.x;
    for (const sh of e.shine) sh.visible = closed < 0.55;
    e.ball.rotation.set(-p.lookY * 0.32, p.lookX * 0.38, 0);
  }

  // ---------------------------------------------------------------- mouth
  const open = THREE.MathUtils.clamp(Math.max(p.mouth, f.voice), 0, 1);
  const cav = rig.mouth.cavity;
  const cb = base(a, cav);
  if (rig.mouth.jaw) {
    const jb = base(a, rig.mouth.jaw);
    rig.mouth.jaw.rotation.x = jb.r.x + open * 0.55;
  } else {
    cav.scale.set(cb.s.x * (1 + open * 0.15), cb.s.x * (0.08 + open * 0.75), cb.s.z);
  }
  const tg = rig.mouth.tongue;
  const tgb = base(a, tg);
  tg.position.z = tgb.p.z + p.tongue * 0.55;
  tg.position.y = tgb.p.y + p.tongue * -0.25;
  tg.scale.set(tgb.s.x, tgb.s.y * (1 + p.tongue * 2.5), tgb.s.z * (1 + p.tongue * 0.6));
  if (spec.id === "goldfish" && rig.mouth.line) {
    const lb = base(a, rig.mouth.line);
    const gulp = 0.5 + 0.5 * Math.sin(t * 2.4);
    const k = 1 + Math.max(open, gulp * 0.35) * 0.6;
    rig.mouth.line.scale.set(lb.s.x * k, lb.s.y * k, lb.s.z);
  }
  for (const c of rig.cheeks) {
    const cbs = base(a, c);
    const k = 1 + p.cheeks * 0.5 + open * 0.05;
    c.scale.set(cbs.s.x * k, cbs.s.y * (1 + p.cheeks * 0.3), cbs.s.z * k);
  }

  // ---------------------------------------------------------------- ears
  a.twitch[0] = Math.max(0, a.twitch[0] - dt * 2.5);
  a.twitch[1] = Math.max(0, a.twitch[1] - dt * 2.5);
  rig.ears.forEach((ear, i) => {
    const b: [number, number, number] = ear.userData.base ?? [0, 0, 0];
    const s = Math.sign(ear.position.x) || 1;
    const tw = a.twitch[i] * Math.sin(t * 46) * 0.45;
    const perk = p.earPerk;
    if (spec.id === "dog") {
      ear.rotation.set(b[0] - perk * 0.15, 0, b[2] + s * (perk * 0.35 + Math.sin(ph * 2) * 0.12 * walk) + s * tw + Math.sin(t * 40 + i) * 0.5 * shake);
    } else {
      const droop = Math.max(0, -perk);
      const hopBack = spec.gait === "hop" ? Math.min(1, f.air * 4) * 0.5 : 0;
      ear.rotation.set(b[0] - Math.max(0, perk) * 0.18 + droop * 0.9 + hopBack + asleep * (spec.id === "rabbit" ? 1.1 : 0.3), 0, b[2] + s * (droop * 0.35) + tw + Math.sin(t * 40 + i) * 0.4 * shake);
    }
  });

  // ---------------------------------------------------------------- tail
  const wagSpeed = 5 + p.tailWag * 13;
  a.tailPhase += wagSpeed * dt;
  rig.tail.forEach((seg, i) => {
    const b: [number, number, number] = seg.userData.base ?? [0, 0, 0];
    if (spec.id === "goldfish") {
      seg.rotation.set(0, Math.sin(ph * 1.6 - 0.8) * (0.35 + walk * 0.25), 0);
      return;
    }
    const amp = (spec.id === "cat" ? 0.12 + p.tailWag * 0.25 : 0.1 + p.tailWag * 0.55) * (i === 0 ? 1 : 0.7);
    const wag = Math.sin(a.tailPhase - i * 0.7) * amp;
    const up = spec.id === "cat" ? -0.25 * (1 - asleep) : 0;
    seg.rotation.set(b[0] + (i === 0 ? up - p.tailWag * 0.12 : 0) + (spec.gait === "scuttle" ? 0 : 0), b[1], b[2] + wag + (spec.gait === "scuttle" ? -Math.sin(ph - i * 0.6) * 0.25 * walk : 0));
  });

  // ---------------------------------------------------------------- legs
  if (fam === "quad") animateQuadLegs(rig, spec, p, a, f, ph);
  else if (fam === "bird") animateBirdLegs(rig, spec, p, a, ph);

  // ---------------------------------------------------------------- wings and fins
  for (const w of rig.wings) {
    const s = w.userData.side as number;
    const wb = base(a, w);
    const flap = p.wing > 0.01 ? Math.sin(t * 22) * 0.9 * p.wing + 0.5 * p.wing : 0;
    const raise = (s > 0 ? p.pawL : p.pawR) * 1.5;
    w.rotation.set(wb.r.x, wb.r.y, s * (flap + raise + dance * Math.max(0, Math.sin(t * 6.4)) * 0.6 + shake * Math.sin(t * 40) * 0.5));
  }
  for (const fin of rig.fins) {
    const s = fin.userData.side as number | undefined;
    const fb = base(a, fin);
    if (s) fin.rotation.set(fb.r.x, fb.r.y + Math.sin(t * 7 + s) * 0.35, fb.r.z + s * (Math.sin(t * 5) * 0.2 + (s > 0 ? p.pawL : p.pawR) * 1.1));
    else fin.rotation.set(fb.r.x, fb.r.y + Math.sin(ph * 1.6) * 0.12, fb.r.z);
  }

  // ---------------------------------------------------------------- spikes (hedgehog)
  if (rig.spikes) {
    const k = 1 + p.curl * 0.12 + Math.sin(t * 2) * 0.01;
    rig.spikes.scale.set(k, k, k);
  }

  // ---------------------------------------------------------------- wet / fluffy fur
  for (let i = 0; i < rig.furMats.length; i++) {
    const m = rig.furMats[i];
    tmpColor.copy(rig.furBase[i]).multiplyScalar(1 - a.wet * 0.22);
    m.color.copy(tmpColor);
    m.sheen = Math.min(1, (m.userData.sheen0 ??= m.sheen) * (1 - a.wet * 0.6) + a.fluff * 0.4);
    m.clearcoat = Math.max(m.userData.cc0 ??= m.clearcoat, a.wet * 0.7);
  }
  // Foam blobs
  for (let i = 0; i < rig.foam.length; i++) {
    const level = f.soap[i] ?? 0;
    const blob = rig.foam[i];
    blob.visible = level > 0.02;
    if (blob.visible) blob.scale.setScalar(0.3 + level * 0.9 + Math.sin(t * 3 + i) * 0.03);
  }
}

function animateQuadLegs(rig: Rig, spec: SpeciesSpec, p: Pose, a: AnimState, f: Frame, ph: number) {
  const walk = p.walk;
  const gait = spec.gait;
  const offsets = gait === "trot" ? [0, Math.PI, Math.PI, 0] : [0, Math.PI, Math.PI * 1.5, Math.PI * 0.5];
  const amp = (gait === "scurry" ? 0.75 : gait === "plod" ? 0.5 : gait === "scuttle" ? 0.6 : 0.6) * (1 + p.run * 0.3);
  const splayed = gait === "scuttle" || gait === "plod" && spec.id === "turtle";
  const t = a.t;
  rig.legs.forEach((leg, i) => {
    const lb = base(a, leg);
    const front = i < 2;
    const s = i % 2 === 0 ? 1 : -1;
    let rx = 0;
    let ry = 0;
    let rz = 0;
    let sy = 1;
    let py = lb.p.y;
    const swing = Math.sin(ph + offsets[i]);
    if (gait === "hop") {
      const air = Math.min(1, f.air * 5);
      rx += front ? -0.7 * air + swing * 0.15 * walk : 0.9 * air - 0.2 * walk * (1 - air);
    } else if (splayed) {
      ry += swing * amp * walk * (front ? 1 : -1) * 0.9;
      py += Math.max(0, Math.cos(ph + offsets[i])) * 0.03 * walk;
    } else {
      rx += swing * amp * walk;
      py += Math.max(0, Math.cos(ph + offsets[i])) * 0.02 * walk;
    }
    // Poses
    const sitA = SIT_ANGLE[spec.id] ?? 0.3;
    if (front) {
      rx += p.sit * sitA;
      sy += p.sit * (spec.id === "dog" || spec.id === "cat" ? 0.9 : 0.4);
      rx += -p.lie * 1.25 - p.crouch * 0.7;
      rx += -p.beg * 0.4;
      const raise = s > 0 ? p.pawL : p.pawR;
      rx += -raise * 2.2;
      rz += s * raise * 0.25;
      if (p.beg > 0.05) rx += Math.sin(t * 9 + i) * 0.25 * p.beg;
      if (p.dance > 0.05) rx += -Math.max(0, Math.sin(t * 3.2 + (s > 0 ? 0 : Math.PI))) * 1.2 * p.dance;
    } else {
      rx += -p.sit * 1.0 + p.lie * 1.25 + p.beg * 0.6;
    }
    if (p.roll > 0.05) rx += (front ? -0.6 : 0.6) * p.roll + Math.sin(t * 9 + i * 1.7) * 0.45 * p.roll;
    if (p.curl > 0.05) sy *= 1 - p.curl * 0.7;
    if (p.retract > 0.05) sy *= 1 - p.retract * 0.55;
    if (p.stretch > 0.05) rx += front ? -p.stretch * 0.9 : p.stretch * 0.7;
    leg.position.y = py;
    leg.rotation.set(lb.r.x + rx, lb.r.y + ry, lb.r.z + rz);
    leg.scale.set(lb.s.x, lb.s.y * sy, lb.s.z);
  });
}

function animateBirdLegs(rig: Rig, spec: SpeciesSpec, p: Pose, a: AnimState, ph: number) {
  rig.legs.forEach((leg, i) => {
    const lb = base(a, leg);
    const s = i === 0 ? 1 : -1;
    let rx = 0;
    if (spec.gait === "waddle") rx = Math.sin(ph + (i ? Math.PI : 0)) * 0.55 * p.walk;
    else rx = Math.sin(ph * 2) * 0.15 * p.walk;
    const tuck = Math.max(p.sit, p.lie, p.sleep);
    leg.rotation.set(lb.r.x + rx, lb.r.y, lb.r.z + s * 0.02);
    leg.scale.set(lb.s.x, lb.s.y * (1 - tuck * 0.65), lb.s.z);
    leg.position.y = lb.p.y + tuck * 0.05;
  });
}
