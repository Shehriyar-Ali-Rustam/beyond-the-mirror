"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { SPHERE, SPHERE_LO, cone, cylinder, lathe, pointy, rbox, star, torus } from "./geo";
import { LAYOUTS, ROOM_D, ROOM_W, TANK, WALL_H } from "./layouts";
import { floorTexture, gradientTexture, groundTexture, radialTexture, seeded, stripeTexture, wallTexture, waterTexture, woodTexture } from "./textures";
import type { Decor, Lighting, RoomId } from "./types";
import type { World } from "./world";

// ---------------------------------------------------------------------------
// Tiny helpers: cached materials and primitive components
// ---------------------------------------------------------------------------

const matCache = new Map<string, THREE.Material>();
export function M(color: string, rough = 0.7, o: { metal?: number; emissive?: string; ei?: number; cc?: number; map?: THREE.Texture; opacity?: number; side?: THREE.Side; key?: string } = {}) {
  const key = `${color}:${rough}:${o.metal ?? 0}:${o.emissive ?? ""}:${o.ei ?? 0}:${o.cc ?? 0}:${o.map?.uuid ?? ""}:${o.opacity ?? 1}:${o.side ?? 0}:${o.key ?? ""}`;
  let m = matCache.get(key);
  if (!m) {
    const p: THREE.MeshPhysicalMaterialParameters = { color, roughness: rough, metalness: o.metal ?? 0 };
    if (o.emissive) {
      p.emissive = new THREE.Color(o.emissive);
      p.emissiveIntensity = o.ei ?? 1;
    }
    if (o.cc) {
      p.clearcoat = o.cc;
      p.clearcoatRoughness = 0.2;
    }
    if (o.map) p.map = o.map;
    if (o.opacity !== undefined && o.opacity < 1) {
      p.transparent = true;
      p.opacity = o.opacity;
      p.depthWrite = false;
    }
    if (o.side !== undefined) p.side = o.side;
    m = o.cc ? new THREE.MeshPhysicalMaterial(p) : new THREE.MeshStandardMaterial(p);
    matCache.set(key, m);
  }
  return m;
}

type V3 = [number, number, number];

function Box({ s, p, r = 0.05, c, rot, m, cast = true, rough }: { s: V3; p: V3; r?: number; c?: string; rot?: V3; m?: THREE.Material; cast?: boolean; rough?: number }) {
  return <mesh geometry={rbox(s[0], s[1], s[2], r)} material={m ?? M(c ?? "#ffffff", rough ?? 0.7)} position={p} rotation={rot} castShadow={cast} receiveShadow />;
}

function Ball({ r, p, c, s, m, cast = true }: { r: number; p: V3; c?: string; s?: V3; m?: THREE.Material; cast?: boolean }) {
  return <mesh geometry={SPHERE()} material={m ?? M(c ?? "#ffffff")} position={p} scale={s ? [s[0] * r, s[1] * r, s[2] * r] : r} castShadow={cast} receiveShadow />;
}

function Cyl({ rt, rb, h, p, c, m, rot, seg = 24, cast = true }: { rt: number; rb?: number; h: number; p: V3; c?: string; m?: THREE.Material; rot?: V3; seg?: number; cast?: boolean }) {
  return <mesh geometry={cylinder(rt, rb ?? rt, h, seg)} material={m ?? M(c ?? "#ffffff")} position={p} rotation={rot} castShadow={cast} receiveShadow />;
}

function Plant({ p, s = 1, pot = "#e8957a", leaf = "#6fbf7f" }: { p: V3; s?: number; pot?: string; leaf?: string }) {
  const leaves = useMemo(() => {
    const r = seeded(Math.round(p[0] * 100 + p[2] * 7));
    return Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2 + r();
      return { a, tilt: 0.45 + r() * 0.5, len: 0.35 + r() * 0.2 };
    });
  }, [p]);
  return (
    <group position={p} scale={s}>
      <mesh geometry={lathe("pot", [[0.001, 0], [0.22, 0.02], [0.27, 0.42], [0.3, 0.48], [0.001, 0.48]])} material={M(pot, 0.6)} castShadow receiveShadow />
      <Ball r={0.25} p={[0, 0.47, 0]} s={[1, 0.15, 1]} c="#6b4a35" cast={false} />
      {leaves.map((l, i) => (
        <group key={i} position={[0, 0.48, 0]} rotation={[0, l.a, 0]}>
          <mesh geometry={pointy(0.15, 1.3)} material={M(leaf, 0.6)} position={[0, l.len * 0.5, l.len * 0.35]} rotation={[l.tilt, 0, 0]} scale={[0.11, l.len, 0.035]} castShadow />
        </group>
      ))}
    </group>
  );
}

function Window({ p, w = 1.6, h = 1.5, lighting, curtain = "#f6c8d4" }: { p: V3; w?: number; h?: number; lighting: Lighting; curtain?: string }) {
  const sky = useMemo(() => {
    if (lighting === "night") return gradientTexture([[0, "#1d2450"], [1, "#3d4a86"]], "win-night");
    if (lighting === "evening") return gradientTexture([[0, "#ff9e7a"], [0.6, "#ffcf9a"], [1, "#ffe7b8"]], "win-eve");
    return gradientTexture([[0, "#8cc8f5"], [1, "#d6eeff"]], "win-day");
  }, [lighting]);
  const glass = useMemo(() => new THREE.MeshBasicMaterial({ map: sky, toneMapped: false }), [sky]);
  return (
    <group position={p}>
      <Box s={[w + 0.2, h + 0.2, 0.1]} p={[0, 0, -0.02]} c="#ffffff" r={0.04} cast={false} />
      <mesh position={[0, 0, 0.035]} material={glass}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {lighting === "night" && (
        <>
          <mesh geometry={SPHERE_LO()} material={M("#fff4c2", 1, { emissive: "#fff4c2", ei: 1.5 })} position={[w * 0.25, h * 0.22, 0.05]} scale={[0.14, 0.14, 0.02]} />
          {[[-0.4, 0.3], [-0.1, 0.45], [0.2, -0.1], [-0.5, -0.2], [0.45, -0.35]].map(([x, y], i) => (
            <mesh key={i} geometry={SPHERE_LO()} material={M("#ffffff", 1, { emissive: "#ffffff", ei: 2 })} position={[x * w, y * h, 0.05]} scale={0.018} />
          ))}
        </>
      )}
      {lighting === "day" && (
        <>
          <Ball r={0.16} p={[-w * 0.2, h * 0.15, 0.05]} s={[1.4, 0.6, 0.2]} c="#ffffff" cast={false} />
          <Ball r={0.12} p={[-w * 0.08, h * 0.2, 0.05]} s={[1.2, 0.7, 0.2]} c="#ffffff" cast={false} />
        </>
      )}
      <Box s={[0.06, h, 0.05]} p={[0, 0, 0.06]} c="#ffffff" r={0.02} cast={false} />
      <Box s={[w, 0.06, 0.05]} p={[0, 0, 0.06]} c="#ffffff" r={0.02} cast={false} />
      <Box s={[w + 0.4, 0.08, 0.25]} p={[0, -h / 2 - 0.12, 0.1]} c="#ffffff" r={0.03} />
      {/* Curtains */}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={rbox(0.38, h + 0.5, 0.12, 0.06)} material={M(curtain, 0.9)} position={[s * (w / 2 + 0.18), 0.05, 0.12]} castShadow />
      ))}
      <Cyl rt={0.03} h={w + 1.1} p={[0, h / 2 + 0.32, 0.14]} rot={[0, 0, Math.PI / 2]} c="#c9a170" />
    </group>
  );
}

function Frame({ p, w = 0.7, h = 0.55, c = "#9fc7e8", art = "#ffd25a" }: { p: V3; w?: number; h?: number; c?: string; art?: string }) {
  return (
    <group position={p}>
      <Box s={[w, h, 0.06]} p={[0, 0, 0]} c="#ffffff" r={0.03} cast={false} />
      <mesh position={[0, 0, 0.032]} material={M(c, 0.9)}>
        <planeGeometry args={[w - 0.12, h - 0.12]} />
      </mesh>
      <mesh geometry={SPHERE_LO()} material={M(art, 0.8)} position={[w * 0.12, h * 0.08, 0.04]} scale={[w * 0.18, w * 0.18, 0.01]} />
      <mesh geometry={pointy(0.05, 1)} material={M("#7cc56a", 0.8)} position={[-w * 0.15, -h * 0.12, 0.04]} scale={[w * 0.22, h * 0.25, 0.01]} />
    </group>
  );
}

function Lamp({ p, lighting, shade = "#fff1c9", h = 1.7 }: { p: V3; lighting: Lighting; shade?: string; h?: number }) {
  const on = lighting !== "day";
  return (
    <group position={p}>
      <Cyl rt={0.2} rb={0.24} h={0.05} p={[0, 0.025, 0]} c="#c9a170" />
      <Cyl rt={0.025} h={h} p={[0, h / 2, 0]} c="#c9a170" seg={10} />
      <mesh geometry={cylinder(0.2, 0.32, 0.38, 28, true)} material={M(shade, 0.8, { emissive: on ? "#ffcf80" : undefined, ei: on ? 1.2 : 0, side: THREE.DoubleSide })} position={[0, h + 0.1, 0]} castShadow />
      {on && <pointLight position={[0, h - 0.05, 0.1]} intensity={lighting === "night" ? 5 : 3.5} distance={7} decay={1.6} color="#ffbe7a" />}
    </group>
  );
}

function Rug({ p, rx, rz, c, c2 }: { p: V3; rx: number; rz: number; c: string; c2: string }) {
  return (
    <group position={p}>
      <mesh geometry={cylinder(1, 1, 0.02, 48)} material={M(c, 0.95)} scale={[rx, 1, rz]} receiveShadow />
      <mesh geometry={torus(1, 0.02)} material={M(c2, 0.95)} scale={[rx * 0.85, rz * 0.85, 1]} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow />
    </group>
  );
}

function PetBed({ p, c = "#f4a6b8", inner = "#fff3f6", s = 1 }: { p: V3; c?: string; inner?: string; s?: number }) {
  return (
    <group position={p} scale={s}>
      <mesh geometry={torus(0.55, 0.2)} material={M(c, 0.95)} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.17, 0]} scale={[1, 0.9, 0.9]} castShadow receiveShadow />
      <mesh geometry={cylinder(0.6, 0.6, 0.12, 36)} material={M(inner, 0.95)} position={[0, 0.07, 0]} receiveShadow />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Room shell
// ---------------------------------------------------------------------------

function Shell({ decor, wallTint }: { decor: Decor; wallTint?: string }) {
  const wall = wallTexture(decor.wall);
  const floor = floorTexture(decor.floor);
  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ map: wall, color: wallTint ?? "#ffffff", roughness: 0.92 }), [wall, wallTint]);
  const sideMat = useMemo(() => new THREE.MeshStandardMaterial({ map: wall, color: "#f2ece6", roughness: 0.92 }), [wall]);
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({ map: floor, roughness: 0.75 }), [floor]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={floorMat}>
        <planeGeometry args={[ROOM_W, ROOM_D + 2]} />
      </mesh>
      <mesh position={[0, WALL_H / 2, -ROOM_D / 2]} receiveShadow material={wallMat}>
        <planeGeometry args={[ROOM_W, WALL_H]} />
      </mesh>
      <mesh position={[-ROOM_W / 2, WALL_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow material={sideMat}>
        <planeGeometry args={[ROOM_D + 2, WALL_H]} />
      </mesh>
      <mesh position={[ROOM_W / 2, WALL_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow material={sideMat}>
        <planeGeometry args={[ROOM_D + 2, WALL_H]} />
      </mesh>
      {/* Skirting boards */}
      <Box s={[ROOM_W, 0.16, 0.06]} p={[0, 0.08, -ROOM_D / 2 + 0.03]} c="#ffffff" r={0.02} cast={false} />
      <Box s={[0.06, 0.16, ROOM_D + 2]} p={[-ROOM_W / 2 + 0.03, 0.08, 0]} c="#ffffff" r={0.02} cast={false} />
      <Box s={[0.06, 0.16, ROOM_D + 2]} p={[ROOM_W / 2 - 0.03, 0.08, 0]} c="#ffffff" r={0.02} cast={false} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Indoor rooms
// ---------------------------------------------------------------------------

function Living({ lighting }: { lighting: Lighting }) {
  const sofa = "#8fbfa8";
  const sofaD = "#7aae96";
  return (
    <group>
      <Window p={[1.6, 2.25, -2.98]} lighting={lighting} />
      <Frame p={[-1.6, 2.5, -2.96]} w={0.9} h={0.65} c="#fde2c8" art="#ef7d67" />
      <Frame p={[-2.75, 2.35, -2.96]} w={0.5} h={0.6} c="#d6ecff" art="#4b9fe1" />
      <Frame p={[-0.55, 2.3, -2.96]} w={0.5} h={0.5} c="#e3f5e9" art="#f2b437" />
      {/* Sofa */}
      <group position={[-1.6, 0, -2.4]}>
        <Box s={[2.7, 0.42, 1.0]} p={[0, 0.33, 0]} c={sofaD} r={0.12} />
        <Box s={[2.7, 0.85, 0.3]} p={[0, 0.78, -0.38]} c={sofa} r={0.14} />
        <Box s={[0.32, 0.62, 1.0]} p={[-1.34, 0.55, 0]} c={sofa} r={0.14} />
        <Box s={[0.32, 0.62, 1.0]} p={[1.34, 0.55, 0]} c={sofa} r={0.14} />
        <Box s={[1.15, 0.2, 0.78]} p={[-0.58, 0.62, 0.08]} c="#a3cdb8" r={0.09} />
        <Box s={[1.15, 0.2, 0.78]} p={[0.58, 0.62, 0.08]} c="#a3cdb8" r={0.09} />
        <Box s={[0.5, 0.45, 0.16]} p={[-0.8, 0.95, -0.15]} rot={[-0.2, 0, 0.12]} c="#f2b437" r={0.07} />
        <Box s={[0.5, 0.45, 0.16]} p={[0.85, 0.95, -0.15]} rot={[-0.2, 0, -0.1]} c="#ef9a8a" r={0.07} />
        {[-1.2, 1.2].map((x) => [-0.35, 0.35].map((z) => <Cyl key={`${x}${z}`} rt={0.05} h={0.14} p={[x, 0.07, z]} c="#8a6a50" seg={10} />))}
      </group>
      <Rug p={[0.3, 0.01, 0.2]} rx={2.5} rz={1.6} c="#f6dcc6" c2="#ef9a8a" />
      <Lamp p={[-3.85, 0, -2.45]} lighting={lighting} />
      <Plant p={[3.75, 0, -2.4]} s={1.6} />
      <PetBed p={[2.35, 0, -1.55]} />
      {/* Side table with books */}
      <group position={[0.35, 0, -2.6]}>
        <Cyl rt={0.35} h={0.05} p={[0, 0.62, 0]} c="#e8c99c" />
        <Cyl rt={0.04} h={0.6} p={[0, 0.3, 0]} c="#c9a170" seg={10} />
        <Box s={[0.32, 0.07, 0.22]} p={[0, 0.69, 0]} c="#4b9fe1" r={0.02} />
        <Box s={[0.28, 0.07, 0.2]} p={[0.02, 0.76, 0]} c="#ef7d67" r={0.02} />
        <Ball r={0.07} p={[0.15, 0.72, 0.15]} c="#ffd25a" />
      </group>
    </group>
  );
}

function Bedroom({ lighting }: { lighting: Lighting }) {
  return (
    <group>
      <Window p={[1.2, 2.3, -2.98]} lighting={lighting} curtain="#cdb8f0" />
      <Frame p={[-2.9, 2.65, -2.96]} w={0.8} h={0.5} c="#fbe3ea" art="#e86a9a" />
      {/* Bed */}
      <group position={[-2.85, 0, -1.75]}>
        <Box s={[2.3, 0.4, 2.6]} p={[0, 0.25, 0]} c="#d9b98f" r={0.1} />
        <Box s={[2.2, 0.28, 2.5]} p={[0, 0.58, 0]} c="#ffffff" r={0.12} />
        <Box s={[2.26, 0.14, 1.65]} p={[0, 0.74, 0.45]} c="#f4a6c0" r={0.07} />
        <Box s={[2.26, 0.04, 0.3]} p={[0, 0.82, -0.25]} c="#ffffff" r={0.02} />
        <Box s={[0.8, 0.22, 0.45]} p={[-0.5, 0.82, -0.85]} c="#fff6fa" r={0.1} />
        <Box s={[0.8, 0.22, 0.45]} p={[0.5, 0.82, -0.85]} c="#fff6fa" r={0.1} />
        <Box s={[2.4, 1.35, 0.16]} p={[0, 0.75, -1.3]} c="#c9a7e8" r={0.08} />
        <Ball r={0.16} p={[0.6, 0.98, -0.4]} c="#f7f1e6" />
        <Ball r={0.09} p={[0.6, 1.17, -0.4]} c="#f7f1e6" />
      </group>
      <group position={[-0.95, 0, -2.55]}>
        <Box s={[0.6, 0.6, 0.5]} p={[0, 0.3, 0]} c="#ffffff" r={0.06} />
        <Ball r={0.035} p={[0, 0.35, 0.26]} c="#f2b437" />
        <Lamp p={[0, 0.6, 0]} lighting={lighting} h={0.35} shade="#ffe2ef" />
      </group>
      {/* Wardrobe */}
      <group position={[3.55, 0, -2.4]}>
        <Box s={[1.4, 2.6, 0.9]} p={[0, 1.3, 0]} c="#f5efe6" r={0.08} />
        <Box s={[0.02, 2.3, 0.02]} p={[0, 1.35, 0.46]} c="#d8cfc2" r={0.01} cast={false} />
        <Ball r={0.04} p={[-0.12, 1.4, 0.47]} c="#c9a170" />
        <Ball r={0.04} p={[0.12, 1.4, 0.47]} c="#c9a170" />
        <Plant p={[0.2, 2.6, 0]} s={0.7} pot="#9fc7e8" />
      </group>
      <Rug p={[0.6, 0.01, 0.4]} rx={2.2} rz={1.5} c="#efe4fb" c2="#c9a7e8" />
      <PetBed p={[0.9, 0, -1.5]} c="#c9a7e8" inner="#f6f0ff" />
      {/* Star garland */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} geometry={star(5, 0.5, 0.22, 0.06)} material={M("#ffd25a", 0.5, { emissive: "#ffcf4a", ei: lighting === "day" ? 0.2 : 1.1 })} position={[-0.9 + i * 0.55, 3.55 - Math.sin((i / 6) * Math.PI) * 0.25, -2.94]} scale={0.18} />
      ))}
    </group>
  );
}

function Kitchen({ lighting, world }: { lighting: Lighting; world: React.RefObject<World | null> }) {
  const door = useRef<THREE.Group>(null);
  const glow = useRef<THREE.PointLight>(null);
  useFrame(() => {
    const w = world.current;
    if (!w) return;
    if (door.current) door.current.rotation.y = -w.fridgeOpen * 1.7;
    if (glow.current) glow.current.intensity = w.fridgeOpen * 3;
  });
  const cab = "#ffffff";
  return (
    <group>
      <Window p={[-1.6, 2.35, -2.98]} lighting={lighting} w={1.4} h={1.1} curtain="#ffd7a8" />
      {/* Counters */}
      <group position={[-1.7, 0, -2.5]}>
        <Box s={[4.1, 1.0, 0.95]} p={[0, 0.5, 0]} c={cab} r={0.05} />
        <Box s={[4.2, 0.09, 1.02]} p={[0, 1.04, 0.02]} c="#f2d9b6" r={0.03} />
        {[-1.5, -0.5, 0.5, 1.5].map((x) => (
          <group key={x}>
            <Box s={[0.9, 0.78, 0.03]} p={[x, 0.5, 0.48]} c="#fbf6ef" r={0.03} cast={false} />
            <Box s={[0.18, 0.04, 0.04]} p={[x, 0.8, 0.51]} c="#c9a170" r={0.015} cast={false} />
          </group>
        ))}
        <Box s={[4.1, 0.85, 0.5]} p={[0, 2.85, -0.2]} c="#cdeedd" r={0.05} />
        {[-1.5, -0.5, 0.5, 1.5].map((x) => (
          <Ball key={x} r={0.035} p={[x + 0.3, 2.62, 0.07]} c="#c9a170" />
        ))}
        {/* Sink and tap */}
        <Box s={[0.9, 0.06, 0.6]} p={[0.1, 1.08, 0]} c="#dfe7ea" r={0.03} cast={false} />
        <Cyl rt={0.03} h={0.35} p={[0.1, 1.25, -0.3]} c="#cfd8dc" seg={10} />
        <Cyl rt={0.025} h={0.25} p={[0.1, 1.42, -0.2]} rot={[Math.PI / 2, 0, 0]} c="#cfd8dc" seg={10} />
        {/* Kettle and fruit */}
        <Ball r={0.18} p={[1.4, 1.25, -0.1]} s={[1, 0.9, 1]} c="#ef7d67" />
        <Cyl rt={0.3} rb={0.2} h={0.12} p={[-1.3, 1.15, -0.05]} c="#9fc7e8" />
        <Ball r={0.09} p={[-1.35, 1.27, -0.05]} c="#ef5a6a" />
        <Ball r={0.09} p={[-1.2, 1.27, 0]} c="#f2b437" />
        <Ball r={0.08} p={[-1.28, 1.33, -0.12]} c="#7cc56a" />
      </group>
      {/* Fridge with an opening door */}
      <group position={[3.3, 0, -2.4]}>
        <Box s={[1.3, 2.4, 0.95]} p={[0, 1.2, 0]} c="#bfe6d5" r={0.14} />
        <Box s={[1.18, 2.24, 0.1]} p={[0, 1.2, 0.44]} c="#ffffff" r={0.04} cast={false} />
        {[0.6, 1.1, 1.6].map((y) => (
          <Box key={y} s={[1.1, 0.03, 0.75]} p={[0, y, 0.05]} c="#e6f4ff" r={0.01} cast={false} />
        ))}
        <Ball r={0.1} p={[-0.3, 0.72, 0.2]} c="#ef5a6a" />
        <Ball r={0.11} p={[0.2, 0.72, 0.15]} c="#f2b437" />
        <Box s={[0.25, 0.3, 0.25]} p={[-0.2, 1.27, 0.2]} c="#9fc7e8" r={0.05} />
        <Ball r={0.12} p={[0.25, 1.22, 0.15]} s={[1, 0.8, 1]} c="#7cc56a" />
        <Cyl rt={0.12} h={0.25} p={[0.2, 1.72, 0.1]} c="#ffffff" />
        <pointLight ref={glow} position={[0, 1.3, 0.6]} intensity={0} distance={3} color="#e8f6ff" />
        <group ref={door} position={[-0.65, 0, 0.5]}>
          <Box s={[1.3, 2.4, 0.12]} p={[0.65, 1.2, 0]} c="#a8dcc6" r={0.08} />
          <Box s={[0.07, 0.8, 0.07]} p={[1.15, 1.35, 0.1]} c="#ffffff" r={0.03} />
          <mesh geometry={star(5, 0.5, 0.22, 0.06)} material={M("#f2b437", 0.5)} position={[0.4, 1.9, 0.07]} scale={0.2} />
          <mesh geometry={SPHERE_LO()} material={M("#ef7d67", 0.5)} position={[0.75, 1.75, 0.07]} scale={[0.1, 0.1, 0.03]} />
        </group>
      </group>
      {/* Bowl mat */}
      <Box s={[2.0, 0.02, 0.9]} p={[1.12, 0.01, -0.82]} c="#f6c8d4" r={0.01} cast={false} />
      <Plant p={[0.25, 0, -2.6]} s={0.9} pot="#f2b437" />
    </group>
  );
}

function Bathroom({ lighting, world }: { lighting: Lighting; world: React.RefObject<World | null> }) {
  const water = useRef<THREE.Mesh>(null);
  const foam = useRef<THREE.Group>(null);
  const tub = LAYOUTS.bathroom.tub!;
  const waterMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#9fdcf0", transparent: true, opacity: 0.55, roughness: 0.05, clearcoat: 1, depthWrite: false, map: waterTexture() }), []);
  useFrame((st) => {
    const w = world.current;
    if (!w || !water.current) return;
    const lvl = w.bath.water;
    water.current.visible = lvl > 0.02;
    water.current.position.y = tub.floor + 0.06 + lvl * 0.36;
    const tex = (water.current.material as THREE.MeshPhysicalMaterial).map;
    if (tex) tex.offset.set(Math.sin(st.clock.elapsedTime * 0.3) * 0.05, st.clock.elapsedTime * 0.02);
    if (foam.current) {
      const soap = w.bath.soap.reduce((a, s) => a + s, 0) / Math.max(1, w.bath.soap.length);
      const k = Math.max(0.001, Math.min(1, lvl * (0.35 + Math.max(soap, w.bath.maxSoap * 0.6))));
      foam.current.visible = lvl > 0.05;
      foam.current.scale.setScalar(k);
      foam.current.position.y = tub.floor + 0.08 + lvl * 0.36;
    }
  });
  const white = M("#ffffff", 0.18, { cc: 1 });
  const inner = M("#eef8fb", 0.25, { cc: 0.6 });
  const foamPts = useMemo(() => {
    const r = seeded(42);
    return Array.from({ length: 16 }, () => [(r() - 0.5) * 2.0, (r() - 0.5) * 0.9, 0.06 + r() * 0.1] as V3);
  }, []);
  return (
    <group>
      <Window p={[2.4, 2.4, -2.98]} lighting={lighting} w={1.1} h={1.0} curtain="#bfe6f0" />
      {/* Bathtub: a hollow basin built from rounded walls */}
      <group position={[tub.x, 0, tub.z]}>
        <Box s={[2.5, 0.16, 1.45]} p={[0, 0.12, 0]} m={white} r={0.07} />
        <Box s={[2.5, 0.78, 0.18]} p={[0, 0.45, 0.64]} m={white} r={0.09} />
        <Box s={[2.5, 0.78, 0.18]} p={[0, 0.45, -0.64]} m={white} r={0.09} />
        <Box s={[0.18, 0.78, 1.45]} p={[-1.16, 0.45, 0]} m={white} r={0.09} />
        <Box s={[0.18, 0.78, 1.45]} p={[1.16, 0.45, 0]} m={white} r={0.09} />
        <Box s={[2.16, 0.02, 1.1]} p={[0, 0.21, 0]} m={inner} r={0.01} cast={false} />
        {[-1.05, 1.05].map((x) => [-0.55, 0.55].map((z) => <Ball key={`${x}${z}`} r={0.08} p={[x, 0.06, z]} c="#f4c542" />))}
        {/* Rubber duck on the rim */}
        <group position={[0.9, 0.9, 0.62]} rotation={[0, -0.5, 0]} scale={0.8}>
          <Ball r={0.11} p={[0, 0, 0]} s={[1, 0.8, 1.2]} c="#ffd23f" />
          <Ball r={0.07} p={[0, 0.1, 0.07]} c="#ffd23f" />
          <Ball r={0.035} p={[0, 0.09, 0.14]} s={[1, 0.5, 1.2]} c="#ff9f3a" />
          <Ball r={0.012} p={[0.03, 0.12, 0.12]} c="#222" />
          <Ball r={0.012} p={[-0.03, 0.12, 0.12]} c="#222" />
        </group>
      </group>
      <mesh ref={water} material={waterMat} position={[tub.x, tub.floor + 0.3, tub.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.18, 1.12]} />
      </mesh>
      <group ref={foam} position={[tub.x, tub.floor, tub.z]}>
        {foamPts.map((fp, i) => (
          <mesh key={i} geometry={SPHERE_LO()} material={M("#ffffff", 0.3)} position={[fp[0], 0, fp[1]]} scale={[0.16, 0.08, 0.16]} />
        ))}
      </group>
      {/* Shower */}
      <group position={[tub.x, 0, -2.92]}>
        <Cyl rt={0.03} h={2.0} p={[0, 1.75, 0]} c="#cfd8dc" seg={10} />
        <Cyl rt={0.03} h={0.3} p={[0, 2.72, 0.14]} rot={[Math.PI / 2, 0, 0]} c="#cfd8dc" seg={10} />
        <Cyl rt={0.18} rb={0.1} h={0.1} p={[0, 2.68, 0.3]} rot={[0.5, 0, 0]} c="#e2eaee" />
        <Ball r={0.06} p={[0.2, 1.0, 0.03]} c="#cfd8dc" />
        <Ball r={0.06} p={[-0.2, 1.0, 0.03]} c="#cfd8dc" />
      </group>
      {/* Sink and mirror */}
      <group position={[3.0, 0, -2.6]}>
        <Cyl rt={0.12} rb={0.18} h={0.85} p={[0, 0.42, 0]} m={white} />
        <mesh geometry={lathe("sink", [[0.001, 0], [0.35, 0.02], [0.42, 0.18], [0.36, 0.2], [0.001, 0.08]])} material={white} position={[0, 0.85, 0.05]} castShadow />
        <mesh geometry={cylinder(0.42, 0.42, 0.04, 40)} material={M("#bfe3ef", 0.05, { metal: 0.6, cc: 1 })} position={[0, 1.8, -0.28]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={torus(0.43, 0.04)} material={M("#f4c542", 0.3, { metal: 0.6 })} position={[0, 1.8, -0.26]} />
        <Cyl rt={0.06} h={0.18} p={[0.25, 1.0, -0.15]} c="#e86a9a" />
        <Cyl rt={0.05} h={0.14} p={[-0.25, 0.98, -0.15]} c="#4b9fe1" />
      </group>
      {/* Towel rack */}
      <group position={[-4.42, 0, -0.6]}>
        <Cyl rt={0.025} h={1.2} p={[0.08, 1.75, 0]} rot={[Math.PI / 2, 0, 0]} c="#cfd8dc" seg={10} />
        <Box s={[0.06, 0.9, 0.9]} p={[0.1, 1.4, 0]} c="#ffb3c7" r={0.03} />
        <Box s={[0.07, 0.15, 0.9]} p={[0.1, 1.1, 0]} c="#ffffff" r={0.02} cast={false} />
      </group>
      <Box s={[1.6, 0.02, 0.8]} p={[tub.x + 0.2, 0.01, tub.z + 1.3]} c="#9fdcef" r={0.01} cast={false} />
      <Plant p={[-3.8, 0, -2.5]} s={1.0} pot="#ffffff" />
    </group>
  );
}

function Playroom({ lighting }: { lighting: Lighting }) {
  const blocks: [string, V3][] = [
    ["#ef7d67", [0, 0.17, 0]],
    ["#4b9fe1", [0.36, 0.17, 0.05]],
    ["#f2b437", [0.18, 0.5, 0.02]],
    ["#34b892", [-0.36, 0.17, 0.1]],
    ["#8b68d6", [0.7, 0.17, 0.2]],
  ];
  return (
    <group>
      <Window p={[0.3, 2.4, -2.98]} lighting={lighting} w={1.3} h={1.1} curtain="#ffd25a" />
      {/* Rainbow on the wall */}
      {["#ef7d67", "#f2b437", "#7cc56a", "#4b9fe1", "#8b68d6"].map((c, i) => (
        <mesh key={c} geometry={torus(1.0 - i * 0.13, 0.065, Math.PI)} material={M(c, 0.8)} position={[-2.5, 2.2, -2.95]} />
      ))}
      <Ball r={0.28} p={[-3.4, 2.25, -2.92]} s={[1.3, 0.8, 0.3]} c="#ffffff" cast={false} />
      <Ball r={0.28} p={[-1.6, 2.25, -2.92]} s={[1.3, 0.8, 0.3]} c="#ffffff" cast={false} />
      {/* Toy box */}
      <group position={[-3.3, 0, -2.3]}>
        <Box s={[1.2, 0.8, 0.8]} p={[0, 0.4, 0]} c="#9fc7e8" r={0.08} />
        <Box s={[1.25, 0.1, 0.85]} p={[0, 0.95, -0.35]} rot={[-1.1, 0, 0]} c="#7fb2dc" r={0.04} />
        <Ball r={0.17} p={[-0.25, 0.85, 0.05]} c="#ef7d67" />
        <Box s={[0.25, 0.25, 0.25]} p={[0.25, 0.85, 0]} rot={[0.3, 0.5, 0]} c="#f2b437" r={0.04} />
      </group>
      {/* Blocks */}
      <group position={[1.6, 0, -2.45]}>
        {blocks.map(([c, p], i) => (
          <Box key={i} s={[0.32, 0.32, 0.32]} p={p} rot={[0, i * 0.3, 0]} c={c} r={0.05} />
        ))}
      </group>
      {/* Bean bag */}
      <Ball r={0.75} p={[3.4, 0.38, -2.15]} s={[1, 0.55, 1]} c="#e86a9a" />
      <Ball r={0.45} p={[3.4, 0.62, -2.45]} s={[1.2, 0.7, 0.6]} c="#d95a8a" />
      {/* Play cushion */}
      <group position={[-1.2, 0, -1.9]}>
        <Box s={[1.3, 0.22, 1.0]} p={[0, 0.11, 0]} c="#ffd25a" r={0.1} />
        <Box s={[1.1, 0.04, 0.8]} p={[0, 0.23, 0]} c="#ffe48f" r={0.02} cast={false} />
      </group>
      <Rug p={[0.4, 0.01, 0.4]} rx={2.4} rz={1.6} c="#dff3ea" c2="#34b892" />
      <Plant p={[3.75, 0, -0.9]} s={1.1} pot="#8b68d6" />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Outdoor scenes
// ---------------------------------------------------------------------------

function SkyDome({ lighting, kind }: { lighting: Lighting; kind: "garden" | "forest" | "beach" }) {
  const tex = useMemo(() => {
    if (lighting === "night") return gradientTexture([[0, "#151b3d"], [0.5, "#2a3468"], [1, "#4a4f8a"]], "sky-night");
    if (lighting === "evening") return gradientTexture([[0, "#6b6fb8"], [0.45, "#f59a8a"], [0.8, "#ffd09a"], [1, "#ffe6bf"]], "sky-eve");
    return gradientTexture([[0, "#5fb0f0"], [0.6, "#a8d8fa"], [1, kind === "beach" ? "#e8f6ff" : "#e6f6ff"]], "sky-day");
  }, [lighting, kind]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, toneMapped: false, fog: false }), [tex]);
  const sunPos: V3 = lighting === "evening" ? [-9, 3.5, -30] : [10, 14, -32];
  return (
    <group>
      <mesh material={mat} scale={60} position={[0, -6, 0]}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>
      <mesh position={sunPos} material={M(lighting === "night" ? "#fff6d0" : lighting === "evening" ? "#ffb070" : "#fff3b0", 1, { emissive: lighting === "night" ? "#fff6d0" : "#ffd27a", ei: 2 })}>
        <sphereGeometry args={[lighting === "night" ? 1.4 : 2.2, 24, 16]} />
      </mesh>
      {lighting !== "night" &&
        [[-12, 9, -34], [6, 11, -36], [18, 8, -30], [-22, 12, -28]].map((p, i) => (
          <group key={i} position={p as V3} scale={1.6 + (i % 2)}>
            <Ball r={1} p={[0, 0, 0]} s={[1.6, 0.8, 0.8]} c="#ffffff" cast={false} />
            <Ball r={0.8} p={[1.1, 0.25, 0]} s={[1.3, 0.9, 0.8]} c="#ffffff" cast={false} />
            <Ball r={0.7} p={[-1.1, 0.1, 0]} s={[1.3, 0.8, 0.8]} c="#ffffff" cast={false} />
          </group>
        ))}
      {lighting === "night" && <Stars />}
    </group>
  );
}

function Stars() {
  const pts = useMemo(() => {
    const r = seeded(9);
    const arr = new Float32Array(240 * 3);
    for (let i = 0; i < 240; i++) {
      const a = r() * Math.PI - Math.PI;
      const y = 4 + r() * 22;
      arr[i * 3] = Math.cos(a) * 40;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = Math.sin(a) * 30 - 8;
    }
    return arr;
  }, []);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pts, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#fff6d0" size={0.18} sizeAttenuation fog={false} />
    </points>
  );
}

function Tree({ p, s = 1, c = "#7cc56a", round = true }: { p: V3; s?: number; c?: string; round?: boolean }) {
  const trunk = M("#a87a55", 0.85, { map: woodTexture("#a87a55") });
  return (
    <group position={p} scale={s}>
      <mesh geometry={cylinder(0.14, 0.22, 1.6, 12)} material={trunk} position={[0, 0.8, 0]} castShadow receiveShadow />
      {round ? (
        <>
          <Ball r={0.85} p={[0, 2.1, 0]} c={c} />
          <Ball r={0.62} p={[0.55, 1.75, 0.2]} c={c} />
          <Ball r={0.6} p={[-0.55, 1.8, 0.1]} c={c} />
          <Ball r={0.55} p={[0.1, 2.75, -0.1]} c={c} />
        </>
      ) : (
        <>
          <mesh geometry={cone(0.95, 1.3, 18)} material={M(c, 0.8)} position={[0, 1.2, 0]} castShadow />
          <mesh geometry={cone(0.75, 1.1, 18)} material={M(c, 0.8)} position={[0, 1.9, 0]} castShadow />
          <mesh geometry={cone(0.5, 0.9, 18)} material={M(c, 0.8)} position={[0, 2.55, 0]} castShadow />
        </>
      )}
    </group>
  );
}

function Flowers({ count, area, seed, colors }: { count: number; area: [number, number, number, number]; seed: number; colors: string[] }) {
  const { stems, heads } = useMemo(() => {
    const r = seeded(seed);
    const m4 = new THREE.Matrix4();
    const stems = new THREE.InstancedMesh(cylinder(0.012, 0.012, 1, 6), M("#5fae5f", 0.8), count);
    const heads = new THREE.InstancedMesh(SPHERE_LO(), new THREE.MeshStandardMaterial({ roughness: 0.6 }), count);
    const col = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const x = area[0] + r() * (area[1] - area[0]);
      const z = area[2] + r() * (area[3] - area[2]);
      const h = 0.18 + r() * 0.2;
      m4.compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion(), new THREE.Vector3(1, h, 1));
      stems.setMatrixAt(i, m4);
      m4.compose(new THREE.Vector3(x, h, z), new THREE.Quaternion(), new THREE.Vector3(0.06, 0.045, 0.06));
      heads.setMatrixAt(i, m4);
      heads.setColorAt(i, col.set(colors[Math.floor(r() * colors.length)]));
    }
    heads.castShadow = true;
    return { stems, heads };
  }, [count, area, seed, colors]);
  return (
    <group>
      <primitive object={stems} />
      <primitive object={heads} />
    </group>
  );
}

const FLOWER_COLORS = ["#ff8fb1", "#ffffff", "#ffd25a", "#b99cf0", "#ff9f7a", "#8fd0ff"];

function Garden({ lighting }: { lighting: Lighting }) {
  const grass = groundTexture("grass");
  const posts = useMemo(() => Array.from({ length: 22 }, (_, i) => -10.5 + i), []);
  return (
    <group>
      <SkyDome lighting={lighting} kind="garden" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={M("#ffffff", 0.95, { map: grass })}>
        <circleGeometry args={[40, 48]} />
      </mesh>
      {/* Distant hills */}
      <Ball r={8} p={[-10, -5.2, -22]} s={[1.6, 1, 1]} c="#8cc87a" cast={false} />
      <Ball r={9} p={[9, -5.6, -24]} s={[1.6, 1, 1]} c="#9bd189" cast={false} />
      {/* Picket fence */}
      {posts.map((x) => (
        <group key={x} position={[x, 0, -3.4]}>
          <Box s={[0.16, 0.9, 0.06]} p={[0, 0.45, 0]} c="#ffffff" r={0.03} />
          <mesh geometry={cone(0.08, 0.12, 4)} material={M("#ffffff")} position={[0, 0.9, 0]} rotation={[0, Math.PI / 4, 0]} />
        </group>
      ))}
      <Box s={[22, 0.08, 0.05]} p={[0, 0.3, -3.36]} c="#ffffff" r={0.02} />
      <Box s={[22, 0.08, 0.05]} p={[0, 0.65, -3.36]} c="#ffffff" r={0.02} />
      <Flowers count={70} area={[-6, 6, -3.2, -2.7]} seed={3} colors={FLOWER_COLORS} />
      <Flowers count={30} area={[-6, -4.4, -2.6, 2]} seed={8} colors={FLOWER_COLORS} />
      <Flowers count={30} area={[4.4, 6, -2.6, 2]} seed={11} colors={FLOWER_COLORS} />
      <Tree p={[-3.6, 0, -2.7]} s={1.15} />
      <group position={[3.0, 0, -2.0]}>
        <Ball r={0.6} p={[0, 0.45, 0]} c="#6fb86a" />
        <Ball r={0.45} p={[0.5, 0.35, 0.2]} c="#7cc56a" />
        <Ball r={0.4} p={[-0.45, 0.3, 0.15]} c="#7cc56a" />
        {[[0.2, 0.85, 0.3], [-0.3, 0.7, 0.4], [0.55, 0.6, 0.45]].map((p, i) => (
          <Ball key={i} r={0.06} p={p as V3} c={FLOWER_COLORS[i]} />
        ))}
      </group>
      {[[-1.2, 1.2], [-0.2, 1.8], [0.9, 1.3], [1.9, 1.9]].map(([x, z], i) => (
        <Ball key={i} r={0.28} p={[x, 0.01, z]} s={[1, 0.12, 0.8]} c="#e5ddd2" />
      ))}
      {/* Little birdhouse on a pole */}
      <group position={[4.2, 0, -2.9]}>
        <Cyl rt={0.04} h={1.6} p={[0, 0.8, 0]} c="#a87a55" seg={8} />
        <Box s={[0.4, 0.35, 0.35]} p={[0, 1.75, 0]} c="#ef9a8a" r={0.04} />
        <mesh geometry={cone(0.33, 0.25, 4)} material={M("#c9706a")} position={[0, 1.92, 0]} rotation={[0, Math.PI / 4, 0]} castShadow />
        <Ball r={0.06} p={[0, 1.78, 0.18]} s={[1, 1, 0.3]} c="#3a2a24" cast={false} />
      </group>
    </group>
  );
}

function Forest({ lighting }: { lighting: Lighting }) {
  const moss = groundTexture("moss");
  const trees = useMemo(() => {
    const r = seeded(21);
    const list: { p: V3; s: number; round: boolean; c: string }[] = [];
    for (let i = 0; i < 26; i++) {
      const side = i % 2 ? 1 : -1;
      const x = i < 14 ? side * (4.3 + r() * 5) : -10 + r() * 20;
      const z = i < 14 ? -3 + r() * 5 : -3.6 - r() * 7;
      list.push({ p: [x, 0, z], s: 0.9 + r() * 0.9, round: r() > 0.55, c: ["#5fa86a", "#4f9a62", "#6fb874", "#83c27a"][Math.floor(r() * 4)] });
    }
    return list;
  }, []);
  const fireflies = lighting !== "day";
  return (
    <group>
      <SkyDome lighting={lighting} kind="forest" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={M("#ffffff", 0.95, { map: moss })}>
        <circleGeometry args={[40, 48]} />
      </mesh>
      {trees.map((t, i) => (
        <Tree key={i} p={t.p} s={t.s} round={t.round} c={t.c} />
      ))}
      {/* Log */}
      <group position={[-2.6, 0.22, -2.4]} rotation={[0, 0.4, Math.PI / 2]}>
        <mesh geometry={cylinder(0.22, 0.22, 1.6, 16)} material={M("#9a6e4c", 0.9, { map: woodTexture("#9a6e4c") })} castShadow receiveShadow />
        <mesh geometry={cylinder(0.2, 0.2, 0.01, 16)} material={M("#e8c99c", 0.9)} position={[0, 0.805, 0]} />
      </group>
      {/* Mushrooms */}
      {[[1.4, -2.4, 1], [1.7, -2.2, 0.7], [-0.6, -2.7, 0.8], [3.4, 1.4, 0.9]].map(([x, z, s], i) => (
        <group key={i} position={[x, 0, z]} scale={s}>
          <Cyl rt={0.06} rb={0.08} h={0.22} p={[0, 0.11, 0]} c="#fff5e6" />
          <mesh geometry={lathe("cap", [[0.001, 0.32], [0.12, 0.3], [0.22, 0.24], [0.26, 0.18], [0.001, 0.2]])} material={M("#e8505b", 0.5, { cc: 0.5 })} castShadow />
          {[0, 1, 2, 3].map((k) => (
            <Ball key={k} r={0.03} p={[Math.cos(k * 1.6) * 0.13, 0.28, Math.sin(k * 1.6) * 0.13]} c="#ffffff" cast={false} />
          ))}
        </group>
      ))}
      {/* Rocks and ferns */}
      {[[3.2, -1.8, 0.5], [-3.9, 1.2, 0.4], [0.3, -3.0, 0.35]].map(([x, z, s], i) => (
        <mesh key={i} position={[x, s * 0.4, z]} scale={[s * 1.3, s * 0.8, s]} castShadow receiveShadow material={M("#b8b8b0", 0.9)}>
          <dodecahedronGeometry args={[1, 1]} />
        </mesh>
      ))}
      {[[-1.5, -2.7], [2.6, -2.7], [-4, -0.5], [4.1, 0.2]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {Array.from({ length: 7 }, (_, k) => (
            <mesh key={k} geometry={pointy(0.1, 1.2)} material={M("#5fae5f", 0.7)} position={[0, 0.25, 0]} rotation={[0.6, (k / 7) * Math.PI * 2, 0]} scale={[0.08, 0.35, 0.02]} castShadow />
          ))}
        </group>
      ))}
      {fireflies && <Fireflies />}
    </group>
  );
}

function Fireflies() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => {
    const r = seeded(5);
    return Array.from({ length: 24 }, () => [r() * 8 - 4, 0.4 + r() * 2, r() * 4 - 3, r() * 10] as [number, number, number, number]);
  }, []);
  const m4 = useRef(new THREE.Matrix4());
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    const mesh = ref.current;
    if (!mesh) return;
    seeds.forEach(([x, y, z, ph], i) => {
      const s = 0.03 + 0.02 * Math.max(0, Math.sin(t * 2 + ph));
      m4.current.makeScale(s, s, s).setPosition(x + Math.sin(t * 0.4 + ph) * 0.5, y + Math.sin(t * 0.7 + ph) * 0.3, z + Math.cos(t * 0.3 + ph) * 0.4);
      mesh.setMatrixAt(i, m4.current);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[SPHERE_LO(), M("#fff6a0", 1, { emissive: "#ffe86a", ei: 3 }), seeds.length]} frustumCulled={false} />;
}

function Beach({ lighting }: { lighting: Lighting }) {
  const sand = groundTexture("sand");
  const sea = useRef<THREE.Mesh>(null);
  const foam = useRef<THREE.Mesh>(null);
  const seaMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: lighting === "night" ? "#3a5f8a" : "#5cc4dc", roughness: 0.15, clearcoat: 1, map: waterTexture(), transparent: true, opacity: 0.95 }), [lighting]);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    if (sea.current) {
      (sea.current.material as THREE.MeshPhysicalMaterial).map?.offset.set(t * 0.01, t * 0.03);
      sea.current.position.y = 0.02 + Math.sin(t * 0.8) * 0.02;
    }
    if (foam.current) foam.current.position.z = -2.55 + Math.sin(t * 0.8) * 0.18;
  });
  const umbrella = useMemo(() => new THREE.MeshStandardMaterial({ map: stripeTexture("#ef6a55", "#ffffff", 8, true), roughness: 0.6, side: THREE.DoubleSide }), []);
  return (
    <group>
      <SkyDome lighting={lighting} kind="beach" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 8]} receiveShadow material={M("#ffffff", 0.95, { map: sand })}>
        <planeGeometry args={[80, 21]} />
      </mesh>
      <mesh ref={sea} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -22.3]} material={seaMat} receiveShadow>
        <planeGeometry args={[80, 40]} />
      </mesh>
      <mesh ref={foam} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, -2.55]} material={M("#ffffff", 0.6, { opacity: 0.8 })}>
        <planeGeometry args={[80, 0.25]} />
      </mesh>
      {/* Palm tree */}
      <group position={[-3.5, 0, -1.9]}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh key={i} geometry={cylinder(0.13 - i * 0.008, 0.15 - i * 0.008, 0.42, 12)} material={M("#b8875a", 0.9)} position={[i * i * 0.012, 0.2 + i * 0.38, 0]} rotation={[0, 0, -i * 0.04]} castShadow />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <group key={i} position={[0.75, 3.15, 0]} rotation={[0, (i / 7) * Math.PI * 2, 0]}>
            <mesh geometry={pointy(0.05, 1.4)} material={M("#5fae5f", 0.7)} position={[0.8, -0.25, 0]} rotation={[0, 0, -1.25]} scale={[0.12, 0.95, 0.35]} castShadow />
          </group>
        ))}
        {[0, 2, 4].map((k) => (
          <Ball key={k} r={0.11} p={[0.75 + Math.cos(k) * 0.15, 2.98, Math.sin(k) * 0.15]} c="#7a5236" />
        ))}
      </group>
      {/* Umbrella and towel */}
      <group position={[3.1, 0, -1.2]} rotation={[0.1, 0, -0.15]}>
        <Cyl rt={0.035} h={2.2} p={[0, 1.1, 0]} c="#ffffff" seg={8} />
        <mesh geometry={cone(1.2, 0.5, 16)} material={umbrella} position={[0, 1.95, 0]} castShadow />
      </group>
      <mesh geometry={rbox(1.1, 0.03, 1.9, 0.01)} material={M("#ffffff", 0.9, { map: stripeTexture("#4b9fe1", "#ffffff", 10) })} position={[2.4, 0.015, 0.2]} rotation={[0, 0.3, 0]} receiveShadow />
      {/* Sand castle */}
      <group position={[1.4, 0, -1.7]}>
        <Box s={[0.9, 0.3, 0.6]} p={[0, 0.15, 0]} c="#ead2a2" r={0.04} />
        {[-0.38, 0.38].map((x) => (
          <group key={x}>
            <Cyl rt={0.14} rb={0.16} h={0.55} p={[x, 0.28, 0]} c="#ead2a2" />
            <mesh geometry={cone(0.17, 0.22, 12)} material={M("#e3c690", 0.9)} position={[x, 0.55, 0]} castShadow />
          </group>
        ))}
        <Cyl rt={0.01} h={0.3} p={[0.38, 0.85, 0]} c="#ffffff" seg={6} />
        <mesh geometry={SPHERE_LO()} material={M("#ef6a55", 0.6)} position={[0.45, 0.95, 0]} scale={[0.08, 0.05, 0.01]} />
      </group>
      {[[-1.2, 1.5, "#f59a6a"], [0.6, 2.0, "#ef7d67"], [-2.4, 0.6, "#f2b437"]].map(([x, z, c], i) => (
        <mesh key={i} geometry={star(5, 0.5, 0.22, 0.12)} material={M(c as string, 0.7)} position={[x as number, 0.03, z as number]} rotation={[-Math.PI / 2, 0, i]} scale={0.32} castShadow />
      ))}
      {[[0.2, 1.1], [-0.6, -0.9], [3.6, 1.5]].map(([x, z], i) => (
        <Ball key={i} r={0.08} p={[x, 0.03, z]} s={[1, 0.5, 1.3]} c="#fff1e6" />
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Fish tank (goldfish only), hiding spots, bowls
// ---------------------------------------------------------------------------

export function FishTank({ world }: { world: React.RefObject<World | null> }) {
  const algae = useRef<THREE.Mesh>(null);
  const plants = useRef<THREE.Group>(null);
  const algaeTex = useMemo(() => radialTexture("rgba(110,170,80,0.85)", "rgba(110,170,80,0)", "algae"), []);
  const algaeMat = useMemo(() => new THREE.MeshBasicMaterial({ map: algaeTex, transparent: true, opacity: 0, depthWrite: false }), [algaeTex]);
  useFrame((st) => {
    const w = world.current;
    const t = st.clock.elapsedTime;
    if (algae.current && w) (algae.current.material as THREE.MeshBasicMaterial).opacity = w.bath.active ? w.bath.algae * 0.9 : Math.max(0, (60 - w.stats.cleanliness) / 100);
    plants.current?.children.forEach((c, i) => (c.rotation.z = Math.sin(t * 1.2 + i) * 0.12));
  });
  const { x, z, standH, w, h, d } = TANK;
  const glass = M("#e8f8ff", 0.02, { opacity: 0.1, cc: 1, key: "glass" });
  const water = M("#a6e4f4", 0.1, { opacity: 0.13, key: "water" });
  const gravel = useMemo(() => {
    const r = seeded(77);
    return Array.from({ length: 110 }, () => ({ p: [(r() - 0.5) * (w - 0.25), standH + 0.1 + r() * 0.02, (r() - 0.5) * (d - 0.2)] as V3, c: ["#f6c8d4", "#cdeedd", "#fff1c9", "#d6ecff", "#e6dcf7"][Math.floor(r() * 5)] }));
  }, [w, d, standH]);
  return (
    <group position={[x, 0, z]}>
      {/* Stand */}
      <Box s={[w + 0.3, standH, d + 0.2]} p={[0, standH / 2, 0]} c="#e8c99c" r={0.06} />
      <Box s={[w + 0.36, 0.06, d + 0.26]} p={[0, standH, 0]} c="#d9b585" r={0.03} />
      {/* Glass box */}
      <mesh geometry={rbox(w, h, d, 0.04)} material={glass} position={[0, standH + h / 2 + 0.03, 0]} renderOrder={3} />
      <mesh geometry={rbox(w - 0.08, h - 0.22, d - 0.08, 0.02)} material={water} position={[0, standH + (h - 0.22) / 2 + 0.05, 0]} renderOrder={2} />
      {/* A slim frame: top edges and four corner posts, so the glass reads as a tank */}
      {[-1, 1].map((sd) => (
        <group key={sd}>
          <Box s={[w + 0.06, 0.05, 0.06]} p={[0, standH + h + 0.03, sd * (d / 2)]} c="#7cc5b0" r={0.02} cast={false} />
          <Box s={[0.06, 0.05, d + 0.06]} p={[sd * (w / 2), standH + h + 0.03, 0]} c="#7cc5b0" r={0.02} cast={false} />
          {[-1, 1].map((sz) => (
            <Box key={sz} s={[0.05, h, 0.05]} p={[sd * (w / 2), standH + h / 2 + 0.03, sz * (d / 2)]} c="#a9dccd" r={0.02} cast={false} />
          ))}
        </group>
      ))}
      {/* Water surface */}
      <mesh position={[0, TANK.waterTop + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M("#bfeaf6", 0.05, { opacity: 0.45, cc: 1, key: "water-top" })} renderOrder={2}>
        <planeGeometry args={[w - 0.08, d - 0.08]} />
      </mesh>
      {/* Gravel, castle, plants, rock */}
      <Box s={[w - 0.1, 0.1, d - 0.1]} p={[0, standH + 0.07, 0]} c="#f1e3c8" r={0.03} cast={false} />
      {gravel.map((g, i) => (
        <mesh key={i} geometry={SPHERE_LO()} material={M(g.c, 0.7)} position={g.p} scale={[0.045, 0.028, 0.045]} />
      ))}
      <group position={[TANK.hide[0][0], standH + 0.08, TANK.hide[0][1] - z]}>
        <Cyl rt={0.2} rb={0.22} h={0.5} p={[0, 0.25, 0]} c="#e9d8f5" />
        <mesh geometry={cone(0.24, 0.3, 12)} material={M("#b99cf0", 0.6)} position={[0, 0.5, 0]} castShadow />
        <Box s={[0.42, 0.3, 0.3]} p={[0.25, 0.15, 0]} c="#e9d8f5" r={0.03} />
        <Ball r={0.07} p={[0, 0.22, 0.2]} s={[1, 1.3, 0.3]} c="#5a4a6a" cast={false} />
      </group>
      <group ref={plants} position={[TANK.hide[1][0], standH + 0.08, TANK.hide[1][1] - z]}>
        {[-0.12, 0, 0.12, 0.06].map((px, i) => (
          <mesh key={i} geometry={pointy(0.2, 1.2)} material={M(i % 2 ? "#5fbf7f" : "#7cd38f", 0.6)} position={[px, 0.32, (i % 2) * 0.08]} scale={[0.07, 0.38 + i * 0.05, 0.03]} />
        ))}
      </group>
      <mesh position={[TANK.hide[2][0], standH + 0.22, TANK.hide[2][1] - z]} scale={[0.3, 0.22, 0.22]} material={M("#c9c2b8", 0.85)} castShadow>
        <dodecahedronGeometry args={[1, 1]} />
      </mesh>
      {/* Algae smudges on the front glass */}
      <mesh ref={algae} material={algaeMat} position={[0, standH + h / 2, d / 2 + 0.005]} renderOrder={4}>
        <planeGeometry args={[w * 0.9, h * 0.8]} />
      </mesh>
    </group>
  );
}

export function HideSpots({ world, room, fish }: { world: React.RefObject<World | null>; room: RoomId; fish: boolean }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const root = useRef<THREE.Group>(null);
  const indoor = LAYOUTS[room].indoor;
  useFrame((st) => {
    const w = world.current;
    if (!w || !root.current) return;
    const on = w.hide.active && !fish;
    root.current.visible = on;
    if (!on) return;
    const t = st.clock.elapsedTime;
    refs.current.forEach((g, i) => {
      if (!g) return;
      const wig = w.hide.wiggle[i];
      g.rotation.z = Math.sin(t * 30) * 0.08 * wig;
      g.position.y = w.hide.lift[i] * 0.5;
      g.rotation.x = -w.hide.lift[i] * 0.3;
    });
  });
  const spots = LAYOUTS[room].hide;
  return (
    <group ref={root} visible={false}>
      {spots.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <group
            ref={(el) => {
              refs.current[i] = el;
            }}
            userData={{ spot: i }}
          >
            {indoor ? (
              <>
                <mesh geometry={rbox(1.15, 1.05, 0.9, 0.04)} material={M("#d9a86c", 0.85)} position={[0, 0.525, 0]} castShadow receiveShadow userData={{ spot: i }} />
                <mesh geometry={rbox(1.17, 0.04, 0.12, 0.01)} material={M("#c99558", 0.8)} position={[0, 0.8, 0.45]} userData={{ spot: i }} />
                <mesh geometry={rbox(0.5, 0.04, 0.9, 0.01)} material={M("#e3b57a", 0.85)} position={[-0.42, 1.12, 0]} rotation={[0, 0, 0.5]} castShadow userData={{ spot: i }} />
                <mesh geometry={rbox(0.5, 0.04, 0.9, 0.01)} material={M("#e3b57a", 0.85)} position={[0.42, 1.12, 0]} rotation={[0, 0, -0.5]} castShadow userData={{ spot: i }} />
                <mesh geometry={SPHERE_LO()} material={M("#ef7d67", 0.6)} position={[0, 0.55, 0.455]} scale={[0.12, 0.12, 0.01]} userData={{ spot: i }} />
              </>
            ) : (
              <>
                <Ball r={0.72} p={[0, 0.66, 0]} c="#6fb86a" />
                <Ball r={0.52} p={[0.52, 0.46, 0.15]} c="#7cc56a" />
                <Ball r={0.5} p={[-0.52, 0.44, 0.12]} c="#7cc56a" />
                {[[0.25, 1.1, 0.45], [-0.3, 0.95, 0.55], [0.6, 0.75, 0.5]].map((fp, k) => (
                  <Ball key={k} r={0.06} p={fp as V3} c={FLOWER_COLORS[(i + k) % FLOWER_COLORS.length]} cast={false} />
                ))}
                <mesh geometry={SPHERE()} material={M("#7cc56a")} position={[0, 0.65, 0.1]} scale={[1.1, 0.85, 0.7]} visible={false} userData={{ spot: i }} />
              </>
            )}
          </group>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// The scene for a room
// ---------------------------------------------------------------------------

export function RoomScene({ room, decor, lighting, world }: { room: RoomId; decor: Decor; lighting: Lighting; world: React.RefObject<World | null> }) {
  const indoor = LAYOUTS[room].indoor;
  const tint = lighting === "night" ? "#d6d2ec" : lighting === "evening" ? "#f8e6d6" : undefined;
  return (
    <group>
      {indoor && <Shell decor={decor} wallTint={tint} />}
      {room === "living" && <Living lighting={lighting} />}
      {room === "bedroom" && <Bedroom lighting={lighting} />}
      {room === "kitchen" && <Kitchen lighting={lighting} world={world} />}
      {room === "bathroom" && <Bathroom lighting={lighting} world={world} />}
      {room === "playroom" && <Playroom lighting={lighting} />}
      {room === "garden" && <Garden lighting={lighting} />}
      {room === "forest" && <Forest lighting={lighting} />}
      {room === "beach" && <Beach lighting={lighting} />}
    </group>
  );
}
