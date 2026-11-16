import * as THREE from "three";
import { HEMI_TOP, SPHERE, SPHERE_LO, capsule, cone, cylinder, group, heart, mesh, pointy, star, torus } from "./geo";
import type { Rig } from "./pet-build";
import { knitTexture, stripeTexture } from "./textures";
import type { Accessories, Slot } from "./types";

// Accessories are real meshes parented to the rig's anchors, so they move with the pet.

type Built = { obj: THREE.Object3D; dispose: () => void };

function mats() {
  const list: THREE.Material[] = [];
  const phys = (p: THREE.MeshPhysicalMaterialParameters) => {
    const m = new THREE.MeshPhysicalMaterial(p);
    list.push(m);
    return m;
  };
  const geos: THREE.BufferGeometry[] = [];
  return { phys, list, geos, dispose: () => (list.forEach((m) => m.dispose()), geos.forEach((g) => g.dispose())) };
}

const gold = { color: "#f4c542", metalness: 0.75, roughness: 0.28, clearcoat: 0.6 };

function flower(phys: ReturnType<typeof mats>["phys"], petal: string, size: number) {
  const g = group("flower");
  const pm = phys({ color: petal, roughness: 0.5, sheen: 0.5, sheenColor: new THREE.Color("#ffffff") });
  const cm = phys({ color: "#ffd25a", roughness: 0.5 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.add(mesh(SPHERE_LO(), pm, { pos: [Math.cos(a) * size * 0.9, Math.sin(a) * size * 0.9, 0], scale: [size * 0.75, size * 0.75, size * 0.35] }));
  }
  g.add(mesh(SPHERE_LO(), cm, { pos: [0, 0, size * 0.25], scale: [size * 0.6, size * 0.6, size * 0.35] }));
  return g;
}

function headItem(id: string, rig: Rig): Built | null {
  const r: number = rig.anchors.headTop.userData.r ?? 0.3;
  const M = mats();
  const g = group(`acc-${id}`);
  switch (id) {
    case "bow": {
      const m = M.phys({ color: "#ff7fa8", roughness: 0.45, sheen: 0.8, sheenColor: new THREE.Color("#ffd1e0") });
      const bow = group("bow", [r * 0.42, -r * 0.08, r * 0.15], [0.2, 0, -0.45]);
      for (const s of [1, -1]) bow.add(mesh(pointy(0.35, 1.2), m, { pos: [s * r * 0.2, 0, 0], scale: [r * 0.16, r * 0.24, r * 0.09], rot: [0, 0, s * (Math.PI / 2)] }));
      bow.add(mesh(SPHERE(), m, { scale: [r * 0.09, r * 0.1, r * 0.08] }));
      g.add(bow);
      break;
    }
    case "beanie": {
      const tex = knitTexture("#7fb7e8");
      const m = M.phys({ color: "#ffffff", map: tex, roughness: 0.9, sheen: 1, sheenColor: new THREE.Color("#d6ecff") });
      const rim = M.phys({ color: "#5a9ad6", roughness: 0.9, sheen: 1, sheenColor: new THREE.Color("#cfe6ff") });
      const pom = M.phys({ color: "#ffffff", roughness: 1, sheen: 1, sheenColor: new THREE.Color("#ffffff") });
      g.add(mesh(HEMI_TOP(), m, { pos: [0, -r * 0.42, 0], scale: [r * 1.04, r * 1.0, r * 1.04] }));
      g.add(mesh(torus(1, 0.12), rim, { pos: [0, -r * 0.42, 0], scale: r * 1.0, rot: [Math.PI / 2, 0, 0] }));
      g.add(mesh(SPHERE(), pom, { pos: [0, r * 0.62, 0], scale: r * 0.22 }));
      g.rotation.x = -0.18;
      break;
    }
    case "party": {
      const tex = stripeTexture("#8b68d6", "#ffd25a", 6, true);
      const m = M.phys({ color: "#ffffff", map: tex, roughness: 0.5, clearcoat: 0.4 });
      const pom = M.phys({ color: "#ff7fa8", roughness: 1, sheen: 1, sheenColor: new THREE.Color("#ffffff") });
      const hat = group("party", [r * 0.1, -r * 0.08, 0], [0, 0, -0.22]);
      hat.add(mesh(cone(r * 0.42, r * 1.05, 28), m));
      hat.add(mesh(SPHERE(), pom, { pos: [0, r * 1.07, 0], scale: r * 0.13 }));
      hat.add(mesh(torus(r * 0.41, r * 0.05), pom, { pos: [0, r * 0.02, 0], rot: [Math.PI / 2, 0, 0] }));
      g.add(hat);
      break;
    }
    case "flowers": {
      const leaf = M.phys({ color: "#7cc56a", roughness: 0.6 });
      g.add(mesh(torus(r * 0.78, r * 0.05), leaf, { pos: [0, -r * 0.32, 0], rot: [Math.PI / 2 - 0.15, 0, 0] }));
      const colors = ["#ff8fb1", "#ffffff", "#ffd25a", "#b99cf0", "#ff8fb1", "#8fd0ff", "#ffffff"];
      colors.forEach((c, i) => {
        const a = (i / colors.length) * Math.PI * 2;
        const f = flower(M.phys, c, r * 0.11);
        f.position.set(Math.sin(a) * r * 0.78, -r * 0.32 + Math.cos(a) * r * 0.12, Math.cos(a) * r * 0.78);
        f.lookAt(f.position.clone().multiplyScalar(2));
        g.add(f);
      });
      break;
    }
    case "tophat": {
      const m = M.phys({ color: "#2f2a36", roughness: 0.35, sheen: 0.6, sheenColor: new THREE.Color("#6a6080"), clearcoat: 0.3 });
      const band = M.phys({ color: "#e86a7a", roughness: 0.5 });
      const hat = group("tophat", [r * 0.12, -r * 0.05, 0], [0.05, 0, -0.18]);
      hat.add(mesh(cylinder(r * 0.78, r * 0.78, r * 0.06, 32), m));
      hat.add(mesh(cylinder(r * 0.48, r * 0.5, r * 0.75, 32), m, { pos: [0, r * 0.4, 0] }));
      hat.add(mesh(cylinder(r * 0.505, r * 0.505, r * 0.14, 32), band, { pos: [0, r * 0.12, 0] }));
      g.add(hat);
      break;
    }
    case "crown": {
      const m = M.phys(gold);
      const gem = M.phys({ color: "#ff5c8a", roughness: 0.1, clearcoat: 1, transmission: 0.2 });
      const gem2 = M.phys({ color: "#5cb8ff", roughness: 0.1, clearcoat: 1 });
      const c = group("crown", [0, -r * 0.05, 0], [-0.1, 0, 0.12]);
      c.add(mesh(cylinder(r * 0.5, r * 0.52, r * 0.24, 32, true), m));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        c.add(mesh(cone(r * 0.11, r * 0.24, 10), m, { pos: [Math.sin(a) * r * 0.5, r * 0.1, Math.cos(a) * r * 0.5] }));
        c.add(mesh(SPHERE_LO(), m, { pos: [Math.sin(a) * r * 0.5, r * 0.36, Math.cos(a) * r * 0.5], scale: r * 0.04 }));
        c.add(mesh(SPHERE_LO(), i % 2 ? gem : gem2, { pos: [Math.sin(a) * r * 0.52, 0, Math.cos(a) * r * 0.52], scale: r * 0.055 }));
      }
      g.add(c);
      break;
    }
    case "sunhat": {
      const straw = M.phys({ color: "#f3d79a", roughness: 0.8, sheen: 0.6, sheenColor: new THREE.Color("#fff3d0") });
      const ribbon = M.phys({ color: "#ff8fb1", roughness: 0.5 });
      const hat = group("sunhat", [0, -r * 0.2, 0], [-0.15, 0, 0.12]);
      hat.add(mesh(cylinder(r * 1.35, r * 1.4, r * 0.05, 40), straw));
      hat.add(mesh(HEMI_TOP(), straw, { scale: [r * 0.66, r * 0.55, r * 0.66] }));
      hat.add(mesh(cylinder(r * 0.665, r * 0.665, r * 0.1, 32), ribbon, { pos: [0, r * 0.05, 0] }));
      const f = flower(M.phys, "#ffffff", r * 0.1);
      f.position.set(r * 0.5, r * 0.15, r * 0.4);
      f.lookAt(new THREE.Vector3(r * 2, r * 0.3, r * 1.6));
      hat.add(f);
      g.add(hat);
      break;
    }
    default:
      M.dispose();
      return null;
  }
  rig.anchors.headTop.add(g);
  return { obj: g, dispose: M.dispose };
}

function faceItem(id: string, rig: Rig): Built | null {
  const a = rig.anchors.face;
  const ex: number = a.userData.eyeX ?? 0.12;
  const er: number = a.userData.eyeR ?? 0.07;
  const hr: number = a.userData.headR ?? 0.3;
  const M = mats();
  const g = group(`acc-${id}`);
  const z = er * 0.75;
  const frameMat = M.phys(id === "round" ? { color: "#3a2f3a", roughness: 0.3, clearcoat: 0.6 } : id === "stars" ? { color: "#ffcf3a", roughness: 0.3, clearcoat: 0.8 } : { color: "#ff6f9e", roughness: 0.3, clearcoat: 0.8 });
  const lensMat = M.phys(
    id === "round"
      ? { color: "#d8f0ff", transparent: true, opacity: 0.25, roughness: 0.05, clearcoat: 1, depthWrite: false }
      : { color: id === "stars" ? "#4a3a6a" : "#8a2f5a", transparent: true, opacity: 0.72, roughness: 0.05, clearcoat: 1 },
  );
  for (const s of [1, -1]) {
    const lens = group("lens", [s * ex, 0, z]);
    lens.rotation.y = s * 0.28;
    if (id === "round") {
      lens.add(mesh(torus(er * 1.35, er * 0.14), frameMat, { shadow: false }));
      lens.add(mesh(SPHERE_LO(), lensMat, { scale: [er * 1.3, er * 1.3, er * 0.08], shadow: false }));
    } else if (id === "stars") {
      lens.add(mesh(star(5, 0.5, 0.24, 0.05), frameMat, { scale: er * 3.2, shadow: false }));
      lens.add(mesh(star(5, 0.4, 0.18, 0.02), lensMat, { pos: [0, 0, er * 0.12], scale: er * 3.2, shadow: false }));
    } else {
      lens.add(mesh(heart(), frameMat, { scale: [er * 2.9, er * 2.9, er * 0.5], shadow: false }));
      lens.add(mesh(heart(), lensMat, { pos: [0, 0, er * 0.1], scale: [er * 2.4, er * 2.4, er * 0.4], shadow: false }));
    }
    g.add(lens);
    // Arms back to the ears
    const arm = mesh(cylinder(er * 0.08, er * 0.08, hr * 0.9, 6), frameMat, { shadow: false });
    arm.position.set(s * (ex + er * 1.3), 0, z - hr * 0.42);
    arm.rotation.x = Math.PI / 2;
    arm.rotation.z = s * 0.25;
    g.add(arm);
  }
  const bridge = mesh(torus(ex * 0.38, er * 0.1, Math.PI), frameMat, { pos: [0, er * 0.15, z + er * 0.2], shadow: false });
  g.add(bridge);
  a.add(g);
  return { obj: g, dispose: M.dispose };
}

function neckItem(id: string, rig: Rig): Built | null {
  const R: number = rig.anchors.neck.userData.radius ?? 0.2;
  const M = mats();
  const g = group(`acc-${id}`);
  const ring = (mat: THREE.Material, tube: number, scale = 1) => mesh(torus(R * scale, tube), mat, { rot: [Math.PI / 2, 0, 0] });
  switch (id) {
    case "collar":
    case "bell": {
      const m = M.phys({ color: id === "collar" ? "#e8505b" : "#4b9fe1", roughness: 0.45, clearcoat: 0.3 });
      g.add(ring(m, R * 0.13));
      const metal = M.phys(gold);
      if (id === "collar") {
        g.add(mesh(torus(R * 0.07, R * 0.02), metal, { pos: [0, -R * 0.06, R * 1.08] }));
        g.add(mesh(cylinder(R * 0.17, R * 0.17, R * 0.04, 20), metal, { pos: [0, -R * 0.27, R * 1.1], rot: [Math.PI / 2, 0, 0] }));
      } else {
        g.add(mesh(SPHERE(), metal, { pos: [0, -R * 0.16, R * 1.1], scale: R * 0.2 }));
        g.add(mesh(cylinder(R * 0.02, R * 0.02, R * 0.3, 6), M.phys({ color: "#5a4a20" }), { pos: [0, -R * 0.22, R * 1.29], rot: [Math.PI / 2, 0, 0], shadow: false }));
      }
      break;
    }
    case "bandana": {
      const m = M.phys({ color: "#ffffff", map: stripeTexture("#ef6a55", "#f9a28f", 10), roughness: 0.7, sheen: 0.6, sheenColor: new THREE.Color("#ffd0c8") });
      g.add(ring(m, R * 0.1, 1.02));
      const tri = mesh(pointy(0.05, 1.1, 16), m, { pos: [0, -R * 0.35, R * 0.9], scale: [R * 0.55, R * 0.48, R * 0.14], rot: [Math.PI + 0.35, 0, 0] });
      g.add(tri);
      break;
    }
    case "scarf": {
      const tex = stripeTexture("#f2b437", "#ef7d67", 8, true);
      const m = M.phys({ color: "#ffffff", map: tex, roughness: 0.95, sheen: 1, sheenColor: new THREE.Color("#fff0d8") });
      g.add(ring(m, R * 0.22, 1.02));
      const tail1 = mesh(capsule(R * 0.17, R * 0.75), m, { pos: [R * 0.55, -R * 0.55, R * 0.85], rot: [0.35, 0, 0.25] });
      const tail2 = mesh(capsule(R * 0.16, R * 0.55), m, { pos: [R * 0.85, -R * 0.4, R * 0.65], rot: [0.25, 0, 0.55] });
      g.add(tail1, tail2);
      break;
    }
    case "bowtie": {
      const m = M.phys({ color: "#8b68d6", roughness: 0.45, sheen: 0.8, sheenColor: new THREE.Color("#e3d6ff") });
      g.add(ring(M.phys({ color: "#ffffff", roughness: 0.6 }), R * 0.07, 1.0));
      const bt = group("bt", [0, -R * 0.05, R * 1.08]);
      for (const s of [1, -1]) bt.add(mesh(pointy(0.2, 1.3), m, { pos: [s * R * 0.25, 0, 0], scale: [R * 0.18, R * 0.3, R * 0.1], rot: [0, 0, s * (Math.PI / 2)] }));
      bt.add(mesh(SPHERE(), m, { scale: R * 0.1 }));
      g.add(bt);
      break;
    }
    default:
      M.dispose();
      return null;
  }
  rig.anchors.neck.add(g);
  return { obj: g, dispose: M.dispose };
}

function bodyItem(id: string, rig: Rig): Built | null {
  const radii: [number, number, number] = rig.anchors.wrap.userData.radii ?? [0.3, 0.3, 0.4];
  const upright = !!rig.anchors.wrap.userData.upright;
  const M = mats();
  const g = group(`acc-${id}`);
  const [rx, ry, rz] = radii;
  const band = (mat: THREE.Material, from: number, len: number, grow = 1.08) => {
    const geo = new THREE.SphereGeometry(1, 40, 18, 0, Math.PI * 2, from, len);
    M.geos.push(geo);
    const m = mesh(geo, mat, {});
    if (upright) m.scale.set(rx * grow, ry * grow, rz * grow);
    else {
      m.rotation.x = Math.PI / 2;
      m.scale.set(rx * grow, rz * grow, ry * grow);
    }
    return m;
  };
  switch (id) {
    case "sweater":
    case "hoodie": {
      const isSweater = id === "sweater";
      const m = isSweater
        ? M.phys({ color: "#ffffff", map: knitTexture("#e86a9a"), roughness: 0.9, sheen: 1, sheenColor: new THREE.Color("#ffd6e6") })
        : M.phys({ color: "#ffd23f", roughness: 0.25, clearcoat: 0.9, clearcoatRoughness: 0.15 });
      const trim = isSweater ? M.phys({ color: "#c94f80", roughness: 0.9, sheen: 1, sheenColor: new THREE.Color("#ffc4dc") }) : M.phys({ color: "#f2a93b", roughness: 0.4, clearcoat: 0.6 });
      const from = upright ? 0.95 : 0.5;
      const len = upright ? 1.25 : 1.55;
      g.add(band(m, from, len));
      for (const edge of [from, from + len]) {
        const k = upright ? ry : rz;
        const off = Math.cos(edge) * k * 1.08;
        const rad = Math.sin(edge) * 1.08;
        const t = mesh(torus(1, 0.06), trim, {});
        if (upright) {
          t.rotation.x = Math.PI / 2;
          t.position.y = off;
          t.scale.set(rx * rad, rz * rad, 1);
        } else {
          t.position.z = off;
          t.scale.set(rx * rad, ry * rad, 1);
        }
        g.add(t);
      }
      if (!isSweater) {
        const btn = M.phys({ color: "#ffffff", roughness: 0.3, clearcoat: 1 });
        for (let i = 0; i < 3; i++) {
          const p = upright ? new THREE.Vector3(0, (i - 1) * ry * 0.3, rz * 1.09) : new THREE.Vector3(0, -ry * 0.55, (i - 0.5) * rz * 0.35);
          if (!upright) p.y = -Math.sqrt(Math.max(0, 1 - (p.z / (rz * 1.09)) ** 2)) * ry * 1.06;
          g.add(mesh(SPHERE_LO(), btn, { pos: [p.x, p.y, p.z], scale: Math.min(rx, ry) * 0.07 }));
        }
      }
      break;
    }
    case "cape": {
      const m = M.phys({ color: "#e8505b", roughness: 0.55, sheen: 1, sheenColor: new THREE.Color("#ffb3b9"), side: THREE.DoubleSide });
      const clasp = M.phys(gold);
      const geo = new THREE.CylinderGeometry(1, 1.15, 1, 28, 6, true, Math.PI * 0.6, Math.PI * 0.8);
      M.geos.push(geo);
      const cape = mesh(geo, m, {});
      if (upright) {
        cape.scale.set(rx * 1.2, ry * 1.5, rz * 1.25);
        cape.position.set(0, -ry * 0.1, 0);
        cape.rotation.y = 0;
      } else {
        cape.rotation.x = Math.PI / 2;
        cape.rotation.y = 0;
        cape.scale.set(rx * 1.22, rz * 1.5, ry * 1.25);
        cape.position.set(0, 0, -rz * 0.15);
        // Open the cylinder towards the floor.
        cape.rotateY(Math.PI);
      }
      g.add(cape);
      g.add(mesh(SPHERE(), clasp, { pos: upright ? [0, ry * 0.65, rz * 0.7] : [0, ry * 0.75, rz * 0.62], scale: Math.min(rx, ry) * 0.12 }));
      g.userData.sway = cape;
      break;
    }
    case "tutu": {
      const m = M.phys({ color: "#ffb3d1", roughness: 0.5, transparent: true, opacity: 0.9, side: THREE.DoubleSide, sheen: 1, sheenColor: new THREE.Color("#ffffff") });
      const geo = new THREE.CylinderGeometry(1, 1.55, 0.25, 48, 1, true);
      const p = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i);
        if (y < 0) {
          const a = Math.atan2(p.getZ(i), p.getX(i));
          const k = 1 + Math.sin(a * 12) * 0.08;
          p.setX(i, p.getX(i) * k);
          p.setZ(i, p.getZ(i) * k);
          p.setY(i, y + Math.cos(a * 12) * 0.03);
        }
      }
      geo.computeVertexNormals();
      M.geos.push(geo);
      for (let layer = 0; layer < 2; layer++) {
        const t = mesh(geo, m, {});
        if (upright) {
          t.scale.set(rx * (1.0 + layer * 0.08), 0.5, rz * (1.0 + layer * 0.08));
          t.position.y = -ry * (0.15 + layer * 0.08);
        } else {
          t.rotation.x = -Math.PI / 2;
          t.scale.set(rx * (1.02 + layer * 0.08), 0.6, ry * (1.02 + layer * 0.08));
          t.position.z = -rz * (0.25 + layer * 0.12);
        }
        g.add(t);
      }
      break;
    }
    default:
      M.dispose();
      return null;
  }
  rig.anchors.wrap.add(g);
  return { obj: g, dispose: M.dispose };
}

const BY_SLOT: Record<Slot, (id: string, rig: Rig) => Built | null> = { head: headItem, face: faceItem, neck: neckItem, body: bodyItem };

/** Attaches the chosen accessories and returns a function that removes them again. */
export function dressRig(rig: Rig, acc: Accessories) {
  const built: Built[] = [];
  for (const slot of Object.keys(acc) as Slot[]) {
    const id = acc[slot];
    if (!id) continue;
    const b = BY_SLOT[slot](id, rig);
    if (b) {
      b.obj.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.userData.part = slot === "head" ? "head" : slot === "face" ? "head" : "back";
      });
      built.push(b);
    }
  }
  return () => {
    for (const b of built) {
      b.obj.removeFromParent();
      b.dispose();
    }
  };
}
