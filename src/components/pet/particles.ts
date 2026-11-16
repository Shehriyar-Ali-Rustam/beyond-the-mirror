import * as THREE from "three";
import { SPHERE_LO, heart, star } from "./geo";
import { glyphTexture } from "./textures";

export type ParticleKind = "bubble" | "drop" | "heart" | "sparkle" | "crumb" | "air" | "leaf" | "zzz" | "note" | "flake";

type P = { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; size: number; spin: number; color: number };

type Pool = {
  kind: ParticleKind;
  mesh: THREE.InstancedMesh | null;
  sprites: THREE.Sprite[];
  list: P[];
  max: number;
  gravity: number;
  drag: number;
};

const rnd = () => Math.random();

/** Pooled particles drawn with one instanced mesh per kind (sprites for glyphs). */
export class Particles {
  group = new THREE.Group();
  private pools = new Map<ParticleKind, Pool>();
  private mats: THREE.Material[] = [];
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private col = new THREE.Color();
  scale = 1;

  constructor() {
    const phys = (p: THREE.MeshPhysicalMaterialParameters) => {
      const m = new THREE.MeshPhysicalMaterial(p);
      this.mats.push(m);
      return m;
    };
    this.addMesh("bubble", SPHERE_LO(), phys({ color: "#ffffff", roughness: 0.05, transparent: true, opacity: 0.55, iridescence: 1, iridescenceIOR: 1.35, clearcoat: 1, depthWrite: false }), 140, -0.4, 1.2);
    this.addMesh("drop", SPHERE_LO(), phys({ color: "#8fd3ff", roughness: 0.05, transparent: true, opacity: 0.8, clearcoat: 1 }), 200, 9, 0.2);
    this.addMesh("heart", heart(), phys({ color: "#ff6f9e", emissive: "#ff3d7f", emissiveIntensity: 0.35, roughness: 0.35, clearcoat: 0.8 }), 30, -0.6, 1.4);
    this.addMesh("sparkle", star(4, 0.5, 0.14, 0.04), phys({ color: "#fff2a8", emissive: "#ffd84a", emissiveIntensity: 0.9, roughness: 0.3 }), 80, -0.2, 1.6);
    const crumbMat = phys({ color: "#ffffff", roughness: 0.8 });
    this.addMesh("crumb", SPHERE_LO(), crumbMat, 60, 9, 0.5);
    this.addMesh("air", SPHERE_LO(), phys({ color: "#ffffff", transparent: true, opacity: 0.35, roughness: 1, depthWrite: false }), 60, 0, 2.5);
    this.addMesh("leaf", SPHERE_LO(), phys({ color: "#ffffff", roughness: 0.7 }), 40, 0.6, 1.8);
    this.addMesh("flake", SPHERE_LO(), phys({ color: "#ffffff", roughness: 0.6 }), 40, 0.25, 3);
    this.addSprites("zzz", glyphTexture("z", "#6c7bd9"), 8);
    this.addSprites("note", glyphTexture("♪", "#e86a9a"), 8);
  }

  private addMesh(kind: ParticleKind, geo: THREE.BufferGeometry, mat: THREE.Material, max: number, gravity: number, drag: number) {
    const mesh = new THREE.InstancedMesh(geo, mat, max);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (kind === "crumb" || kind === "leaf" || kind === "flake") {
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    }
    this.group.add(mesh);
    this.pools.set(kind, { kind, mesh, sprites: [], list: [], max, gravity, drag });
  }

  private addSprites(kind: ParticleKind, tex: THREE.Texture, max: number) {
    const sprites: THREE.Sprite[] = [];
    for (let i = 0; i < max; i++) {
      const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
      this.mats.push(m);
      const s = new THREE.Sprite(m);
      s.visible = false;
      this.group.add(s);
      sprites.push(s);
    }
    this.pools.set(kind, { kind, mesh: null, sprites, list: [], max, gravity: -0.15, drag: 0.6 });
  }

  emit(kind: ParticleKind, at: THREE.Vector3, n: number, o: { spread?: number; speed?: number; up?: number; size?: number; life?: number; color?: string; dir?: THREE.Vector3 } = {}) {
    const pool = this.pools.get(kind);
    if (!pool) return;
    const count = Math.max(1, Math.round(n * this.scale));
    const spread = o.spread ?? 0.15;
    const speed = o.speed ?? 0.6;
    const color = new THREE.Color(o.color ?? "#ffffff").getHex();
    for (let i = 0; i < count; i++) {
      if (pool.list.length >= pool.max) pool.list.shift();
      const a = rnd() * Math.PI * 2;
      const d = o.dir;
      pool.list.push({
        x: at.x + (rnd() - 0.5) * spread * 2,
        y: at.y + (rnd() - 0.5) * spread,
        z: at.z + (rnd() - 0.5) * spread * 2,
        vx: d ? d.x * speed + (rnd() - 0.5) * speed * 0.4 : Math.cos(a) * speed * rnd(),
        vy: d ? d.y * speed + (rnd() - 0.5) * speed * 0.3 : (o.up ?? 0.6) * (0.6 + rnd() * 0.8),
        vz: d ? d.z * speed + (rnd() - 0.5) * speed * 0.4 : Math.sin(a) * speed * rnd(),
        life: 0,
        max: (o.life ?? 1.2) * (0.7 + rnd() * 0.6),
        size: (o.size ?? 0.05) * (0.6 + rnd() * 0.8),
        spin: (rnd() - 0.5) * 6,
        color,
      });
    }
  }

  update(dt: number, floorY = 0) {
    for (const pool of this.pools.values()) {
      const list = pool.list;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.life += dt;
        if (p.life >= p.max) {
          list.splice(i, 1);
          continue;
        }
        p.vy -= pool.gravity * dt;
        const drag = Math.exp(-pool.drag * dt);
        p.vx *= drag;
        p.vz *= drag;
        if (pool.kind === "bubble" || pool.kind === "zzz" || pool.kind === "note" || pool.kind === "heart") {
          p.vx += Math.sin(p.life * 5 + p.spin) * 0.25 * dt;
          p.vy *= Math.exp(-0.6 * dt);
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        if ((pool.kind === "crumb" || pool.kind === "drop") && p.y < floorY + p.size * 0.5) {
          p.y = floorY + p.size * 0.5;
          p.vy *= -0.25;
          p.vx *= 0.5;
          p.vz *= 0.5;
        }
      }
      if (pool.mesh) {
        const mesh = pool.mesh;
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          const k = p.life / p.max;
          let size = p.size;
          if (pool.kind === "heart" || pool.kind === "sparkle") size *= Math.sin(Math.min(1, k * 1.15) * Math.PI) * 1.3;
          else if (pool.kind === "bubble") size *= k > 0.85 ? (1 - k) / 0.15 + 0.2 : Math.min(1, k * 6);
          else if (pool.kind === "air") size *= 1 + k * 3;
          else size *= k > 0.8 ? (1 - k) / 0.2 : 1;
          this.e.set(pool.kind === "drop" ? 0 : p.spin * p.life, pool.kind === "heart" ? Math.sin(p.life * 4) * 0.5 : p.spin * p.life * 0.5, 0);
          if (pool.kind === "heart") this.e.set(0, Math.sin(p.life * 3) * 0.6, 0);
          this.q.setFromEuler(this.e);
          this.v.set(p.x, p.y, p.z);
          if (pool.kind === "drop") this.s.set(size * 0.7, size * 1.3, size * 0.7);
          else if (pool.kind === "leaf" || pool.kind === "flake") this.s.set(size, size * 0.35, size * 0.8);
          else this.s.set(size, size, size);
          this.m4.compose(this.v, this.q, this.s);
          mesh.setMatrixAt(i, this.m4);
          if (mesh.instanceColor) {
            this.col.setHex(p.color);
            mesh.setColorAt(i, this.col);
          }
        }
        mesh.count = list.length;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      } else {
        pool.sprites.forEach((s, i) => {
          const p = list[i];
          s.visible = !!p;
          if (!p) return;
          const k = p.life / p.max;
          s.position.set(p.x, p.y, p.z);
          const size = p.size * (0.6 + k * 0.8);
          s.scale.set(size, size, size);
          (s.material as THREE.SpriteMaterial).opacity = k < 0.15 ? k / 0.15 : k > 0.7 ? (1 - k) / 0.3 : 1;
          (s.material as THREE.SpriteMaterial).rotation = Math.sin(p.life * 2 + i) * 0.3;
        });
      }
    }
  }

  clear() {
    for (const pool of this.pools.values()) pool.list.length = 0;
  }

  dispose() {
    this.mats.forEach((m) => m.dispose());
  }
}
