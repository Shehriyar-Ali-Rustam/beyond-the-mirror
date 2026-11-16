"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { dressRig } from "./accessories";
import { FOODS } from "./catalog";
import { SPHERE, SPHERE_LO, capsule, cone, cylinder, lathe, plane, pointy, rbox, torus } from "./geo";
import { LAYOUTS, TANK } from "./layouts";
import { buildPet } from "./pet-build";
import { FishTank, HideSpots, M, RoomScene } from "./rooms";
import { knitTexture, radialTexture, stripeTexture } from "./textures";
import type { Accessories, BodyPart, Decor, FoodId, Lighting, PetLook, RoomId, SpeciesId } from "./types";
import type { Bubble, HitInfo, World } from "./world";

type WorldRef = React.RefObject<World | null>;

/** three.js objects from hooks are mutable by design; these helpers keep the React Compiler happy. */
function setScene(scene: THREE.Scene, p: { environment?: THREE.Texture | null; environmentIntensity?: number; background?: THREE.Color; fog?: THREE.Fog | null }) {
  Object.assign(scene, p);
}
function addTo(parent: THREE.Object3D, child: THREE.Object3D) {
  parent.add(child);
  return () => {
    parent.remove(child);
  };
}

// ---------------------------------------------------------------------------
// Environment and lights
// ---------------------------------------------------------------------------

function Environment({ lighting }: { lighting: Lighting }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    setScene(scene, { environment: env });
    return () => {
      setScene(scene, { environment: null });
      env.dispose();
      pm.dispose();
    };
  }, [gl, scene]);
  useEffect(() => {
    setScene(scene, { environmentIntensity: lighting === "day" ? 0.5 : lighting === "evening" ? 0.32 : 0.2 });
  }, [scene, lighting]);
  return null;
}

const LIGHT_SETS: Record<"in" | "out", Record<Lighting, { sky: string; ground: string; hemi: number; sun: string; sunI: number; sunPos: [number, number, number]; amb: number; bg: string; fog?: [string, number, number] }>> = {
  in: {
    day: { sky: "#fff8ef", ground: "#e9dccd", hemi: 1.05, sun: "#fff3e0", sunI: 2.1, sunPos: [3, 7, 5], amb: 0.25, bg: "#f6efe6" },
    evening: { sky: "#ffd9b8", ground: "#7a5c55", hemi: 0.62, sun: "#ffb27a", sunI: 1.05, sunPos: [-4, 5, 4], amb: 0.18, bg: "#3b2f3a" },
    night: { sky: "#a9b6f2", ground: "#3a3656", hemi: 0.6, sun: "#b4c2ff", sunI: 0.7, sunPos: [3, 7, 4], amb: 0.2, bg: "#1d2036" },
  },
  out: {
    day: { sky: "#e3f2ff", ground: "#b8d49a", hemi: 1.15, sun: "#fff1d6", sunI: 2.4, sunPos: [4, 8, 4], amb: 0.2, bg: "#bfe2fb", fog: ["#d9eefc", 14, 45] },
    evening: { sky: "#ffcfb0", ground: "#7c6a80", hemi: 0.75, sun: "#ff9f6a", sunI: 1.5, sunPos: [-6, 3.5, 3], amb: 0.18, bg: "#f5b49a", fog: ["#f2b7a0", 12, 42] },
    night: { sky: "#8090d6", ground: "#1f2638", hemi: 0.5, sun: "#b6c4ff", sunI: 0.7, sunPos: [3, 8, 3], amb: 0.14, bg: "#1b2240", fog: ["#232b52", 10, 40] },
  },
};

function Lights({ lighting, indoor, world }: { lighting: Lighting; indoor: boolean; world: WorldRef }) {
  const set = LIGHT_SETS[indoor ? "in" : "out"][lighting];
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const { scene } = useThree();
  useEffect(() => {
    setScene(scene, { background: new THREE.Color(set.bg), fog: set.fog ? new THREE.Fog(set.fog[0], set.fog[1], set.fog[2]) : null });
  }, [scene, set]);
  useFrame(() => {
    const dim = 1 - (world.current?.dim ?? 0) * 0.35;
    if (hemi.current) hemi.current.intensity = set.hemi * dim;
    if (sun.current) sun.current.intensity = set.sunI * dim;
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={[set.sky, set.ground, set.hemi]} />
      <ambientLight intensity={set.amb} />
      <directionalLight
        ref={sun}
        position={set.sunPos}
        color={set.sun}
        intensity={set.sunI}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={5}
        shadow-camera-bottom={-4}
        shadow-camera-near={0.5}
        shadow-camera-far={25}
        shadow-radius={5}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// The pet
// ---------------------------------------------------------------------------

function PetActor({ species, look, acc, world }: { species: SpeciesId; look: PetLook; acc: Accessories; world: WorldRef }) {
  const rig = useMemo(() => buildPet(species, look), [species, look]);
  useEffect(() => {
    const w = world.current;
    w?.attachRig(rig);
    return () => {
      if (w?.rig === rig) w.attachRig(null);
      rig.dispose();
    };
  }, [rig, world]);
  useEffect(() => dressRig(rig, acc), [rig, acc]);
  const shadow = useRef<THREE.Mesh>(null);
  const shadowMat = useMemo(() => new THREE.MeshBasicMaterial({ map: radialTexture("rgba(40,30,30,0.5)", "rgba(40,30,30,0)", "blob"), transparent: true, depthWrite: false }), []);
  useFrame((_, dt) => {
    const w = world.current;
    if (!w) return;
    w.update(dt);
    const s = shadow.current;
    if (s) {
      s.visible = !w.fish;
      const h = w.air + w.alt;
      s.position.set(w.pos.x, w.ground + 0.012, w.pos.z);
      const k = ((w.rig?.dims.length ?? 1) * 0.7 + 0.35) * (1 - Math.min(0.5, h * 0.4));
      s.scale.set(k, k, 1);
      (s.material as THREE.MeshBasicMaterial).opacity = 1 - Math.min(0.7, h * 0.6);
    }
  });
  return (
    <>
      <primitive object={rig.root} />
      <mesh ref={shadow} geometry={plane(1, 1)} material={shadowMat} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1} />
    </>
  );
}

function ParticlesView({ world }: { world: WorldRef }) {
  const { scene } = useThree();
  useEffect(() => {
    const g = world.current?.particles.group;
    if (!g) return;
    return addTo(scene, g);
  }, [scene, world]);
  return null;
}

// ---------------------------------------------------------------------------
// Toys, food and bath tools
// ---------------------------------------------------------------------------

function Toys({ world }: { world: WorldRef }) {
  const ball = useRef<THREE.Group>(null);
  const yarn = useRef<THREE.Group>(null);
  const ballMat = useMemo(() => new THREE.MeshPhysicalMaterial({ map: stripeTexture("#ef6a55", "#ffd25a", 4, true), roughness: 0.4, clearcoat: 0.6 }), []);
  const yarnMat = useMemo(() => new THREE.MeshPhysicalMaterial({ map: knitTexture("#b99cf0"), roughness: 0.9, sheen: 1, sheenColor: new THREE.Color("#ffffff") }), []);
  useFrame(() => {
    const w = world.current;
    if (!w) return;
    const b = w.ball;
    for (const [ref, kind] of [
      [ball, "ball"],
      [yarn, "yarn"],
    ] as const) {
      const g = ref.current;
      if (!g) continue;
      g.visible = b.active && b.kind === kind;
      if (g.visible) {
        g.position.copy(b.pos);
        g.quaternion.copy(b.spin);
      }
    }
  });
  return (
    <>
      <group ref={ball} visible={false}>
        <mesh geometry={SPHERE()} material={ballMat} scale={0.13} castShadow />
      </group>
      <group ref={yarn} visible={false}>
        <mesh geometry={SPHERE()} material={yarnMat} scale={0.14} castShadow />
        <mesh geometry={torus(0.13, 0.012)} material={M("#9a7fe0", 0.8)} rotation={[0.4, 0, 0]} />
        <mesh geometry={torus(0.135, 0.01)} material={M("#9a7fe0", 0.8)} rotation={[0, 0.9, 0.3]} />
        <mesh geometry={capsule(0.012, 0.3)} material={M("#9a7fe0", 0.8)} position={[0.12, -0.1, -0.12]} rotation={[0.9, 0, 0.6]} />
      </group>
    </>
  );
}

function FoodPile({ id }: { id: FoodId }) {
  // A tiny 3D version of each food sitting in the bowl.
  switch (id) {
    case "carrot":
      return (
        <group rotation={[0, 0, 1.3]} position={[0, 0.06, 0]}>
          <mesh geometry={pointy(0.08, 1.2)} material={M("#f39a3d", 0.6)} scale={[0.06, 0.2, 0.06]} castShadow />
          <mesh geometry={pointy(0.1, 1)} material={M("#6fbf5a", 0.6)} position={[0, 0.2, 0]} scale={[0.03, 0.08, 0.03]} />
        </group>
      );
    case "lettuce":
      return (
        <group position={[0, 0.06, 0]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} geometry={SPHERE_LO()} material={M(i % 2 ? "#8fd67a" : "#a9e28f", 0.7)} position={[Math.cos(i * 1.6) * 0.06, 0.02 * i, Math.sin(i * 1.6) * 0.06]} rotation={[0.4 * i, i, 0]} scale={[0.1, 0.03, 0.08]} />
          ))}
        </group>
      );
    case "strawberry":
      return (
        <group position={[0, 0.08, 0]}>
          <mesh geometry={pointy(0.3, 1)} material={M("#ef4a5a", 0.4, { cc: 0.6 })} rotation={[Math.PI, 0, 0]} scale={[0.07, 0.08, 0.07]} castShadow />
          <mesh geometry={SPHERE_LO()} material={M("#6fbf5a", 0.6)} position={[0, 0.06, 0]} scale={[0.06, 0.015, 0.06]} />
          <mesh geometry={pointy(0.3, 1)} material={M("#ef4a5a", 0.4, { cc: 0.6 })} position={[0.09, -0.01, 0.03]} rotation={[Math.PI, 0, 0.3]} scale={[0.05, 0.06, 0.05]} />
        </group>
      );
    case "fish":
      return (
        <group position={[0, 0.06, 0]} rotation={[0, 0.5, 0]}>
          <mesh geometry={SPHERE()} material={M("#9fc7e8", 0.4, { cc: 0.6 })} scale={[0.05, 0.045, 0.12]} castShadow />
          <mesh geometry={cone(0.05, 0.07, 3)} material={M("#7fb2dc", 0.5)} position={[0, 0, -0.14]} rotation={[-Math.PI / 2, 0, 0]} />
        </group>
      );
    case "chicken":
      return (
        <group position={[0, 0.07, 0]} rotation={[0, 0.4, 1.2]}>
          <mesh geometry={SPHERE()} material={M("#d9955a", 0.6)} scale={[0.07, 0.09, 0.07]} castShadow />
          <mesh geometry={capsule(0.018, 0.08)} material={M("#fff4e6", 0.6)} position={[0, -0.12, 0]} />
        </group>
      );
    case "cupcake":
      return (
        <group position={[0, 0.03, 0]}>
          <mesh geometry={cylinder(0.07, 0.055, 0.07, 16)} material={M("#f2b8cf", 0.7)} position={[0, 0.035, 0]} castShadow />
          <mesh geometry={pointy(0.3, 1.2)} material={M("#fff3f8", 0.5)} position={[0, 0.1, 0]} scale={[0.08, 0.07, 0.08]} />
          <mesh geometry={SPHERE_LO()} material={M("#ef4a5a", 0.3, { cc: 1 })} position={[0, 0.17, 0]} scale={0.02} />
        </group>
      );
    default: {
      const color = id === "seeds" ? "#e1c48f" : id === "peas" ? "#7cc56a" : id === "bugs" ? "#9a6a4a" : id === "flakes" ? "#f59a3c" : "#c98a55";
      const n = id === "seeds" || id === "peas" ? 14 : 9;
      return (
        <group position={[0, 0.04, 0]}>
          {Array.from({ length: n }, (_, i) => {
            const a = i * 2.4;
            const r = 0.03 + (i % 4) * 0.025;
            return <mesh key={i} geometry={id === "bugs" ? capsule(0.012, 0.03) : SPHERE_LO()} material={M(color, 0.6)} position={[Math.cos(a) * r, (i % 3) * 0.015, Math.sin(a) * r]} rotation={[0, a, 1.2]} scale={id === "bugs" ? 1 : id === "seeds" ? [0.022, 0.014, 0.03] : 0.026} castShadow />;
          })}
        </group>
      );
    }
  }
}

function Bowls({ world, room }: { world: WorldRef; room: RoomId }) {
  const L = LAYOUTS[room];
  const piles = useRef<Partial<Record<FoodId, THREE.Group | null>>>({});
  const water = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const w = world.current;
    if (!w) return;
    for (const f of FOODS) {
      const g = piles.current[f.id];
      if (!g) continue;
      g.visible = w.food.id === f.id && w.food.amount > 0.02;
      if (g.visible) g.scale.setScalar(0.4 + 0.6 * w.food.amount);
    }
    if (water.current) {
      water.current.visible = w.food.water > 0.02;
      water.current.position.y = 0.04 + w.food.water * 0.06;
    }
  });
  if (!L.bowl || !L.water) return null;
  const bowlGeo = lathe("bowl", [[0.001, 0], [0.2, 0.0], [0.24, 0.05], [0.25, 0.13], [0.21, 0.13], [0.18, 0.04], [0.001, 0.04]]);
  return (
    <>
      <group position={[L.bowl[0], 0.02, L.bowl[1]]}>
        <mesh geometry={bowlGeo} material={M("#ef7d67", 0.35, { cc: 0.8 })} castShadow receiveShadow />
        {FOODS.filter((f) => f.id !== "water").map((f) => (
          <group
            key={f.id}
            visible={false}
            ref={(el) => {
              piles.current[f.id] = el;
            }}
          >
            <FoodPile id={f.id} />
          </group>
        ))}
      </group>
      <group position={[L.water[0], 0.02, L.water[1]]}>
        <mesh geometry={bowlGeo} material={M("#4b9fe1", 0.35, { cc: 0.8 })} castShadow receiveShadow />
        <mesh ref={water} geometry={cylinder(0.2, 0.2, 0.01, 28)} material={M("#9fdcf0", 0.05, { cc: 1, opacity: 0.85 })} visible={false} />
      </group>
    </>
  );
}

function Pellets({ world }: { world: WorldRef }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const m4 = useRef(new THREE.Matrix4());
  useFrame(() => {
    const w = world.current;
    const mesh = ref.current;
    if (!w || !mesh) return;
    mesh.count = w.writePellets(mesh, m4.current);
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[SPHERE_LO(), M("#f59a3c", 0.6), 12]} frustumCulled={false} />;
}

function BathTools({ world }: { world: WorldRef }) {
  const refs = useRef<Record<string, THREE.Group | null>>({});
  useFrame((st) => {
    const w = world.current;
    if (!w) return;
    const b = w.bath;
    for (const [k, g] of Object.entries(refs.current)) {
      if (!g) continue;
      const fishTool = w.fish && (k === "sponge" || k === "brush");
      const tool = w.fish && b.tool === "shampoo" ? "sponge" : b.tool;
      g.visible = b.active && b.toolOn && tool === k && k !== "shower";
      if (!g.visible) continue;
      const p = b.toolPos;
      g.position.set(p.x, p.y + (fishTool ? 0 : 0.18), p.z + (w.fish ? 0.12 : 0.25));
      g.rotation.z = Math.sin(st.clock.elapsedTime * (w.pointer.down ? 14 : 2)) * (w.pointer.down ? 0.25 : 0.06);
    }
  });
  return (
    <>
      <group
        ref={(el) => {
          refs.current.shampoo = el;
        }}
        visible={false}
      >
        <mesh geometry={rbox(0.16, 0.26, 0.1, 0.04)} material={M("#e86a9a", 0.3, { cc: 1 })} position={[0, 0.13, 0]} />
        <mesh geometry={cylinder(0.03, 0.04, 0.06, 12)} material={M("#ffffff", 0.4)} position={[0, 0.29, 0]} />
        <mesh geometry={SPHERE_LO()} material={M("#ffffff", 0.3)} position={[0, 0.1, 0.05]} scale={[0.04, 0.04, 0.01]} />
      </group>
      <group
        ref={(el) => {
          refs.current.sponge = el;
        }}
        visible={false}
      >
        <mesh geometry={rbox(0.24, 0.12, 0.16, 0.05)} material={M("#ffd25a", 0.9)} />
        <mesh geometry={rbox(0.245, 0.04, 0.165, 0.02)} material={M("#7cc56a", 0.8)} position={[0, -0.07, 0]} />
      </group>
      <group
        ref={(el) => {
          refs.current.towel = el;
        }}
        visible={false}
      >
        <mesh geometry={rbox(0.4, 0.08, 0.28, 0.04)} material={M("#ffb3c7", 0.95)} rotation={[0.3, 0, 0.2]} />
        <mesh geometry={rbox(0.41, 0.03, 0.06, 0.01)} material={M("#ffffff", 0.9)} position={[0, 0.03, 0.1]} rotation={[0.3, 0, 0.2]} />
      </group>
      <group
        ref={(el) => {
          refs.current.dryer = el;
        }}
        visible={false}
        rotation={[0, 0.4, 0]}
      >
        <mesh geometry={capsule(0.07, 0.2)} material={M("#8b68d6", 0.3, { cc: 1 })} position={[0, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} />
        <mesh geometry={cylinder(0.06, 0.08, 0.08, 16)} material={M("#5a4a8a", 0.4)} position={[-0.2, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} />
        <mesh geometry={capsule(0.035, 0.12)} material={M("#8b68d6", 0.3, { cc: 1 })} position={[0.06, -0.02, 0]} />
      </group>
      <group
        ref={(el) => {
          refs.current.brush = el;
        }}
        visible={false}
      >
        <mesh geometry={rbox(0.2, 0.05, 0.12, 0.02)} material={M("#c9a170", 0.5)} />
        <mesh geometry={capsule(0.02, 0.16)} material={M("#c9a170", 0.5)} position={[0.17, 0.02, 0]} rotation={[0, 0, Math.PI / 2 - 0.2]} />
        <mesh geometry={rbox(0.18, 0.04, 0.1, 0.01)} material={M("#fff3e6", 0.9)} position={[0, -0.04, 0]} />
      </group>
    </>
  );
}

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

function CameraRig({ world, reduced }: { world: WorldRef; reduced: boolean }) {
  const { camera, size } = useThree();
  const r = useRef({ goal: { target: new THREE.Vector3(0, 1, 0), width: 9, height: 4.5 }, look: new THREE.Vector3(0, 1, 0), desired: new THREE.Vector3(), dir: new THREE.Vector3(), shift: { x: 0, y: 0 }, first: true });
  useFrame((st, dt) => {
    const w = world.current;
    if (!w) return;
    const { goal, look, desired, dir, shift } = r.current;
    const first = r.current;
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    w.camGoal(goal, aspect);
    const close = w.camMode !== "room";
    const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const dist = Math.max(goal.height / 2 / tan, goal.width / 2 / (tan * aspect));
    dir.set(0, close ? 0.26 : 0.34, 1).normalize();
    if (!reduced && w.camMode === "room") {
      const px = st.pointer.x * 0.04;
      dir.x += px;
    }
    desired.copy(goal.target).addScaledVector(dir, dist);
    const k = first.first ? 1 : 1 - Math.exp(-(reduced ? 6 : 2.6) * dt);
    first.first = false;
    cam.position.lerp(desired, k);
    look.lerp(goal.target, k);
    cam.lookAt(look);
    w.camPos.copy(cam.position);
    // Shift the picture away from an open panel.
    const sx = shift;
    sx.x += (w.viewShift.x - sx.x) * (1 - Math.exp(-6 * dt));
    sx.y += (w.viewShift.y - sx.y) * (1 - Math.exp(-6 * dt));
    if (Math.abs(sx.x) > 0.001 || Math.abs(sx.y) > 0.001) cam.setViewOffset(size.width, size.height, sx.x * size.width, sx.y * size.height, size.width, size.height);
    else if (cam.view?.enabled) cam.clearViewOffset();
  });
  return null;
}

// ---------------------------------------------------------------------------
// Pointer input: raycast the pet, hiding spots, tank glass and floor
// ---------------------------------------------------------------------------

function partOf(obj: THREE.Object3D, point: THREE.Vector3): BodyPart | undefined {
  let o: THREE.Object3D | null = obj;
  while (o && o.userData.part === undefined) o = o.parent;
  const part = o?.userData.part as string | undefined;
  if (!part) return undefined;
  if (part === "body") {
    const local = obj.worldToLocal(point.clone());
    return local.y < -0.2 && local.z > -0.6 ? "belly" : "back";
  }
  return part as BodyPart;
}

function Interaction({ world, enabled }: { world: WorldRef; enabled: boolean }) {
  const { gl, camera, scene } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const glassPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -(TANK.z + TANK.d / 2));
    const hitGround = new THREE.Vector3();
    const cast = (e: PointerEvent): { ground: THREE.Vector3 | null; hit: HitInfo } => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const w = world.current;
      const hit: HitInfo = {};
      let ground: THREE.Vector3 | null = null;
      if (ray.ray.intersectPlane(floor, hitGround)) {
        ground = hitGround.clone();
        hit.ground = ground;
      }
      if (!w) return { ground, hit };
      if (w.rig) {
        const hits = ray.intersectObject(w.rig.root, true);
        const first = hits.find((h) => (h.object as THREE.Mesh).isMesh && h.object.visible);
        if (first) {
          hit.part = partOf(first.object, first.point);
          hit.point = first.point.clone();
        }
      }
      if (w.hide.active) {
        const spots: THREE.Object3D[] = [];
        scene.traverse((o) => {
          if (o.userData.spot !== undefined && (o as THREE.Mesh).isMesh) spots.push(o);
        });
        const sh = ray.intersectObjects(spots, false)[0];
        if (sh) hit.spot = sh.object.userData.spot as number;
        if (w.fish && hit.spot === undefined) {
          const p = new THREE.Vector3();
          if (ray.ray.intersectPlane(glassPlane, p)) {
            let best = -1;
            let bd = 0.45;
            TANK.hide.forEach(([x], i) => {
              const d = Math.abs(p.x - x);
              if (d < bd && p.y < TANK.standH + 0.9) {
                bd = d;
                best = i;
              }
            });
            if (best >= 0) hit.spot = best;
          }
        }
      }
      if (w.fish) {
        const p = new THREE.Vector3();
        if (ray.ray.intersectPlane(glassPlane, p) && Math.abs(p.x - TANK.x) < TANK.w / 2 && p.y > TANK.standH && p.y < TANK.standH + TANK.h) {
          hit.glass = p;
          if (!hit.part) hit.point = undefined;
        }
      }
      return { ground, hit };
    };
    const down = (e: PointerEvent) => {
      if (!enabled) return;
      const { hit } = cast(e);
      world.current?.pointerDown(hit);
      if (world.current?.bath.active) el.setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!enabled) return;
      const w = world.current;
      if (!w) return;
      const { ground, hit } = cast(e);
      w.pointerMove(ground, hit);
      el.style.cursor = hit.part || hit.spot !== undefined ? "pointer" : w.ball.active ? "crosshair" : "default";
    };
    const up = () => world.current?.pointerUp();
    const leave = () => world.current?.pointerLeave();
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("pointerleave", leave);
    };
  }, [gl, camera, scene, world, enabled]);
  return null;
}

// ---------------------------------------------------------------------------
// Speech bubble above the pet
// ---------------------------------------------------------------------------

function PetBubble({ world, bubble }: { world: WorldRef; bubble: Bubble }) {
  const g = useRef<THREE.Group>(null);
  const tmpRef = useRef(new THREE.Vector3());
  useFrame(() => {
    const w = world.current;
    if (!w || !g.current) return;
    const tmp = w.headWorld(tmpRef.current);
    g.current.position.set(tmp.x, tmp.y + (w.rig ? 0.38 : 0.6), tmp.z);
  });
  return (
    <group ref={g}>
      {bubble && (
        <Html center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div key={bubble.key} className="animate-pop flex items-center gap-1.5 whitespace-nowrap rounded-2xl bg-white/95 px-3 py-1.5 text-sm font-semibold text-ink shadow-md ring-1 ring-black/5">
            <span className="text-lg leading-none">{bubble.icon}</span>
            {bubble.text && <span>{bubble.text}</span>}
          </div>
        </Html>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

export type SceneProps = {
  species: SpeciesId;
  look: PetLook;
  acc: Accessories;
  room: RoomId;
  decor: Decor;
  lighting: Lighting;
  world: WorldRef;
  bubble: Bubble;
  reduced: boolean;
  active: boolean;
  interactive: boolean;
  touchAction: "none" | "pan-y";
};

export default function PetScene(p: SceneProps) {
  const indoor = LAYOUTS[p.room].indoor;
  const fish = p.species === "goldfish";
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.75]}
      frameloop={p.active ? "always" : "never"}
      camera={{ fov: 36, near: 0.1, far: 120, position: [0, 3, 9] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1.0;
      }}
      style={{ touchAction: p.touchAction }}
      aria-hidden
    >
      <Environment lighting={p.lighting} />
      <Lights lighting={p.lighting} indoor={indoor} world={p.world} />
      <RoomScene room={p.room} decor={p.decor} lighting={p.lighting} world={p.world} />
      {fish && <FishTank world={p.world} />}
      {!fish && p.room === "kitchen" && <Bowls world={p.world} room={p.room} />}
      {fish && <Pellets world={p.world} />}
      <HideSpots world={p.world} room={p.room} fish={fish} />
      <PetActor species={p.species} look={p.look} acc={p.acc} world={p.world} />
      <Toys world={p.world} />
      <BathTools world={p.world} />
      <ParticlesView world={p.world} />
      <CameraRig world={p.world} reduced={p.reduced} />
      <Interaction world={p.world} enabled={p.interactive} />
      <PetBubble world={p.world} bubble={p.bubble} />
    </Canvas>
  );
}
