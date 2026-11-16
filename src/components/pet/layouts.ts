import type { RoomId } from "./types";

export type XZ = [number, number];

export type RoomLayout = {
  id: RoomId;
  indoor: boolean;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  obstacles: { x: number; z: number; r: number }[];
  spawn: XZ;
  /** Where the pet comes to say hello, drop the ball, sit with you. */
  front: XZ;
  bowl?: XZ;
  water?: XZ;
  bed?: { x: number; z: number; y: number };
  tub?: { x: number; z: number; floor: number; rim: number };
  shower?: [number, number, number];
  /** Three places to hide behind in hide and seek. */
  hide: XZ[];
};

/** The room box: walls at z = -3 (back) and x = +-4.5. The camera looks in from +z. */
export const ROOM_W = 9;
export const ROOM_D = 6;
export const WALL_H = 4.2;

const indoorBounds = { minX: -3.7, maxX: 3.7, minZ: -2.3, maxZ: 2.3 };
const outdoorBounds = { minX: -4.2, maxX: 4.2, minZ: -2.4, maxZ: 2.4 };
const hideIndoor: XZ[] = [
  [-2.3, -0.5],
  [0, -0.9],
  [2.3, -0.5],
];

export const LAYOUTS: Record<RoomId, RoomLayout> = {
  living: {
    id: "living",
    indoor: true,
    bounds: indoorBounds,
    obstacles: [
      { x: -1.6, z: -2.3, r: 1.1 },
      { x: 3.7, z: -2.4, r: 0.5 },
      { x: -3.9, z: -2.4, r: 0.4 },
    ],
    spawn: [0.4, 0.4],
    front: [0, 1.7],
    bed: { x: 2.35, z: -1.55, y: 0.14 },
    hide: hideIndoor,
  },
  bedroom: {
    id: "bedroom",
    indoor: true,
    bounds: indoorBounds,
    obstacles: [
      { x: -2.9, z: -1.9, r: 1.4 },
      { x: 3.6, z: -2.4, r: 0.6 },
      { x: -0.9, z: -2.5, r: 0.35 },
    ],
    spawn: [0.8, 0.6],
    front: [0.4, 1.7],
    bed: { x: 0.9, z: -1.5, y: 0.14 },
    hide: [
      [-1.1, 0.4],
      [1.0, -0.2],
      [2.8, 0.3],
    ],
  },
  kitchen: {
    id: "kitchen",
    indoor: true,
    bounds: indoorBounds,
    obstacles: [
      { x: -2.6, z: -2.5, r: 1.1 },
      { x: -0.6, z: -2.5, r: 0.9 },
      { x: 3.3, z: -2.4, r: 0.8 },
      { x: 0.7, z: -0.75, r: 0.2 },
      { x: 1.55, z: -0.85, r: 0.2 },
    ],
    spawn: [0.6, 0.6],
    front: [0.4, 1.7],
    bowl: [0.7, -0.75],
    water: [1.55, -0.85],
    hide: [
      [-2.4, -0.6],
      [-0.6, 0.3],
      [2.6, -0.4],
    ],
  },
  bathroom: {
    id: "bathroom",
    indoor: true,
    bounds: indoorBounds,
    obstacles: [
      { x: -0.9, z: -2.0, r: 1.25 },
      { x: -2.1, z: -2.0, r: 0.6 },
      { x: 0.3, z: -2.0, r: 0.6 },
      { x: 3.0, z: -2.5, r: 0.6 },
    ],
    spawn: [1.4, 0.6],
    front: [1.2, 1.6],
    tub: { x: -0.9, z: -1.85, floor: 0.2, rim: 0.85 },
    shower: [-0.9, 2.7, -2.7],
    hide: [
      [-2.7, 0.3],
      [0.4, 0.5],
      [2.6, -0.5],
    ],
  },
  playroom: {
    id: "playroom",
    indoor: true,
    bounds: indoorBounds,
    obstacles: [
      { x: -3.3, z: -2.3, r: 0.7 },
      { x: 3.4, z: -2.2, r: 0.7 },
      { x: 1.6, z: -2.5, r: 0.5 },
    ],
    spawn: [0, 0.3],
    front: [0, 1.7],
    bed: { x: -1.2, z: -1.9, y: 0.22 },
    hide: hideIndoor,
  },
  garden: {
    id: "garden",
    indoor: false,
    bounds: outdoorBounds,
    obstacles: [
      { x: -3.4, z: -2.6, r: 1.0 },
      { x: 3.0, z: -2.0, r: 0.8 },
    ],
    spawn: [0, 0.4],
    front: [0, 1.8],
    hide: [
      [-2.4, -0.6],
      [0, -1.1],
      [2.4, -0.6],
    ],
  },
  forest: {
    id: "forest",
    indoor: false,
    bounds: outdoorBounds,
    obstacles: [
      { x: -3.6, z: -2.2, r: 0.8 },
      { x: 3.6, z: -2.4, r: 0.8 },
      { x: 1.8, z: -2.8, r: 0.6 },
    ],
    spawn: [0, 0.4],
    front: [0, 1.8],
    hide: [
      [-2.4, -0.6],
      [0, -1.1],
      [2.4, -0.6],
    ],
  },
  beach: {
    id: "beach",
    indoor: false,
    bounds: { minX: -4.2, maxX: 4.2, minZ: -1.9, maxZ: 2.4 },
    obstacles: [
      { x: -3.4, z: -1.8, r: 0.7 },
      { x: 3.1, z: -1.2, r: 0.5 },
    ],
    spawn: [0, 0.6],
    front: [0, 1.8],
    hide: [
      [-2.4, -0.4],
      [0, -0.8],
      [2.4, -0.4],
    ],
  },
};

/** The goldfish lives in a tank that sits in every room. */
export const TANK = {
  x: 0,
  z: -0.7,
  standH: 0.7,
  w: 2.8,
  h: 1.5,
  d: 1.3,
  /** Inside the glass, where the fish can swim. */
  inner: { minX: -1.15, maxX: 1.15, minY: 0.95, maxY: 1.85, minZ: -1.2, maxZ: -0.2 },
  waterTop: 2.0,
  hide: [
    [-0.85, -0.95],
    [0.05, -1.05],
    [0.85, -0.95],
  ] as XZ[],
};
