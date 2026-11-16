import type { FoodId, RoomId, Slot, SpeciesId, Verdict } from "./types";
import { SPECIES } from "./species";

export type Food = { id: FoodId; name: string; emoji: string; hunger: number; joy: number; health: number };

export const FOODS: Food[] = [
  { id: "biscuits", name: "Crunchy biscuits", emoji: "🍪", hunger: 30, joy: 4, health: 2 },
  { id: "chicken", name: "Chicken", emoji: "🍗", hunger: 36, joy: 6, health: 3 },
  { id: "fish", name: "Fish", emoji: "🐟", hunger: 34, joy: 6, health: 3 },
  { id: "carrot", name: "Carrot", emoji: "🥕", hunger: 26, joy: 4, health: 4 },
  { id: "lettuce", name: "Lettuce", emoji: "🥬", hunger: 22, joy: 3, health: 5 },
  { id: "strawberry", name: "Strawberry", emoji: "🍓", hunger: 20, joy: 8, health: 3 },
  { id: "seeds", name: "Seed mix", emoji: "🌻", hunger: 28, joy: 4, health: 3 },
  { id: "peas", name: "Peas", emoji: "🫛", hunger: 24, joy: 4, health: 4 },
  { id: "bugs", name: "Bug bites", emoji: "🐛", hunger: 30, joy: 5, health: 3 },
  { id: "flakes", name: "Fish flakes", emoji: "✨", hunger: 32, joy: 4, health: 3 },
  { id: "cupcake", name: "Tiny cupcake", emoji: "🧁", hunger: 14, joy: 14, health: 0 },
  { id: "water", name: "Fresh water", emoji: "💧", hunger: 6, joy: 2, health: 5 },
];
export const FOOD_BY_ID = Object.fromEntries(FOODS.map((f) => [f.id, f])) as Record<FoodId, Food>;

export function verdictFor(species: SpeciesId, food: FoodId): Verdict {
  const s = SPECIES[species];
  if (food === "water") return "like";
  if (s.favourite === food || s.likes.slice(0, 2).includes(food)) return "love";
  if (s.dislikes.includes(food)) return "dislike";
  return "like";
}

/** Foods shown for each species (fish get fish food). */
export function foodsFor(species: SpeciesId): Food[] {
  if (species === "goldfish") return FOODS.filter((f) => ["flakes", "peas", "bugs", "biscuits", "cupcake"].includes(f.id));
  return FOODS.filter((f) => f.id !== "flakes");
}

export type AccessoryItem = { id: string; slot: Slot; name: string; emoji: string; unlockAt: number };

export const ACCESSORIES: AccessoryItem[] = [
  { id: "bow", slot: "head", name: "Pink bow", emoji: "🎀", unlockAt: 0 },
  { id: "beanie", slot: "head", name: "Knit beanie", emoji: "🧶", unlockAt: 0 },
  { id: "party", slot: "head", name: "Party hat", emoji: "🥳", unlockAt: 12 },
  { id: "flowers", slot: "head", name: "Flower crown", emoji: "🌼", unlockAt: 28 },
  { id: "tophat", slot: "head", name: "Top hat", emoji: "🎩", unlockAt: 45 },
  { id: "crown", slot: "head", name: "Golden crown", emoji: "👑", unlockAt: 70 },
  { id: "sunhat", slot: "head", name: "Sun hat", emoji: "👒", unlockAt: 88 },
  { id: "round", slot: "face", name: "Round glasses", emoji: "👓", unlockAt: 0 },
  { id: "stars", slot: "face", name: "Star shades", emoji: "🌟", unlockAt: 30 },
  { id: "hearts", slot: "face", name: "Heart shades", emoji: "💗", unlockAt: 60 },
  { id: "collar", slot: "neck", name: "Collar and tag", emoji: "🏷️", unlockAt: 0 },
  { id: "bell", slot: "neck", name: "Bell collar", emoji: "🔔", unlockAt: 0 },
  { id: "bandana", slot: "neck", name: "Bandana", emoji: "🧣", unlockAt: 15 },
  { id: "scarf", slot: "neck", name: "Stripy scarf", emoji: "🧣", unlockAt: 38 },
  { id: "bowtie", slot: "neck", name: "Bow tie", emoji: "🎀", unlockAt: 52 },
  { id: "sweater", slot: "body", name: "Cosy jumper", emoji: "🧥", unlockAt: 20 },
  { id: "hoodie", slot: "body", name: "Rain jacket", emoji: "🧥", unlockAt: 42 },
  { id: "cape", slot: "body", name: "Hero cape", emoji: "🦸", unlockAt: 64 },
  { id: "tutu", slot: "body", name: "Tutu", emoji: "🩰", unlockAt: 80 },
];
export const ACCESSORY_BY_ID = Object.fromEntries(ACCESSORIES.map((a) => [a.id, a])) as Record<string, AccessoryItem>;
export const DEFAULT_UNLOCKED = ACCESSORIES.filter((a) => a.unlockAt === 0).map((a) => a.id);

export function fitsSpecies(item: AccessoryItem, species: SpeciesId) {
  if (item.slot === "body" && (item.id === "sweater" || item.id === "hoodie")) return SPECIES[species].outfits;
  if (species === "goldfish" && (item.slot === "neck" || item.id === "cape")) return false;
  return true;
}

export const FRIEND_LEVELS = [
  { at: 0, name: "New friends" },
  { at: 15, name: "Buddies" },
  { at: 35, name: "Good friends" },
  { at: 60, name: "Best friends" },
  { at: 85, name: "Inseparable" },
];
export function friendLevel(f: number) {
  let i = 0;
  FRIEND_LEVELS.forEach((l, idx) => {
    if (f >= l.at) i = idx;
  });
  const next = FRIEND_LEVELS[i + 1];
  return { index: i, name: FRIEND_LEVELS[i].name, next: next?.at ?? 100, from: FRIEND_LEVELS[i].at };
}

export type Theme = { id: string; name: string; swatch: string };

export const WALLPAPERS: Theme[] = [
  { id: "sunny", name: "Sunny cream", swatch: "linear-gradient(135deg,#fff3d6,#ffe2b0)" },
  { id: "stripes", name: "Pastel stripes", swatch: "repeating-linear-gradient(90deg,#d9f2e6 0 10px,#f4fbf7 10px 20px)" },
  { id: "polka", name: "Peach polka", swatch: "radial-gradient(circle at 30% 30%,#fff 3px,transparent 4px) 0 0/12px 12px,#ffd8c7" },
  { id: "check", name: "Cosy check", swatch: "repeating-linear-gradient(0deg,rgba(201,90,70,.25) 0 6px,transparent 6px 14px),repeating-linear-gradient(90deg,rgba(201,90,70,.25) 0 6px,transparent 6px 14px),#fbe9dc" },
  { id: "leaves", name: "Botanical", swatch: "linear-gradient(135deg,#dcebd6,#c6e0c0)" },
  { id: "lilac", name: "Lilac blossom", swatch: "radial-gradient(circle at 50% 50%,#fff 2px,transparent 3px) 0 0/10px 10px,#e6dcf7" },
  { id: "sky", name: "Cloudy sky", swatch: "linear-gradient(180deg,#cfe6fb,#eaf4fd)" },
  { id: "stars", name: "Starry night", swatch: "radial-gradient(circle at 40% 40%,#ffe9a8 1.5px,transparent 2.5px) 0 0/11px 11px,#2f3a63" },
  { id: "tiles", name: "Bath tiles", swatch: "repeating-linear-gradient(0deg,#fff 0 1px,transparent 1px 10px),repeating-linear-gradient(90deg,#fff 0 1px,transparent 1px 10px),#cfeaf0" },
];

export const FLOORS: Theme[] = [
  { id: "oak", name: "Light oak", swatch: "repeating-linear-gradient(90deg,#e8c99c 0 14px,#dcb985 14px 15px)" },
  { id: "walnut", name: "Warm walnut", swatch: "repeating-linear-gradient(90deg,#a8724a 0 14px,#946240 14px 15px)" },
  { id: "checker", name: "Mint checker", swatch: "conic-gradient(#cdeedd 25%,#fffaf0 0 50%,#cdeedd 0 75%,#fffaf0 0) 0 0/16px 16px" },
  { id: "carpet", name: "Soft carpet", swatch: "radial-gradient(circle,#d8cdee 1px,transparent 1.5px) 0 0/5px 5px,#e7def5" },
  { id: "tiles", name: "White tiles", swatch: "repeating-linear-gradient(0deg,#cdd8dc 0 1px,transparent 1px 12px),repeating-linear-gradient(90deg,#cdd8dc 0 1px,transparent 1px 12px),#f6fafb" },
  { id: "terrazzo", name: "Terrazzo", swatch: "radial-gradient(circle at 20% 30%,#f4a99a 2px,transparent 3px),radial-gradient(circle at 70% 60%,#9fc7e8 2px,transparent 3px),#f6efe6" },
  { id: "rose", name: "Rose rug", swatch: "linear-gradient(135deg,#f9d3df,#f4bfd0)" },
];

export const ROOMS: { id: RoomId; name: string; emoji: string; indoor: boolean; mood: string }[] = [
  { id: "living", name: "Living room", emoji: "🛋️", indoor: true, mood: "Cosy and bright" },
  { id: "bedroom", name: "Bedroom", emoji: "🛏️", indoor: true, mood: "Soft and sleepy" },
  { id: "kitchen", name: "Kitchen", emoji: "🍳", indoor: true, mood: "Snacks live here" },
  { id: "bathroom", name: "Bathroom", emoji: "🛁", indoor: true, mood: "Bubbles and splashes" },
  { id: "playroom", name: "Playroom", emoji: "🧸", indoor: true, mood: "Toys everywhere" },
  { id: "garden", name: "Garden", emoji: "🌷", indoor: false, mood: "Flowers and fresh air" },
  { id: "forest", name: "Forest", emoji: "🌲", indoor: false, mood: "Quiet and green" },
  { id: "beach", name: "Beach", emoji: "🏖️", indoor: false, mood: "Waves and warm sand" },
];
export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r])) as Record<RoomId, (typeof ROOMS)[number]>;

export const DEFAULT_DECOR: Record<string, { wall: string; floor: string }> = {
  living: { wall: "sunny", floor: "oak" },
  bedroom: { wall: "lilac", floor: "carpet" },
  kitchen: { wall: "check", floor: "checker" },
  bathroom: { wall: "tiles", floor: "tiles" },
  playroom: { wall: "polka", floor: "terrazzo" },
};
