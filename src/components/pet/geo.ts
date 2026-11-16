import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

// Shared geometry. Everything here is cached for the lifetime of the page and never disposed,
// so building a pet or room only creates materials and meshes.

const cache = new Map<string, THREE.BufferGeometry>();
function cached<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = cache.get(key) as T | undefined;
  if (!g) {
    g = make();
    cache.set(key, g);
  }
  return g;
}

export const SPHERE = () => cached("sphere", () => new THREE.SphereGeometry(1, 40, 28));
export const SPHERE_LO = () => cached("sphere-lo", () => new THREE.SphereGeometry(1, 18, 12));
/** Top half of a sphere (y > 0), for eyelids and domes. */
export const HEMI_TOP = () => cached("hemi-top", () => new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2));
export const HEMI_BOTTOM = () => cached("hemi-bot", () => new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2));

export const capsule = (r: number, len: number) =>
  cached(`cap:${r}:${len}`, () => new THREE.CapsuleGeometry(r, len, 8, 18, 1));

export const cylinder = (rt: number, rb: number, h: number, seg = 24, open = false) =>
  cached(`cyl:${rt}:${rb}:${h}:${seg}:${open}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open));

export const torus = (r: number, tube: number, arc = Math.PI * 2) =>
  cached(`tor:${r}:${tube}:${arc}`, () => new THREE.TorusGeometry(r, tube, 14, 40, arc));

export const cone = (r: number, h: number, seg = 20) =>
  cached(`cone:${r}:${h}:${seg}`, () => {
    const g = new THREE.ConeGeometry(r, h, seg);
    g.translate(0, h / 2, 0);
    return g;
  });

export const rbox = (w: number, h: number, d: number, r = 0.06) =>
  cached(`rbox:${w}:${h}:${d}:${r}`, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)));

export const plane = (w: number, h: number) => cached(`plane:${w}:${h}`, () => new THREE.PlaneGeometry(w, h));
export const circle = (r: number, seg = 40) => cached(`circle:${r}:${seg}`, () => new THREE.CircleGeometry(r, seg));

/**
 * A sphere pulled up into a soft point: cat ears, spikes, beaks, crests.
 * `tip` is how narrow the top gets (0 = sharp), `power` shapes the taper.
 */
export const pointy = (tip = 0.15, power = 1.4, seg = 24) =>
  cached(`pointy:${tip}:${power}:${seg}`, () => {
    const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const t = Math.pow((y + 1) / 2, power);
      const s = 1 - (1 - tip) * t;
      p.setX(i, p.getX(i) * s);
      p.setZ(i, p.getZ(i) * s);
    }
    g.computeVertexNormals();
    return g;
  });

/** Egg shape: wider at the bottom. Good for bird and hamster bodies. */
export const egg = (k = 0.18) =>
  cached(`egg:${k}`, () => {
    const g = new THREE.SphereGeometry(1, 40, 28);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const s = 1 - k * y;
      p.setX(i, p.getX(i) * s);
      p.setZ(i, p.getZ(i) * s);
    }
    g.computeVertexNormals();
    return g;
  });

/** Smooth tube along points, for mouths, whiskers and tails. Not cached (shapes vary). */
export function tubeAlong(points: THREE.Vector3[], radius: number, seg = 24, radial = 8) {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.TubeGeometry(curve, seg, radius, radial, false);
}

export const heart = () =>
  cached("heart", () => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.5);
    s.bezierCurveTo(-0.15, -0.35, -0.6, -0.1, -0.55, 0.2);
    s.bezierCurveTo(-0.5, 0.5, -0.12, 0.55, 0, 0.3);
    s.bezierCurveTo(0.12, 0.55, 0.5, 0.5, 0.55, 0.2);
    s.bezierCurveTo(0.6, -0.1, 0.15, -0.35, 0, -0.5);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 3, curveSegments: 14 });
    g.center();
    return g;
  });

export const star = (points = 5, outer = 0.5, inner = 0.22, depth = 0.08) =>
  cached(`star:${points}:${outer}:${inner}:${depth}`, () => {
    const s = new THREE.Shape();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
    g.center();
    return g;
  });

/** A lathe from a profile of [radius, y] pairs, smoothed. */
export function lathe(key: string, profile: [number, number][], seg = 40) {
  return cached(`lathe:${key}`, () => {
    const pts = new THREE.SplineCurve(profile.map(([x, y]) => new THREE.Vector2(x, y))).getPoints(48);
    const g = new THREE.LatheGeometry(pts, seg);
    g.computeVertexNormals();
    return g;
  });
}

type MeshOpts = {
  pos?: [number, number, number];
  scale?: number | [number, number, number];
  rot?: [number, number, number];
  name?: string;
  part?: string;
  shadow?: boolean;
  receive?: boolean;
};

export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, o: MeshOpts = {}) {
  const m = new THREE.Mesh(geo, mat);
  if (o.pos) m.position.set(...o.pos);
  if (o.scale !== undefined) {
    if (typeof o.scale === "number") m.scale.setScalar(o.scale);
    else m.scale.set(...o.scale);
  }
  if (o.rot) m.rotation.set(...o.rot);
  if (o.name) m.name = o.name;
  if (o.part) m.userData.part = o.part;
  m.castShadow = o.shadow ?? true;
  m.receiveShadow = o.receive ?? false;
  return m;
}

export function group(name?: string, pos?: [number, number, number], rot?: [number, number, number]) {
  const g = new THREE.Group();
  if (name) g.name = name;
  if (pos) g.position.set(...pos);
  if (rot) g.rotation.set(...rot);
  return g;
}

/** Point on the front (+z) surface of an ellipsoid at (x, y), offset outwards by `lift`. */
export function onEllipsoid(c: [number, number, number], r: [number, number, number], x: number, y: number, lift = 0) {
  const nx = (x - c[0]) / r[0];
  const ny = (y - c[1]) / r[1];
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  const z = c[2] + nz * r[2];
  const n = new THREE.Vector3(nx / r[0], ny / r[1], nz / r[2]).normalize();
  return new THREE.Vector3(x, y, z).addScaledVector(n, lift);
}
