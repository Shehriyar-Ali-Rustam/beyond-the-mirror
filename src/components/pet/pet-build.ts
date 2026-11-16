import * as THREE from "three";
import { HEMI_BOTTOM, HEMI_TOP, SPHERE, SPHERE_LO, capsule, cylinder, egg, group, mesh, onEllipsoid, pointy, torus, tubeAlong } from "./geo";
import { finTexture, furTexture, patternTexture, shade, shellTexture } from "./textures";
import type { PetLook, SpeciesId } from "./types";

// ---------------------------------------------------------------------------
// Rig: the named parts the animator moves. Every species fills in what it has.
// ---------------------------------------------------------------------------

export type EyeRig = {
  socket: THREE.Group;
  ball: THREE.Group;
  upper: THREE.Mesh;
  lower: THREE.Mesh;
  lash: THREE.Mesh;
  shine: THREE.Object3D[];
};

export type Rig = {
  species: SpeciesId;
  root: THREE.Group;
  /** Pivot at the hips: pitch for sitting, roll for belly-up. */
  body: THREE.Group;
  /** Breathing and squash live here. */
  torso: THREE.Group;
  head: THREE.Group;
  neck: THREE.Group | null;
  eyes: EyeRig[];
  mouth: { cavity: THREE.Mesh; tongue: THREE.Mesh; jaw: THREE.Group | null; line: THREE.Object3D | null };
  ears: THREE.Group[];
  tail: THREE.Group[];
  legs: THREE.Group[];
  wings: THREE.Group[];
  fins: THREE.Group[];
  cheeks: THREE.Object3D[];
  spikes: THREE.Group | null;
  anchors: {
    headTop: THREE.Group;
    face: THREE.Group;
    neck: THREE.Group;
    wrap: THREE.Group;
    back: THREE.Group;
    mouth: THREE.Group;
  };
  foam: THREE.Object3D[];
  furMats: THREE.MeshPhysicalMaterial[];
  furBase: THREE.Color[];
  dims: { height: number; headY: number; legLen: number; bodyY: number; length: number; scale: number };
  dispose: () => void;
};

type V3 = [number, number, number];

class Kit {
  mats: THREE.Material[] = [];
  geos: THREE.BufferGeometry[] = [];
  phys(p: THREE.MeshPhysicalMaterialParameters) {
    const m = new THREE.MeshPhysicalMaterial(p);
    this.mats.push(m);
    return m;
  }
  basic(p: THREE.MeshBasicMaterialParameters) {
    const m = new THREE.MeshBasicMaterial(p);
    this.mats.push(m);
    return m;
  }
  tube(points: THREE.Vector3[], r: number, seg = 20) {
    const g = tubeAlong(points, r, seg, 6);
    this.geos.push(g);
    return g;
  }
  own<T extends THREE.BufferGeometry>(g: T) {
    this.geos.push(g);
    return g;
  }
  dispose() {
    this.mats.forEach((m) => m.dispose());
    this.geos.forEach((g) => g.dispose());
  }
}

const mix = (a: string, b: string, t: number) => `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;
const lum = (hex: string) => {
  const c = new THREE.Color(hex);
  return 0.3 * c.r + 0.59 * c.g + 0.11 * c.b;
};

type Mats = ReturnType<typeof makeMats>;

function makeMats(kit: Kit, look: PetLook, species: SpeciesId) {
  const { body, accent, pattern } = look;
  const sheenCol = new THREE.Color(mix(body, "#ffffff", 0.55));
  const furry = !["turtle", "goldfish", "gecko", "duck", "parrot"].includes(species);
  const bellyColor = species === "hedgehog" ? mix(body, "#ffffff", 0.35) : mix(body, "#fffaf2", lum(body) > 0.75 ? 0.6 : 0.62);
  const fur = kit.phys({
    color: "#ffffff",
    map: patternTexture(body, accent, pattern, species.length + 3),
    roughness: furry ? 0.8 : 0.5,
    sheen: furry ? 1 : 0.3,
    sheenRoughness: 0.5,
    sheenColor: sheenCol,
    clearcoat: furry ? 0 : 0.35,
    clearcoatRoughness: 0.4,
  });
  const plain = kit.phys({
    color: "#ffffff",
    map: furTexture(body),
    roughness: furry ? 0.8 : 0.5,
    sheen: furry ? 1 : 0.3,
    sheenRoughness: 0.5,
    sheenColor: sheenCol,
    clearcoat: furry ? 0 : 0.35,
  });
  const belly = kit.phys({
    color: "#ffffff",
    map: furTexture(bellyColor),
    roughness: furry ? 0.85 : 0.5,
    sheen: furry ? 1 : 0.2,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color("#ffffff"),
    clearcoat: furry ? 0 : 0.3,
  });
  const acc = kit.phys({
    color: "#ffffff",
    map: furTexture(accent),
    roughness: furry ? 0.8 : 0.45,
    sheen: furry ? 1 : 0.3,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(mix(accent, "#ffffff", 0.5)),
    clearcoat: furry ? 0 : 0.4,
  });
  const pink = kit.phys({ color: "#f6a5b7", roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color("#ffd6df") });
  const nose = kit.phys({ color: "#3a2629", roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.12 });
  const pinkNose = kit.phys({ color: "#f08aa0", roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const eye = kit.phys({ color: "#170f12", roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03 });
  const shine = kit.basic({ color: "#ffffff" });
  const mouth = kit.phys({ color: "#6b2a35", roughness: 0.7 });
  const tongue = kit.phys({ color: "#ff8ea4", roughness: 0.4, clearcoat: 0.5 });
  const line = kit.basic({ color: lum(body) < 0.25 ? "#1a0f10" : "#4a2a2c" });
  const lash = kit.basic({ color: "#2a1a1c" });
  const blush = kit.basic({ color: "#ff8fa8", transparent: true, opacity: 0.45, depthWrite: false });
  const whisker = kit.basic({ color: lum(body) < 0.45 ? "#f4efe8" : "#7a6a64" });
  const beak = kit.phys({ color: "#ffaf3c", roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  const darkBeak = kit.phys({ color: "#3d3536", roughness: 0.35, clearcoat: 0.7 });
  const foot = kit.phys({ color: "#ff9f3a", roughness: 0.45, clearcoat: 0.4 });
  const greyFoot = kit.phys({ color: "#9a8f8c", roughness: 0.6 });
  const claw = kit.phys({ color: "#f3e8dc", roughness: 0.5 });
  const foam = kit.phys({ color: "#ffffff", roughness: 0.2, iridescence: 0.8, iridescenceIOR: 1.3, sheen: 0.4, sheenColor: new THREE.Color("#cfe9ff") });
  return { fur, plain, belly, acc, pink, nose, pinkNose, eye, shine, mouth, tongue, line, lash, blush, whisker, beak, darkBeak, foot, greyFoot, claw, foam, bellyColor };
}

// ---------------------------------------------------------------------------
// Face kit
// ---------------------------------------------------------------------------

type EyeOpts = {
  center: V3;
  pos: V3;
  r: number;
  iris: string;
  pupil?: "round" | "slit";
  lid: THREE.Material;
  outward?: number;
  stretch?: V3;
};

function addEye(kit: Kit, M: Mats, parent: THREE.Object3D, o: EyeOpts): EyeRig {
  const socket = group("eye", o.pos);
  const out = new THREE.Vector3(...o.pos).sub(new THREE.Vector3(...o.center)).normalize();
  const dir = new THREE.Vector3(0, 0, 1).lerp(out, o.outward ?? 0.35).normalize();
  socket.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
  const st = o.stretch ?? [1, 1.12, 0.62];
  socket.scale.set(st[0], st[1], st[2]);
  const r = o.r;
  const ball = group("eyeball");
  ball.add(mesh(SPHERE(), M.eye, { scale: r, part: "head", shadow: false }));
  const irisMat = kit.phys({ color: o.iris, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
  ball.add(mesh(SPHERE(), irisMat, { pos: [0, 0, r * 0.74], scale: [r * 0.74, r * 0.74, r * 0.32], part: "head", shadow: false }));
  const pupilScale: V3 = o.pupil === "slit" ? [r * 0.18, r * 0.52, r * 0.2] : [r * 0.4, r * 0.4, r * 0.2];
  ball.add(mesh(SPHERE(), M.eye, { pos: [0, 0, r * 0.93], scale: pupilScale, part: "head", shadow: false }));
  socket.add(ball);
  const s1 = mesh(SPHERE_LO(), M.shine, { pos: [r * 0.36, r * 0.36, r * 1.02], scale: [r * 0.26, r * 0.26, r * 0.12], shadow: false });
  const s2 = mesh(SPHERE_LO(), M.shine, { pos: [-r * 0.32, -r * 0.3, r * 1.0], scale: [r * 0.12, r * 0.12, r * 0.06], shadow: false });
  socket.add(s1, s2);
  const L = r * 1.12;
  const upper = mesh(HEMI_TOP(), o.lid, { scale: L, part: "head", shadow: false });
  const lower = mesh(HEMI_BOTTOM(), o.lid, { scale: L * 0.99, part: "head", shadow: false });
  upper.rotation.x = -1.3;
  lower.rotation.x = 1.25;
  socket.add(upper, lower);
  const lashG = torus(0.55, 0.055, Math.PI);
  const lash = mesh(lashG, M.lash, { pos: [0, -L * 0.05, L * 0.86], scale: L, shadow: false });
  lash.visible = false;
  socket.add(lash);
  parent.add(socket);
  return { socket, ball, upper, lower, lash, shine: [s1, s2] };
}

/** The little "w" mouth drawn on the surface of a muzzle ellipsoid. */
function addMouthLine(kit: Kit, M: Mats, parent: THREE.Object3D, c: V3, r: V3, y: number, w: number, style: "w" | "smile" = "w") {
  const pts: [number, number][] =
    style === "w"
      ? [
          [-w, y + w * 0.35],
          [-w * 0.55, y - w * 0.28],
          [-w * 0.12, y - w * 0.2],
          [0, y + w * 0.05],
          [w * 0.12, y - w * 0.2],
          [w * 0.55, y - w * 0.28],
          [w, y + w * 0.35],
        ]
      : [
          [-w, y + w * 0.3],
          [-w * 0.6, y - w * 0.12],
          [0, y - w * 0.22],
          [w * 0.6, y - w * 0.12],
          [w, y + w * 0.3],
        ];
  const v = pts.map(([x, yy]) => onEllipsoid(c, r, x, yy, 0.002));
  const line = mesh(kit.tube(v, Math.max(0.006, w * 0.075), 28), M.line, { shadow: false, part: "head" });
  parent.add(line);
  if (style === "w") {
    const top = onEllipsoid(c, r, 0, y + w * 0.55, 0.002);
    const ph = mesh(kit.tube([top, onEllipsoid(c, r, 0, y + w * 0.25, 0.002), v[3]], Math.max(0.006, w * 0.07), 8), M.line, { shadow: false });
    parent.add(ph);
  }
  return line;
}

function addMouthCavity(M: Mats, parent: THREE.Object3D, pos: V3, w: number) {
  const cavity = mesh(SPHERE_LO(), M.mouth, { pos, scale: [w, w * 0.08, w * 0.55], shadow: false, part: "head" });
  const tongue = mesh(SPHERE_LO(), M.tongue, { pos: [0, -0.35, 0.45], scale: [0.62, 0.55, 0.6], shadow: false });
  cavity.add(tongue);
  parent.add(cavity);
  return { cavity, tongue };
}

function addBlush(M: Mats, parent: THREE.Object3D, c: V3, r: number, x: number, y: number, size: number) {
  for (const s of [-1, 1]) {
    const p = onEllipsoid(c, [r, r, r], s * x, y, 0.004);
    const m = mesh(SPHERE_LO(), M.blush, { pos: [p.x, p.y, p.z], scale: [size, size * 0.62, size * 0.25], shadow: false });
    const n = p.clone().sub(new THREE.Vector3(...c)).normalize();
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    m.renderOrder = 2;
    parent.add(m);
  }
}

function addWhiskers(kit: Kit, M: Mats, parent: THREE.Object3D, base: V3, n: number, len: number) {
  for (const s of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const dy = (i - (n - 1) / 2) * 0.025;
      const a = new THREE.Vector3(base[0] * s, base[1] + dy, base[2]);
      const b = new THREE.Vector3(base[0] * s + s * len * 0.55, base[1] + dy * 1.6 + 0.01, base[2] - len * 0.12);
      const c2 = new THREE.Vector3(base[0] * s + s * len, base[1] + dy * 2.6 - 0.01, base[2] - len * 0.3);
      parent.add(mesh(kit.tube([a, b, c2], 0.0035, 10), M.whisker, { shadow: false }));
    }
  }
}

function addFoam(M: Mats, parent: THREE.Object3D, c: V3, r: V3, n: number, seed: number, list: THREE.Object3D[], minY = -0.1) {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s % 1000) / 1000;
  };
  for (let i = 0; i < n; i++) {
    const theta = rnd() * Math.PI * 2;
    const y = minY + rnd() * (1 - minY) * 0.95;
    const rr = Math.sqrt(Math.max(0, 1 - y * y));
    const p = new THREE.Vector3(c[0] + Math.cos(theta) * rr * r[0], c[1] + y * r[1], c[2] + Math.sin(theta) * rr * r[2]);
    const g = group("foam");
    g.position.copy(p);
    const k = Math.min(r[0], r[1], r[2]) * 0.42;
    for (let j = 0; j < 3; j++) {
      g.add(mesh(SPHERE_LO(), M.foam, { pos: [(rnd() - 0.5) * k, (rnd() - 0.2) * k * 0.8, (rnd() - 0.5) * k], scale: k * (0.45 + rnd() * 0.4), shadow: false }));
    }
    g.scale.setScalar(0.001);
    g.visible = false;
    g.userData.level = 0;
    parent.add(g);
    list.push(g);
  }
}

function earPivot(name: string, pos: V3, rot: V3) {
  const g = group(name, pos, rot);
  g.userData.base = rot;
  return g;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

type Ctx = { kit: Kit; M: Mats; look: PetLook; rig: Rig };

function baseRig(species: SpeciesId): Rig {
  const root = group("pet");
  const body = group("body");
  const torso = group("torso");
  const head = group("head");
  body.add(torso);
  root.add(body);
  return {
    species,
    root,
    body,
    torso,
    head,
    neck: null,
    eyes: [],
    mouth: { cavity: new THREE.Mesh(), tongue: new THREE.Mesh(), jaw: null, line: null },
    ears: [],
    tail: [],
    legs: [],
    wings: [],
    fins: [],
    cheeks: [],
    spikes: null,
    anchors: { headTop: group("a-top"), face: group("a-face"), neck: group("a-neck"), wrap: group("a-wrap"), back: group("a-back"), mouth: group("a-mouth") },
    foam: [],
    furMats: [],
    furBase: [],
    dims: { height: 1, headY: 0.8, legLen: 0.2, bodyY: 0.4, length: 0.8, scale: 1 },
    dispose: () => {},
  };
}

/** A four-legged chibi body: shared by dog, cat, rabbit, hamster, guinea pig, hedgehog. */
type QuadOpts = {
  bodyR: V3;
  bodyY: number;
  headR: number;
  headScale: V3;
  headPos: V3;
  legR: number;
  legLen: number;
  legX: number;
  legZ: [number, number];
  pawScale: V3;
  bellyR?: V3;
  bellyPos?: V3;
  legMat?: "fur" | "acc" | "belly";
  hindR?: number;
};

function buildQuadBase(ctx: Ctx, o: QuadOpts) {
  const { M, rig } = ctx;
  const hipZ = -o.bodyR[2] * 0.55;
  rig.body.position.set(0, o.bodyY, hipZ);
  rig.torso.position.set(0, 0, -hipZ);
  const bodyMesh = mesh(SPHERE(), M.fur, { scale: o.bodyR, part: "body" });
  rig.torso.add(bodyMesh);
  if (o.bellyR) rig.torso.add(mesh(SPHERE(), M.belly, { pos: o.bellyPos ?? [0, -o.bodyR[1] * 0.28, o.bodyR[2] * 0.3], scale: o.bellyR, part: "belly" }));
  // Legs: FL, FR, BL, BR. Each pivot hangs a capsule and a round paw.
  const legMat = o.legMat === "acc" || ctx.look.pattern === "socks" ? M.acc : o.legMat === "belly" ? M.belly : M.plain;
  const corners: [number, number][] = [
    [o.legX, o.legZ[0]],
    [-o.legX, o.legZ[0]],
    [o.legX, o.legZ[1]],
    [-o.legX, o.legZ[1]],
  ];
  corners.forEach(([x, z], i) => {
    const back = i >= 2;
    const r = back && o.hindR ? o.hindR : o.legR;
    const pivot = group(back ? "leg-b" : "leg-f", [x, -o.bodyR[1] * 0.45, z]);
    const len = o.legLen + o.bodyR[1] * 0.45 - r;
    pivot.add(mesh(capsule(r, Math.max(0.01, len)), legMat, { pos: [0, -len / 2, 0], part: "paw" }));
    const paw = mesh(SPHERE(), legMat, { pos: [0, -len - r * 0.25, r * 0.35], scale: [r * o.pawScale[0], r * o.pawScale[1], r * o.pawScale[2]], part: "paw" });
    pivot.add(paw);
    // Toe bean on the underside, visible during high fives.
    const bean = mesh(SPHERE_LO(), M.pink, { pos: [0, -len - r * 0.72, r * 0.35], scale: [r * 0.6, r * 0.18, r * 0.6], shadow: false });
    pivot.add(bean);
    pivot.userData.len = len + r;
    rig.torso.add(pivot);
    rig.legs.push(pivot);
  });
  // Head
  const hp = o.headPos;
  rig.head.position.set(hp[0], hp[1], hp[2]);
  rig.torso.add(rig.head);
  const headMesh = mesh(SPHERE(), M.fur, { scale: [o.headR * o.headScale[0], o.headR * o.headScale[1], o.headR * o.headScale[2]], part: "head" });
  rig.head.add(headMesh);
  // Anchors
  rig.anchors.headTop.position.set(0, o.headR * o.headScale[1] * 0.92, -o.headR * 0.05);
  rig.anchors.headTop.userData.r = o.headR * Math.max(o.headScale[0], o.headScale[2]);
  rig.head.add(rig.anchors.headTop);
  rig.anchors.wrap.userData.radii = o.bodyR;
  rig.torso.add(rig.anchors.wrap);
  rig.anchors.back.position.set(0, o.bodyR[1] * 0.92, o.bodyR[2] * 0.35);
  rig.torso.add(rig.anchors.back);
  const neckY = hp[1] - o.headR * o.headScale[1] * 0.72;
  const neckZ = hp[2] - o.headR * 0.12;
  rig.anchors.neck.position.set(0, neckY, neckZ);
  rig.anchors.neck.rotation.x = 0.35;
  rig.anchors.neck.userData.radius = Math.min(o.headR * 0.68, o.bodyR[0] * 0.82);
  rig.torso.add(rig.anchors.neck);
  addFoam(M, rig.torso, [0, 0, 0], o.bodyR, 9, 11, rig.foam, 0.05);
  addFoam(M, rig.head, [0, 0, 0], [o.headR * o.headScale[0], o.headR * o.headScale[1], o.headR * o.headScale[2]], 5, 23, rig.foam, 0.25);
  rig.dims.legLen = o.legLen;
  rig.dims.bodyY = o.bodyY;
  rig.dims.headY = o.bodyY + hp[1];
  rig.dims.height = o.bodyY + hp[1] + o.headR * o.headScale[1];
  rig.dims.length = o.bodyR[2] * 2;
  return { headMesh, bodyMesh };
}

/** Standard pair of eyes on a round head. */
function faceEyes(ctx: Ctx, headR: number, headScale: V3, o: { x: number; y: number; r: number; iris: string; pupil?: "round" | "slit"; outward?: number; lid?: THREE.Material }) {
  const c: V3 = [0, 0, 0];
  const rr: V3 = [headR * headScale[0], headR * headScale[1], headR * headScale[2]];
  for (const s of [1, -1]) {
    const p = onEllipsoid(c, rr, s * o.x, o.y, -o.r * 0.42);
    ctx.rig.eyes.push(addEye(ctx.kit, ctx.M, ctx.rig.head, { center: c, pos: [p.x, p.y, p.z], r: o.r, iris: o.iris, pupil: o.pupil, lid: o.lid ?? ctx.M.fur, outward: o.outward }));
  }
  const face = ctx.rig.anchors.face;
  face.position.set(0, o.y, rr[2] * 0.98);
  face.userData.eyeX = o.x;
  face.userData.eyeR = o.r;
  face.userData.headR = headR * headScale[0];
  ctx.rig.head.add(face);
}

function addTailChain(ctx: Ctx, parent: THREE.Object3D, pos: V3, n: number, segLen: number, r0: number, r1: number, mat: THREE.Material, baseRot: V3, curl = 0, tipMat?: THREE.Material) {
  let prev: THREE.Object3D = parent;
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1);
    const r = r0 + (r1 - r0) * t;
    const seg = group("tail", i === 0 ? pos : [0, segLen, 0], i === 0 ? baseRot : [curl, 0, 0]);
    seg.userData.base = i === 0 ? baseRot : [curl, 0, 0];
    const m = mesh(capsule(r, segLen * 0.9), i === n - 1 && tipMat ? tipMat : mat, { pos: [0, segLen / 2, 0], part: "tail" });
    seg.add(m);
    prev.add(seg);
    ctx.rig.tail.push(seg);
    prev = seg;
  }
}

function buildDog(ctx: Ctx) {
  const { M, rig, kit } = ctx;
  const headR = 0.34;
  const hs: V3 = [1.06, 0.96, 0.94];
  buildQuadBase(ctx, {
    bodyR: [0.31, 0.29, 0.4],
    bodyY: 0.47,
    headR,
    headScale: hs,
    headPos: [0, 0.4, 0.34],
    legR: 0.085,
    legLen: 0.2,
    legX: 0.17,
    legZ: [0.22, -0.2],
    pawScale: [1.2, 0.85, 1.35],
    bellyR: [0.25, 0.22, 0.3],
    bellyPos: [0, -0.06, 0.16],
  });
  // Muzzle
  const mc: V3 = [0, -0.1, 0.24];
  const mr: V3 = [0.17, 0.12, 0.13];
  rig.head.add(mesh(SPHERE(), M.belly, { pos: mc, scale: mr, part: "head" }));
  rig.head.add(mesh(SPHERE(), M.nose, { pos: [0, -0.04, 0.37], scale: [0.065, 0.048, 0.045], part: "nose" }));
  rig.head.add(mesh(SPHERE_LO(), M.shine, { pos: [0.018, -0.022, 0.408], scale: [0.016, 0.01, 0.006], shadow: false }));
  rig.mouth.line = addMouthLine(kit, M, rig.head, mc, mr, -0.135, 0.06, "w");
  const mouth = addMouthCavity(M, rig.head, [0, -0.168, 0.33], 0.07);
  rig.mouth.cavity = mouth.cavity;
  rig.mouth.tongue = mouth.tongue;
  faceEyes(ctx, headR, hs, { x: 0.135, y: 0.06, r: 0.072, iris: "#5a3721", outward: 0.3 });
  addBlush(M, rig.head, [0, 0, 0], headR * 0.99, 0.22, -0.06, 0.05);
  // Floppy ears
  for (const s of [1, -1]) {
    const ear = earPivot("ear", [s * 0.27, 0.17, -0.02], [0, 0, s * 0.35]);
    ear.add(mesh(SPHERE(), M.acc, { pos: [s * 0.04, -0.14, 0], scale: [0.09, 0.19, 0.05], rot: [0, 0, s * 0.15], part: "ear" }));
    rig.head.add(ear);
    rig.ears.push(ear);
  }
  rig.anchors.mouth.position.set(0, -0.17, 0.36);
  rig.head.add(rig.anchors.mouth);
  addTailChain(ctx, rig.torso, [0, 0.12, -0.36], 3, 0.09, 0.055, 0.045, M.fur, [-0.7, 0, 0], -0.35, M.belly);
}

function buildCat(ctx: Ctx) {
  const { M, rig, kit } = ctx;
  const headR = 0.33;
  const hs: V3 = [1.1, 0.94, 0.92];
  buildQuadBase(ctx, {
    bodyR: [0.27, 0.27, 0.39],
    bodyY: 0.47,
    headR,
    headScale: hs,
    headPos: [0, 0.42, 0.3],
    legR: 0.072,
    legLen: 0.22,
    legX: 0.14,
    legZ: [0.21, -0.2],
    pawScale: [1.15, 0.8, 1.25],
    bellyR: [0.21, 0.22, 0.28],
    bellyPos: [0, -0.06, 0.16],
  });
  // Cheek fluff and a small muzzle
  for (const s of [1, -1]) rig.head.add(mesh(SPHERE(), M.fur, { pos: [s * 0.17, -0.11, 0.12], scale: [0.16, 0.13, 0.15], part: "head" }));
  const mc: V3 = [0, -0.1, 0.22];
  const mr: V3 = [0.13, 0.09, 0.11];
  rig.head.add(mesh(SPHERE(), M.belly, { pos: mc, scale: mr, part: "head" }));
  const nose = mesh(pointy(0.2, 1.2), M.pinkNose, { pos: [0, -0.05, 0.325], scale: [0.034, 0.028, 0.02], rot: [Math.PI, 0, 0], part: "nose" });
  rig.head.add(nose);
  rig.mouth.line = addMouthLine(kit, M, rig.head, mc, mr, -0.11, 0.05, "w");
  const mouth = addMouthCavity(M, rig.head, [0, -0.138, 0.3], 0.055);
  rig.mouth.cavity = mouth.cavity;
  rig.mouth.tongue = mouth.tongue;
  faceEyes(ctx, headR, hs, { x: 0.135, y: 0.055, r: 0.075, iris: ctx.look.body === "#4a4a52" || ctx.look.body === "#2e2b2e" ? "#e8c34a" : "#7fbf5a", pupil: "slit", outward: 0.3 });
  addBlush(M, rig.head, [0, 0, 0], headR * 1.0, 0.22, -0.07, 0.045);
  addWhiskers(kit, M, rig.head, [0.09, -0.1, 0.29], 3, 0.2);
  for (const s of [1, -1]) {
    const ear = earPivot("ear", [s * 0.17, 0.22, -0.03], [-0.1, 0, -s * 0.32]);
    ear.add(mesh(pointy(0.12, 1.25), M.fur, { pos: [0, 0.08, 0], scale: [0.1, 0.13, 0.05], part: "ear" }));
    ear.add(mesh(pointy(0.1, 1.25), M.pink, { pos: [0, 0.07, 0.03], scale: [0.065, 0.095, 0.02], part: "ear" }));
    rig.head.add(ear);
    rig.ears.push(ear);
  }
  rig.anchors.mouth.position.set(0, -0.15, 0.32);
  rig.head.add(rig.anchors.mouth);
  addTailChain(ctx, rig.torso, [0, 0.08, -0.36], 6, 0.11, 0.05, 0.042, M.fur, [-0.4, 0, 0], -0.22);
}

function buildRabbit(ctx: Ctx) {
  const { M, rig, kit } = ctx;
  const headR = 0.3;
  const hs: V3 = [1.05, 0.98, 0.98];
  buildQuadBase(ctx, {
    bodyR: [0.3, 0.29, 0.36],
    bodyY: 0.36,
    headR,
    headScale: hs,
    headPos: [0, 0.38, 0.27],
    legR: 0.065,
    legLen: 0.12,
    legX: 0.12,
    legZ: [0.22, -0.16],
    pawScale: [1.2, 0.8, 1.4],
    bellyR: [0.24, 0.23, 0.26],
    bellyPos: [0, -0.06, 0.14],
    hindR: 0.08,
  });
  // Big hind feet and haunches
  for (const s of [1, -1]) {
    rig.torso.add(mesh(SPHERE(), M.fur, { pos: [s * 0.2, -0.08, -0.12], scale: [0.13, 0.17, 0.2], part: "back" }));
  }
  for (const leg of rig.legs.slice(2)) {
    leg.add(mesh(SPHERE(), M.belly, { pos: [0, -leg.userData.len + 0.03, 0.08], scale: [0.075, 0.05, 0.17], part: "paw" }));
  }
  const mc: V3 = [0, -0.1, 0.2];
  const mr: V3 = [0.13, 0.1, 0.11];
  for (const s of [1, -1]) rig.head.add(mesh(SPHERE(), M.belly, { pos: [s * 0.055, -0.11, 0.21], scale: [0.075, 0.07, 0.08], part: "head" }));
  rig.head.add(mesh(pointy(0.25, 1.1), M.pinkNose, { pos: [0, -0.055, 0.295], scale: [0.032, 0.024, 0.018], rot: [Math.PI, 0, 0], part: "nose" }));
  rig.mouth.line = addMouthLine(kit, M, rig.head, mc, mr, -0.115, 0.04, "w");
  // Buck teeth
  rig.head.add(mesh(SPHERE_LO(), M.claw, { pos: [0, -0.16, 0.265], scale: [0.022, 0.02, 0.01], shadow: false }));
  const mouth = addMouthCavity(M, rig.head, [0, -0.15, 0.255], 0.05);
  rig.mouth.cavity = mouth.cavity;
  rig.mouth.tongue = mouth.tongue;
  faceEyes(ctx, headR, hs, { x: 0.125, y: 0.05, r: 0.07, iris: "#4a2c1d", outward: 0.35 });
  addBlush(M, rig.head, [0, 0, 0], headR, 0.2, -0.06, 0.045);
  addWhiskers(kit, M, rig.head, [0.07, -0.1, 0.25], 2, 0.16);
  for (const s of [1, -1]) {
    const ear = earPivot("ear", [s * 0.09, 0.22, -0.05], [-0.15, 0, -s * 0.16]);
    ear.add(mesh(SPHERE(), M.fur, { pos: [0, 0.24, 0], scale: [0.075, 0.27, 0.045], part: "ear" }));
    ear.add(mesh(SPHERE(), M.pink, { pos: [0, 0.24, 0.03], scale: [0.045, 0.21, 0.02], part: "ear" }));
    rig.head.add(ear);
    rig.ears.push(ear);
  }
  rig.anchors.mouth.position.set(0, -0.16, 0.28);
  rig.head.add(rig.anchors.mouth);
  // Cotton tail
  const tail = group("tail", [0, 0.06, -0.34]);
  tail.userData.base = [0, 0, 0];
  tail.add(mesh(SPHERE(), M.belly, { scale: 0.1, part: "tail" }));
  rig.torso.add(tail);
  rig.tail.push(tail);
  rig.dims.height += 0.4;
}

function buildHamster(ctx: Ctx) {
  const { M, rig, kit } = ctx;
  const headR = 0.27;
  const hs: V3 = [1.08, 0.95, 0.95];
  buildQuadBase(ctx, {
    bodyR: [0.33, 0.3, 0.34],
    bodyY: 0.3,
    headR,
    headScale: hs,
    headPos: [0, 0.2, 0.2],
    legR: 0.05,
    legLen: 0.04,
    legX: 0.15,
    legZ: [0.16, -0.14],
    pawScale: [1.2, 0.8, 1.3],
    bellyR: [0.27, 0.24, 0.26],
    bellyPos: [0, -0.07, 0.11],
    legMat: "belly",
  });
  // Puffy cheeks (they swell when eating)
  for (const s of [1, -1]) {
    const cheek = mesh(SPHERE(), M.belly, { pos: [s * 0.17, -0.09, 0.1], scale: [0.13, 0.12, 0.13], part: "head" });
    cheek.userData.base = [0.13, 0.12, 0.13];
    rig.head.add(cheek);
    rig.cheeks.push(cheek);
  }
  const mc: V3 = [0, -0.09, 0.18];
  const mr: V3 = [0.12, 0.09, 0.1];
  rig.head.add(mesh(SPHERE(), M.belly, { pos: mc, scale: mr, part: "head" }));
  rig.head.add(mesh(SPHERE_LO(), M.pinkNose, { pos: [0, -0.05, 0.278], scale: [0.026, 0.02, 0.016], part: "nose" }));
  rig.mouth.line = addMouthLine(kit, M, rig.head, mc, mr, -0.1, 0.038, "w");
  const mouth = addMouthCavity(M, rig.head, [0, -0.13, 0.255], 0.045);
  rig.mouth.cavity = mouth.cavity;
  rig.mouth.tongue = mouth.tongue;
  faceEyes(ctx, headR, hs, { x: 0.11, y: 0.04, r: 0.058, iris: "#2a1a14", outward: 0.35 });
  addBlush(M, rig.head, [0, 0, 0], headR * 1.02, 0.17, -0.05, 0.04);
  addWhiskers(kit, M, rig.head, [0.06, -0.08, 0.25], 2, 0.13);
  for (const s of [1, -1]) {
    const ear = earPivot("ear", [s * 0.17, 0.19, -0.04], [0, 0, -s * 0.4]);
    ear.add(mesh(SPHERE(), M.fur, { pos: [0, 0.04, 0], scale: [0.075, 0.07, 0.03], part: "ear" }));
    ear.add(mesh(SPHERE(), M.pink, { pos: [0, 0.04, 0.018], scale: [0.05, 0.048, 0.015], part: "ear" }));
    rig.head.add(ear);
    rig.ears.push(ear);
  }
  rig.anchors.mouth.position.set(0, -0.13, 0.26);
  rig.head.add(rig.anchors.mouth);
  const tail = group("tail", [0, -0.05, -0.33]);
  tail.userData.base = [0, 0, 0];
  tail.add(mesh(SPHERE(), M.fur, { scale: [0.04, 0.04, 0.05], part: "tail" }));
  rig.torso.add(tail);
  rig.tail.push(tail);
  rig.anchors.neck.position.set(0, 0.04, 0.16);
  rig.anchors.neck.userData.radius = 0.26;
}

function buildGuineaPig(ctx: Ctx) {
  const { M, rig, kit } = ctx;
  const headR = 0.26;
  const hs: V3 = [1.05, 0.95, 1.05];
  buildQuadBase(ctx, {
    bodyR: [0.3, 0.27, 0.42],
    bodyY: 0.29,
    headR,
    headScale: hs,
    headPos: [0, 0.1, 0.36],
    legR: 0.05,
    legLen: 0.05,
    legX: 0.16,
    legZ: [0.2, -0.22],
    pawScale: [1.2, 0.7, 1.3],
    legMat: "belly",
  });
  const mc: V3 = [0, -0.07, 0.2];
  const mr: V3 = [0.13, 0.1, 0.11];
  rig.head.add(mesh(SPHERE(), M.belly, { pos: mc, scale: mr, part: "head" }));
  rig.head.add(mesh(SPHERE_LO(), M.pinkNose, { pos: [0, -0.03, 0.305], scale: [0.03, 0.022, 0.016], part: "nose" }));
  rig.mouth.line = addMouthLine(kit, M, rig.head, mc, mr, -0.085, 0.04, "w");
  const mouth = addMouthCavity(M, rig.head, [0, -0.115, 0.285], 0.045);
  rig.mouth.cavity = mouth.cavity;
  rig.mouth.tongue = mouth.tongue;
  faceEyes(ctx, headR, hs, { x: 0.12, y: 0.05, r: 0.058, iris: "#2a1a14", outward: 0.45 });
  addBlush(M, rig.head, [0, 0, 0], headR * 1.03, 0.17, -0.04, 0.04);
  addWhiskers(kit, M, rig.head, [0.06, -0.06, 0.27], 2, 0.13);
  for (const s of [1, -1]) {
    const ear = earPivot("ear", [s * 0.18, 0.14, -0.06], [0.2, 0, -s * 0.9]);
    ear.add(mesh(SPHERE(), M.acc, { pos: [0, 0.05, 0], scale: [0.07, 0.065, 0.022], part: "ear" }));
    rig.head.add(ear);
    rig.ears.push(ear);
  }
  rig.anchors.mouth.position.set(0, -0.12, 0.3);
  rig.head.add(rig.anchors.mouth);
  // Fluffy rump instead of a tail
  const tail = group("tail", [0, 0.02, -0.38]);
  tail.userData.base = [0, 0, 0];
  tail.add(mesh(SPHERE(), M.fur, { scale: [0.2, 0.18, 0.1], part: "tail" }));
  rig.torso.add(tail);
  rig.tail.push(tail);
  rig.anchors.neck.position.set(0, 0.0, 0.3);
  rig.anchors.neck.userData.radius = 0.24;
}

function buildHedgehog(ctx: Ctx) {
  const { M, rig, kit } = ctx;
  const headR = 0.25;
  const hs: V3 = [1.05, 0.95, 1.0];
  const { headMesh } = buildQuadBase(ctx, {
    bodyR: [0.32, 0.28, 0.36],
    bodyY: 0.3,
    headR,
    headScale: hs,
    headPos: [0, 0.07, 0.3],
    legR: 0.045,
    legLen: 0.06,
    legX: 0.16,
    legZ: [0.18, -0.16],
    pawScale: [1.2, 0.7, 1.3],
    legMat: "belly",
    bellyR: [0.27, 0.22, 0.3],
    bellyPos: [0, -0.08, 0.06],
  });
  // Face is the pale belly colour
  headMesh.material = M.belly;
  // Snout
  const snout = mesh(pointy(0.35, 1.3), M.belly, { pos: [0, -0.06, 0.2], scale: [0.11, 0.16, 0.09], rot: [Math.PI / 2, 0, 0], part: "head" });
  rig.head.add(snout);
  rig.head.add(mesh(SPHERE(), M.nose, { pos: [0, -0.06, 0.37], scale: [0.04, 0.034, 0.03], part: "nose" }));
  rig.head.add(mesh(SPHERE_LO(), M.shine, { pos: [0.01, -0.048, 0.398], scale: [0.01, 0.007, 0.004], shadow: false }));
  const mc: V3 = [0, -0.07, 0.2];
  const mr: V3 = [0.09, 0.07, 0.16];
  rig.mouth.line = addMouthLine(kit, M, rig.head, mc, mr, -0.1, 0.035, "smile");
  const mouth = addMouthCavity(M, rig.head, [0, -0.11, 0.3], 0.04);
  rig.mouth.cavity = mouth.cavity;
  rig.mouth.tongue = mouth.tongue;
  faceEyes(ctx, headR, hs, { x: 0.1, y: 0.05, r: 0.055, iris: "#1f1412", outward: 0.4, lid: M.belly });
  addBlush(M, rig.head, [0, 0, 0], headR * 1.03, 0.16, -0.05, 0.04);
  for (const s of [1, -1]) {
    const ear = earPivot("ear", [s * 0.15, 0.15, -0.06], [0, 0, -s * 0.5]);
    ear.add(mesh(SPHERE(), M.pink, { pos: [0, 0.03, 0], scale: [0.045, 0.045, 0.02], part: "ear" }));
    rig.head.add(ear);
    rig.ears.push(ear);
  }
  rig.anchors.mouth.position.set(0, -0.11, 0.33);
  rig.head.add(rig.anchors.mouth);
  // Spikes: instanced cones over the back
  const spikeMat = kit.phys({ color: ctx.look.accent, roughness: 0.55, sheen: 0.5, sheenColor: new THREE.Color(mix(ctx.look.accent, "#ffffff", 0.4)) });
  const tipMat = kit.phys({ color: mix(ctx.look.accent, "#ffffff", 0.55), roughness: 0.5 });
  const spikes = group("spikes");
  const coat = mesh(SPHERE(), spikeMat, { scale: [0.335, 0.3, 0.37], pos: [0, 0.02, -0.02], part: "back" });
  spikes.add(coat);
  const geo = kit.own(new THREE.ConeGeometry(0.035, 0.16, 6));
  geo.translate(0, 0.08, 0);
  const n = 150;
  const inst = new THREE.InstancedMesh(geo, spikeMat, n);
  const tips = new THREE.InstancedMesh(kit.own(new THREE.ConeGeometry(0.014, 0.05, 6).translate(0, 0.16, 0)), tipMat, n);
  inst.castShadow = true;
  inst.userData.part = "back";
  tips.userData.part = "back";
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  let k = 0;
  for (let i = 0; i < 400 && k < n; i++) {
    // Fibonacci sphere, keep the back and sides, skip the belly and face.
    const y = 1 - (i / 399) * 2;
    const rr = Math.sqrt(1 - y * y);
    const a = i * 2.39996;
    const dir = new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr);
    if (dir.y < -0.15 || (dir.z > 0.55 && dir.y < 0.55)) continue;
    const p = new THREE.Vector3(dir.x * 0.31, dir.y * 0.28 + 0.02, dir.z * 0.35 - 0.02);
    const tilt = dir.clone().add(new THREE.Vector3(0, 0.15, -0.7)).normalize();
    q.setFromUnitVectors(up, tilt);
    m4.compose(p, q, new THREE.Vector3(1, 0.9 + ((i * 37) % 10) / 30, 1));
    inst.setMatrixAt(k, m4);
    tips.setMatrixAt(k, m4);
    k++;
  }
  inst.count = k;
  tips.count = k;
  spikes.add(inst, tips);
  rig.torso.add(spikes);
  rig.spikes = spikes;
  const tail = group("tail", [0, -0.05, -0.34]);
  tail.userData.base = [0, 0, 0];
  tail.add(mesh(SPHERE(), M.belly, { scale: [0.035, 0.035, 0.05], part: "tail" }));
  rig.torso.add(tail);
  rig.tail.push(tail);
  rig.anchors.headTop.position.set(0, 0.24, -0.02);
  rig.anchors.neck.position.set(0, -0.05, 0.22);
  rig.anchors.neck.userData.radius = 0.24;
  rig.anchors.back.position.set(0, 0.36, 0.05);
}

function buildGecko(ctx: Ctx) {
  const { M, rig, kit } = ctx;
  const bodyR: V3 = [0.22, 0.14, 0.34];
  rig.body.position.set(0, 0.2, -0.15);
  rig.torso.position.set(0, 0, 0.15);
  rig.torso.add(mesh(SPHERE(), M.fur, { scale: bodyR, part: "body" }));
  rig.torso.add(mesh(SPHERE(), M.belly, { pos: [0, -0.05, 0.02], scale: [0.18, 0.1, 0.3], part: "belly" }));
  // Head: wide and friendly
  rig.head.position.set(0, 0.1, 0.36);
  rig.torso.add(rig.head);
  const hR: V3 = [0.24, 0.17, 0.22];
  rig.head.add(mesh(SPHERE(), M.fur, { scale: hR, part: "head" }));
  rig.head.add(mesh(SPHERE(), M.belly, { pos: [0, -0.07, 0.04], scale: [0.2, 0.09, 0.17], part: "head" }));
  rig.mouth.line = addMouthLine(kit, M, rig.head, [0, 0, 0], hR, -0.06, 0.14, "smile");
  const mouth = addMouthCavity(M, rig.head, [0, -0.075, 0.19], 0.08);
  rig.mouth.cavity = mouth.cavity;
  rig.mouth.tongue = mouth.tongue;
  for (const s of [1, -1]) {
    const p = onEllipsoid([0, 0, 0], hR, s * 0.13, 0.08, -0.03);
    // Eye bumps so the eyes sit up high like a gecko's
    rig.head.add(mesh(SPHERE(), M.fur, { pos: [p.x, p.y - 0.01, p.z - 0.04], scale: 0.085, part: "head" }));
    rig.eyes.push(addEye(kit, M, rig.head, { center: [0, 0, 0], pos: [p.x, p.y + 0.01, p.z], r: 0.075, iris: "#c9862f", pupil: "slit", lid: M.fur, outward: 0.45, stretch: [1, 1.05, 0.7] }));
  }
  rig.head.add(mesh(SPHERE_LO(), M.nose, { pos: [0.04, 0.02, 0.215], scale: 0.008, shadow: false }));
  rig.head.add(mesh(SPHERE_LO(), M.nose, { pos: [-0.04, 0.02, 0.215], scale: 0.008, shadow: false }));
  addBlush(M, rig.head, [0, 0, 0], 0.21, 0.16, -0.03, 0.035);
  rig.anchors.face.position.set(0, 0.09, 0.2);
  rig.anchors.face.userData.eyeX = 0.13;
  rig.anchors.face.userData.eyeR = 0.075;
  rig.anchors.face.userData.headR = 0.24;
  rig.head.add(rig.anchors.face);
  rig.anchors.headTop.position.set(0, 0.15, -0.03);
  rig.anchors.headTop.userData.r = 0.22;
  rig.head.add(rig.anchors.headTop);
  rig.anchors.mouth.position.set(0, -0.07, 0.22);
  rig.head.add(rig.anchors.mouth);
  // Splayed legs with sticky toe pads
  const corners: [number, number][] = [
    [0.17, 0.18],
    [-0.17, 0.18],
    [0.17, -0.18],
    [-0.17, -0.18],
  ];
  corners.forEach(([x, z]) => {
    const s = Math.sign(x);
    const pivot = group("leg", [x, -0.02, z], [0, 0, s * 0.9]);
    pivot.userData.splay = s * 0.9;
    pivot.add(mesh(capsule(0.045, 0.12), M.fur, { pos: [0, -0.08, 0], part: "paw" }));
    const foot = group("foot", [0, -0.16, 0], [0, 0, -s * 0.9]);
    for (let t = 0; t < 4; t++) {
      const a = (t / 3 - 0.5) * 1.4;
      foot.add(mesh(SPHERE_LO(), M.belly, { pos: [Math.sin(a) * 0.06, -0.035, Math.cos(a) * 0.06], scale: [0.025, 0.018, 0.025], part: "paw" }));
    }
    foot.add(mesh(SPHERE(), M.fur, { pos: [0, -0.03, 0.01], scale: [0.05, 0.03, 0.05], part: "paw" }));
    pivot.add(foot);
    pivot.userData.len = 0.18;
    rig.torso.add(pivot);
    rig.legs.push(pivot);
  });
  addTailChain(ctx, rig.torso, [0, -0.01, -0.3], 6, 0.11, 0.085, 0.03, M.fur, [-1.75, 0, 0], 0.04);
  rig.anchors.neck.position.set(0, 0.05, 0.27);
  rig.anchors.neck.userData.radius = 0.17;
  rig.anchors.neck.rotation.x = 1.2;
  rig.anchors.wrap.userData.radii = bodyR;
  rig.torso.add(rig.anchors.neck, rig.anchors.wrap);
  rig.anchors.back.position.set(0, 0.13, 0.2);
  rig.torso.add(rig.anchors.back);
  addFoam(M, rig.torso, [0, 0, 0], bodyR, 8, 5, rig.foam, 0.1);
  addFoam(M, rig.head, [0, 0, 0], hR, 3, 9, rig.foam, 0.3);
  rig.dims = { height: 0.5, headY: 0.32, legLen: 0.15, bodyY: 0.2, length: 1.2, scale: 1 };
}

function buildTurtle(ctx: Ctx) {
  const { M, rig, kit } = ctx;
  rig.body.position.set(0, 0.24, -0.2);
  rig.torso.position.set(0, 0, 0.2);
  const shellMat = kit.phys({ color: "#ffffff", map: shellTexture(ctx.look.accent), roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.25 });
  const rimMat = kit.phys({ color: shade(ctx.look.accent, -0.1), roughness: 0.45, clearcoat: 0.5 });
  rig.torso.add(mesh(HEMI_TOP(), shellMat, { pos: [0, 0.02, 0], scale: [0.48, 0.42, 0.54], part: "back" }));
  rig.torso.add(mesh(torus(1, 0.07), rimMat, { pos: [0, 0.03, 0], scale: [0.48, 0.54, 0.5], rot: [Math.PI / 2, 0, 0], part: "back" }));
  rig.torso.add(mesh(SPHERE(), M.belly, { pos: [0, -0.02, 0], scale: [0.44, 0.1, 0.5], part: "belly" }));
  furMatFor(rig, shellMat);
  // Neck and head: the neck group slides in and out of the shell.
  const neck = group("neck", [0, 0.04, 0.38]);
  neck.add(mesh(capsule(0.1, 0.12), M.fur, { pos: [0, 0.02, 0.06], rot: [Math.PI / 2 - 0.4, 0, 0], part: "head" }));
  rig.torso.add(neck);
  rig.neck = neck;
  rig.head.position.set(0, 0.12, 0.17);
  neck.add(rig.head);
  const headR = 0.2;
  const hs: V3 = [1.05, 0.95, 1.0];
  rig.head.add(mesh(SPHERE(), M.fur, { scale: [headR * hs[0], headR * hs[1], headR * hs[2]], part: "head" }));
  rig.mouth.line = addMouthLine(kit, M, rig.head, [0, 0, 0], [headR * hs[0], headR * hs[1], headR * hs[2]], -0.07, 0.07, "smile");
  const mouth = addMouthCavity(M, rig.head, [0, -0.085, 0.165], 0.05);
  rig.mouth.cavity = mouth.cavity;
  rig.mouth.tongue = mouth.tongue;
  faceEyes(ctx, headR, hs, { x: 0.085, y: 0.04, r: 0.06, iris: "#2a1a14", outward: 0.35 });
  addBlush(M, rig.head, [0, 0, 0], headR * 1.03, 0.13, -0.04, 0.032);
  rig.head.add(mesh(SPHERE_LO(), M.nose, { pos: [0.025, 0.0, 0.205], scale: 0.007, shadow: false }));
  rig.head.add(mesh(SPHERE_LO(), M.nose, { pos: [-0.025, 0.0, 0.205], scale: 0.007, shadow: false }));
  rig.anchors.headTop.position.set(0, 0.18, -0.01);
  rig.anchors.headTop.userData.r = 0.2;
  rig.head.add(rig.anchors.headTop);
  rig.anchors.mouth.position.set(0, -0.08, 0.2);
  rig.head.add(rig.anchors.mouth);
  // Stubby legs
  const corners: [number, number][] = [
    [0.3, 0.26],
    [-0.3, 0.26],
    [0.3, -0.26],
    [-0.3, -0.26],
  ];
  corners.forEach(([x, z]) => {
    const s = Math.sign(x);
    const pivot = group("leg", [x, -0.02, z], [0, 0, s * 0.35]);
    pivot.userData.splay = s * 0.35;
    pivot.add(mesh(SPHERE(), M.fur, { pos: [0, -0.1, 0.02], scale: [0.1, 0.13, 0.11], part: "paw" }));
    for (let t = 0; t < 3; t++) pivot.add(mesh(SPHERE_LO(), M.claw, { pos: [(t - 1) * 0.04, -0.2, 0.09], scale: 0.018, shadow: false }));
    pivot.userData.len = 0.22;
    rig.torso.add(pivot);
    rig.legs.push(pivot);
  });
  const tail = group("tail", [0, 0, -0.5], [-1.9, 0, 0]);
  tail.userData.base = [-1.9, 0, 0];
  tail.add(mesh(pointy(0.1, 1.2), M.fur, { pos: [0, 0.05, 0], scale: [0.04, 0.08, 0.03], part: "tail" }));
  rig.torso.add(tail);
  rig.tail.push(tail);
  rig.anchors.neck.position.set(0, 0.05, 0.08);
  rig.anchors.neck.userData.radius = 0.11;
  rig.anchors.neck.rotation.x = 1.2;
  neck.add(rig.anchors.neck);
  rig.anchors.wrap.userData.radii = [0.48, 0.42, 0.54];
  rig.torso.add(rig.anchors.wrap);
  rig.anchors.back.position.set(0, 0.42, 0.1);
  rig.torso.add(rig.anchors.back);
  addFoam(M, rig.torso, [0, 0.02, 0], [0.46, 0.4, 0.52], 10, 3, rig.foam, 0.2);
  rig.dims = { height: 0.7, headY: 0.42, legLen: 0.22, bodyY: 0.24, length: 1.2, scale: 1 };
}

function furMatFor(rig: Rig, m: THREE.MeshPhysicalMaterial) {
  rig.furMats.push(m);
  rig.furBase.push(m.color.clone());
}

function buildDuck(ctx: Ctx) {
  const { M, rig } = ctx;
  rig.body.position.set(0, 0.38, -0.1);
  rig.torso.position.set(0, 0, 0.1);
  const bodyR: V3 = [0.3, 0.27, 0.34];
  rig.torso.add(mesh(egg(-0.12), M.fur, { scale: bodyR, part: "body" }));
  rig.torso.add(mesh(SPHERE(), M.belly, { pos: [0, -0.07, 0.1], scale: [0.24, 0.2, 0.25], part: "belly" }));
  // Tail tuft
  const tail = group("tail", [0, 0.08, -0.3], [-0.9, 0, 0]);
  tail.userData.base = [-0.9, 0, 0];
  tail.add(mesh(pointy(0.15, 1.2), M.fur, { pos: [0, 0.07, 0], scale: [0.1, 0.13, 0.06], part: "tail" }));
  rig.torso.add(tail);
  rig.tail.push(tail);
  // Head on a short neck
  rig.head.position.set(0, 0.38, 0.18);
  rig.torso.add(rig.head);
  const headR = 0.25;
  const hs: V3 = [1, 0.98, 0.98];
  rig.head.add(mesh(SPHERE(), M.fur, { scale: [headR, headR * 0.98, headR * 0.98], part: "head" }));
  // Cheek tuft
  rig.head.add(mesh(pointy(0.2, 1.3), M.fur, { pos: [0, 0.2, -0.05], scale: [0.05, 0.1, 0.04], rot: [-0.4, 0, 0], part: "head" }));
  // Bill: upper and a hinged lower jaw
  rig.head.add(mesh(SPHERE(), M.beak, { pos: [0, -0.04, 0.24], scale: [0.12, 0.04, 0.12], part: "nose" }));
  const jaw = group("jaw", [0, -0.06, 0.17]);
  jaw.add(mesh(SPHERE(), M.beak, { pos: [0, -0.008, 0.06], scale: [0.1, 0.025, 0.1], part: "nose" }));
  rig.head.add(jaw);
  rig.mouth.jaw = jaw;
  const mouth = addMouthCavity(M, rig.head, [0, -0.06, 0.22], 0.08);
  mouth.cavity.visible = false;
  rig.mouth.cavity = mouth.cavity;
  rig.mouth.tongue = mouth.tongue;
  faceEyes(ctx, headR, hs, { x: 0.11, y: 0.06, r: 0.058, iris: "#1f1412", outward: 0.4 });
  addBlush(M, rig.head, [0, 0, 0], headR * 1.02, 0.17, -0.03, 0.04);
  rig.anchors.headTop.position.set(0, headR * 0.95, -0.02);
  rig.anchors.headTop.userData.r = headR;
  rig.head.add(rig.anchors.headTop);
  rig.anchors.mouth.position.set(0, -0.06, 0.32);
  rig.head.add(rig.anchors.mouth);
  // Wings
  for (const s of [1, -1]) {
    const w = group("wing", [s * 0.27, 0.07, 0.02], [0, 0, 0]);
    w.userData.side = s;
    w.add(mesh(pointy(0.3, 1.1), M.acc, { pos: [0, 0, -0.1], scale: [0.06, 0.2, 0.13], rot: [-1.8, 0, s * 0.15], part: "paw" }));
    rig.torso.add(w);
    rig.wings.push(w);
  }
  // Legs with webbed feet
  for (const s of [1, -1]) {
    const leg = group("leg", [s * 0.12, -0.22, 0.02]);
    leg.add(mesh(cylinder(0.025, 0.025, 0.14, 10), M.foot, { pos: [0, -0.07, 0], part: "paw" }));
    const foot = group("foot", [0, -0.15, 0.04]);
    for (let t = 0; t < 3; t++) {
      const a = (t - 1) * 0.5;
      foot.add(mesh(SPHERE(), M.foot, { pos: [Math.sin(a) * 0.05, 0, Math.cos(a) * 0.06], scale: [0.035, 0.014, 0.06], rot: [0, a, 0], part: "paw" }));
    }
    leg.add(foot);
    leg.userData.len = 0.16;
    rig.torso.add(leg);
    rig.legs.push(leg);
  }
  rig.anchors.neck.position.set(0, 0.2, 0.16);
  rig.anchors.neck.userData.radius = 0.17;
  rig.anchors.neck.rotation.x = 0.15;
  rig.anchors.wrap.userData.radii = bodyR;
  rig.torso.add(rig.anchors.neck, rig.anchors.wrap);
  rig.anchors.back.position.set(0, 0.25, 0.1);
  rig.torso.add(rig.anchors.back);
  addFoam(M, rig.torso, [0, 0, 0], bodyR, 8, 7, rig.foam, 0.1);
  addFoam(M, rig.head, [0, 0, 0], [headR, headR, headR], 4, 13, rig.foam, 0.3);
  rig.dims = { height: 1.0, headY: 0.76, legLen: 0.16, bodyY: 0.38, length: 0.7, scale: 1 };
}

function buildParrot(ctx: Ctx) {
  const { M, rig } = ctx;
  rig.body.position.set(0, 0.32, -0.04);
  rig.torso.position.set(0, 0, 0.04);
  rig.torso.rotation.x = 0.12;
  const bodyR: V3 = [0.25, 0.33, 0.25];
  rig.torso.add(mesh(egg(0.14), M.fur, { pos: [0, 0.16, 0], scale: bodyR, part: "body" }));
  rig.torso.add(mesh(SPHERE(), M.belly, { pos: [0, 0.1, 0.09], scale: [0.19, 0.25, 0.18], part: "belly" }));
  rig.head.position.set(0, 0.55, 0.04);
  rig.torso.add(rig.head);
  const headR = 0.23;
  const hs: V3 = [1, 1, 1];
  rig.head.add(mesh(SPHERE(), M.fur, { scale: headR, part: "head" }));
  // White face patches around the eyes
  for (const s of [1, -1]) {
    const p = onEllipsoid([0, 0, 0], [headR, headR, headR], s * 0.1, 0.03, -0.035);
    const patch = mesh(SPHERE(), M.belly, { pos: [p.x, p.y, p.z], scale: [0.1, 0.11, 0.06], part: "head" });
    patch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), p.clone().normalize());
    rig.head.add(patch);
  }
  // Hooked beak
  const beakMat = ctx.look.body === "#f7f1e6" ? M.darkBeak : M.beak;
  const upper = mesh(pointy(0.05, 1.5), beakMat, { pos: [0, -0.03, 0.22], scale: [0.065, 0.12, 0.07], rot: [2.3, 0, 0], part: "nose" });
  rig.head.add(upper);
  const jaw = group("jaw", [0, -0.07, 0.17]);
  jaw.add(mesh(SPHERE(), beakMat, { pos: [0, -0.01, 0.04], scale: [0.05, 0.03, 0.06], part: "nose" }));
  rig.head.add(jaw);
  rig.mouth.jaw = jaw;
  const mouth = addMouthCavity(M, rig.head, [0, -0.07, 0.2], 0.06);
  mouth.cavity.visible = false;
  rig.mouth.cavity = mouth.cavity;
  rig.mouth.tongue = mouth.tongue;
  faceEyes(ctx, headR, hs, { x: 0.1, y: 0.04, r: 0.055, iris: "#1f1412", outward: 0.4 });
  // Crest
  for (let i = 0; i < 3; i++) {
    const f = mesh(pointy(0.1, 1.2), M.acc, { pos: [0, 0.2 + i * 0.01, -0.04 - i * 0.05], scale: [0.03, 0.11 - i * 0.015, 0.03], rot: [-0.5 - i * 0.35, 0, 0], part: "head" });
    rig.head.add(f);
  }
  rig.anchors.headTop.position.set(0, headR * 0.95, -0.02);
  rig.anchors.headTop.userData.r = headR;
  rig.head.add(rig.anchors.headTop);
  rig.anchors.mouth.position.set(0, -0.09, 0.27);
  rig.head.add(rig.anchors.mouth);
  // Wings folded along the body
  for (const s of [1, -1]) {
    const w = group("wing", [s * 0.22, 0.3, -0.02]);
    w.userData.side = s;
    w.add(mesh(pointy(0.2, 1.4), M.acc, { pos: [0, -0.16, -0.04], scale: [0.06, 0.22, 0.14], rot: [Math.PI - 0.15, 0, s * -0.1], part: "paw" }));
    rig.torso.add(w);
    rig.wings.push(w);
  }
  // Long tail feathers
  const tail = group("tail", [0, 0.0, -0.18], [-2.6, 0, 0]);
  tail.userData.base = [-2.6, 0, 0];
  for (let i = -1; i <= 1; i++) tail.add(mesh(pointy(0.3, 1.1), i === 0 ? M.acc : M.fur, { pos: [i * 0.05, 0.2, 0], scale: [0.05, 0.25, 0.02], rot: [0, 0, i * 0.12], part: "tail" }));
  rig.torso.add(tail);
  rig.tail.push(tail);
  // Legs and gripping toes
  for (const s of [1, -1]) {
    const leg = group("leg", [s * 0.09, -0.12, 0.04]);
    leg.add(mesh(cylinder(0.03, 0.025, 0.14, 10), M.greyFoot, { pos: [0, -0.07, 0], part: "paw" }));
    for (const dz of [1, -1]) leg.add(mesh(capsule(0.018, 0.06), M.greyFoot, { pos: [0, -0.15, dz * 0.04], rot: [Math.PI / 2, 0, 0], part: "paw" }));
    leg.userData.len = 0.17;
    rig.torso.add(leg);
    rig.legs.push(leg);
  }
  rig.anchors.neck.position.set(0, 0.38, 0.04);
  rig.anchors.neck.userData.radius = 0.16;
  rig.anchors.neck.rotation.x = 0.1;
  rig.anchors.wrap.position.set(0, 0.16, 0);
  rig.anchors.wrap.userData.radii = bodyR;
  rig.anchors.wrap.userData.upright = true;
  rig.torso.add(rig.anchors.neck, rig.anchors.wrap);
  rig.anchors.back.position.set(0, 0.42, -0.12);
  rig.torso.add(rig.anchors.back);
  addFoam(M, rig.torso, [0, 0.16, 0], bodyR, 8, 17, rig.foam, -0.2);
  addFoam(M, rig.head, [0, 0, 0], [headR, headR, headR], 4, 19, rig.foam, 0.3);
  rig.dims = { height: 1.15, headY: 0.87, legLen: 0.17, bodyY: 0.32, length: 0.5, scale: 1 };
}

function buildFish(ctx: Ctx) {
  const { M, rig, kit } = ctx;
  rig.body.position.set(0, 0, 0);
  // A side-flattened, round goldfish with big eyes and flowing fins.
  const bodyR: V3 = [0.15, 0.23, 0.3];
  rig.torso.add(mesh(egg(0.28), M.fur, { scale: [bodyR[0], bodyR[2], bodyR[1]], rot: [-Math.PI / 2, 0, 0], pos: [0, 0, -0.03], part: "body" }));
  rig.torso.add(mesh(SPHERE(), M.belly, { pos: [0, -0.09, 0.02], scale: [0.12, 0.12, 0.24], part: "belly" }));
  rig.head.position.set(0, 0.02, 0.13);
  rig.torso.add(rig.head);
  const hR: V3 = [0.155, 0.19, 0.17];
  rig.head.add(mesh(SPHERE(), M.fur, { scale: hR, part: "head" }));
  for (const s of [1, -1]) {
    const p = onEllipsoid([0, 0, 0], hR, s * 0.105, 0.045, -0.03);
    rig.eyes.push(addEye(kit, M, rig.head, { center: [0, 0, 0], pos: [p.x, p.y, p.z], r: 0.068, iris: "#1f1412", lid: M.fur, outward: 0.62, stretch: [1, 1.05, 0.7] }));
  }
  rig.anchors.face.position.set(0, 0.045, 0.15);
  rig.anchors.face.userData.eyeX = 0.11;
  rig.anchors.face.userData.eyeR = 0.068;
  rig.anchors.face.userData.headR = 0.16;
  rig.head.add(rig.anchors.face);
  addBlush(M, rig.head, [0, 0, 0], 0.165, 0.12, -0.06, 0.028);
  const finTex = finTexture(ctx.look.body, mix(ctx.look.accent, "#ffffff", 0.35));
  finTex.repeat.set(2.2, 2.6);
  const finMat = kit.phys({ color: "#ffffff", map: finTex, roughness: 0.3, transparent: true, opacity: 0.93, side: THREE.DoubleSide, sheen: 0.6, sheenColor: new THREE.Color("#ffffff"), clearcoat: 0.6 });
  // Little "o" mouth
  const lips = mesh(torus(0.022, 0.01), M.mouth, { pos: [0, -0.05, 0.17], part: "nose" });
  rig.head.add(lips);
  const mouth = addMouthCavity(M, rig.head, [0, -0.045, 0.168], 0.024);
  rig.mouth.cavity = mouth.cavity;
  rig.mouth.tongue = mouth.tongue;
  rig.mouth.line = lips;
  rig.anchors.headTop.position.set(0, 0.18, -0.02);
  rig.anchors.headTop.userData.r = 0.16;
  rig.head.add(rig.anchors.headTop);
  rig.anchors.mouth.position.set(0, -0.05, 0.2);
  rig.head.add(rig.anchors.mouth);
  // Fins are curved shapes. The tail is two big flowing lobes.
  const fin = (w: number, h: number, curl: number) => {
    const sh = new THREE.Shape();
    sh.moveTo(0, -h * 0.08);
    sh.bezierCurveTo(w * 0.35, h * 0.1, w * 0.85, h * 0.35, w, h);
    sh.bezierCurveTo(w * 0.7, h * 0.92, w * 0.45, h * 0.7, w * 0.3, h * 0.55);
    sh.bezierCurveTo(w * 0.15, h * 0.4, 0, h * 0.3, 0, h * 0.2);
    sh.closePath();
    const g = new THREE.ShapeGeometry(sh, 20);
    // Give the flat fin a gentle wave so it catches the light.
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / w) * Math.PI) * curl);
    g.computeVertexNormals();
    return kit.own(g);
  };
  const tail = group("tail", [0, 0.02, -0.3]);
  tail.userData.base = [0, 0, 0];
  const lobe = fin(0.5, 0.4, 0.05);
  for (const s of [1, -1]) tail.add(mesh(lobe, finMat, { rot: [0, Math.PI / 2, 0], scale: [1, s, 1], part: "tail", shadow: true }));
  rig.torso.add(tail);
  rig.tail.push(tail);
  const dorsal = group("fin", [0, 0.2, 0.06]);
  dorsal.add(mesh(fin(0.34, 0.24, 0.02), finMat, { rot: [0, Math.PI / 2, 0], part: "back" }));
  rig.torso.add(dorsal);
  rig.fins.push(dorsal);
  const belly = group("fin", [0, -0.2, -0.08]);
  belly.add(mesh(fin(0.16, 0.12, 0.01), finMat, { rot: [Math.PI, Math.PI / 2, 0], part: "belly" }));
  rig.torso.add(belly);
  for (const s of [1, -1]) {
    const pf = group("fin", [s * 0.13, -0.08, 0.06]);
    pf.userData.side = s;
    pf.add(mesh(fin(0.16, 0.12, 0.02), finMat, { rot: [0.3, s > 0 ? -0.6 : Math.PI + 0.6, -0.5], part: "paw" }));
    rig.torso.add(pf);
    rig.fins.push(pf);
  }
  rig.anchors.neck.position.set(0, 0, 0.1);
  rig.anchors.neck.userData.radius = 0.2;
  rig.anchors.wrap.userData.radii = bodyR;
  rig.torso.add(rig.anchors.neck, rig.anchors.wrap);
  rig.anchors.back.position.set(0, 0.22, 0.02);
  rig.torso.add(rig.anchors.back);
  rig.dims = { height: 0.5, headY: 0.05, legLen: 0, bodyY: 0, length: 0.8, scale: 1 };
}

const BUILDERS: Record<SpeciesId, (ctx: Ctx) => void> = {
  dog: buildDog,
  cat: buildCat,
  rabbit: buildRabbit,
  hamster: buildHamster,
  guineapig: buildGuineaPig,
  hedgehog: buildHedgehog,
  gecko: buildGecko,
  turtle: buildTurtle,
  duck: buildDuck,
  parrot: buildParrot,
  goldfish: buildFish,
};

export function buildPet(species: SpeciesId, look: PetLook): Rig {
  const kit = new Kit();
  const M = makeMats(kit, look, species);
  const rig = baseRig(species);
  const ctx: Ctx = { kit, M, look, rig };
  BUILDERS[species](ctx);
  for (const m of [M.fur, M.plain, M.belly, M.acc]) furMatFor(rig, m);
  rig.root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o.userData.part === undefined) {
      // Small details inherit the part of the nearest tagged ancestor.
      let p = o.parent;
      while (p && p.userData.part === undefined) p = p.parent;
      if (p) o.userData.part = p.userData.part;
    }
  });
  rig.dispose = () => kit.dispose();
  return rig;
}
