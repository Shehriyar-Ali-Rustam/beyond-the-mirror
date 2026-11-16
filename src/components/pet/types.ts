// Shared types for Little Paws 3D.

export const SPECIES_IDS = [
  "dog",
  "cat",
  "rabbit",
  "hamster",
  "turtle",
  "parrot",
  "goldfish",
  "gecko",
  "guineapig",
  "duck",
  "hedgehog",
] as const;
export type SpeciesId = (typeof SPECIES_IDS)[number];

export const PATTERNS = ["solid", "spots", "patches", "stripes", "socks"] as const;
export type Pattern = (typeof PATTERNS)[number];

export const ROOM_IDS = ["living", "bedroom", "kitchen", "bathroom", "playroom", "garden", "forest", "beach"] as const;
export type RoomId = (typeof ROOM_IDS)[number];
export const INDOOR_ROOMS: readonly RoomId[] = ["living", "bedroom", "kitchen", "bathroom", "playroom"];

export const LIGHTINGS = ["auto", "day", "evening", "night"] as const;
export type LightingChoice = (typeof LIGHTINGS)[number];
export type Lighting = Exclude<LightingChoice, "auto">;

export const SLOTS = ["head", "face", "neck", "body"] as const;
export type Slot = (typeof SLOTS)[number];

export type PetLook = { body: string; accent: string; pattern: Pattern };
export type Accessories = Partial<Record<Slot, string>>;

export type Stats = {
  /** 100 means well fed. */
  hunger: number;
  happiness: number;
  energy: number;
  cleanliness: number;
  health: number;
};
export type StatKey = keyof Stats;

export type Pet = {
  name: string;
  species: SpeciesId;
  look: PetLook;
  acc: Accessories;
  adoptedAt: number;
};

export type Decor = { wall: string; floor: string };

export type SaveData = {
  version: 1;
  pet: Pet | null;
  stats: Stats;
  friendship: number;
  savedAt: number;
  room: RoomId;
  decor: Partial<Record<RoomId, Decor>>;
  lighting: LightingChoice;
  unlocked: string[];
  sound: { sfx: boolean; music: boolean };
  counts: { meals: number; baths: number; plays: number; pets: number; talks: number };
};

export type FoodId =
  | "biscuits"
  | "chicken"
  | "fish"
  | "carrot"
  | "lettuce"
  | "strawberry"
  | "seeds"
  | "peas"
  | "bugs"
  | "flakes"
  | "cupcake"
  | "water";

export type Verdict = "love" | "like" | "dislike";

export type BodyPart = "head" | "ear" | "belly" | "paw" | "tail" | "back" | "nose";

export type BathTool = "shampoo" | "shower" | "towel" | "dryer" | "brush";

export type Panel = "feed" | "bath" | "play" | "dress" | "talk" | "chat" | "room" | "menu" | null;

/** Things the 3D world tells the UI about. */
export type WorldEvent =
  | { type: "ate"; food: FoodId; verdict: Verdict }
  | { type: "refused"; food: FoodId }
  | { type: "touch"; part: BodyPart }
  | { type: "fetch" }
  | { type: "yarn" }
  | { type: "found"; tries: number }
  | { type: "hideMiss" }
  | { type: "hidden" }
  | { type: "bathProgress"; soap: number; wet: number; fluff: number; rinsed: boolean }
  | { type: "woke" }
  | { type: "asleep" }
  | { type: "dance" }
  | { type: "happyLook" };
