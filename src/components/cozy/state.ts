import { z } from "zod";

/* -----------------------------------------------------------------------------
   Cozy Room: catalogues, saved state and its validation.
   Everything a student picks is stored as short ids so a save stays tiny.
----------------------------------------------------------------------------- */

export const SAVE_VERSION = 1;

export type Swatch = { id: string; name: string; color: string };

const sw = (id: string, name: string, color: string): Swatch => ({ id, name, color });

export const SKINS: Swatch[] = [
  sw("s1", "Skin tone 1", "#f7dcc8"),
  sw("s2", "Skin tone 2", "#efc6a4"),
  sw("s3", "Skin tone 3", "#e2ab84"),
  sw("s4", "Skin tone 4", "#d29a6f"),
  sw("s5", "Skin tone 5", "#bf8459"),
  sw("s6", "Skin tone 6", "#a36a44"),
  sw("s7", "Skin tone 7", "#84522f"),
  sw("s8", "Skin tone 8", "#5e3a22"),
];

export const HAIR_COLORS: Swatch[] = [
  sw("black", "Black", "#1f1a1c"),
  sw("darkBrown", "Dark brown", "#3a2a22"),
  sw("brown", "Brown", "#5b3b29"),
  sw("chestnut", "Chestnut", "#7a4530"),
  sw("auburn", "Auburn", "#93432b"),
  sw("honey", "Honey", "#b9843f"),
  sw("pink", "Pastel pink", "#e6a2b8"),
  sw("lilac", "Lilac", "#a892d6"),
  sw("blue", "Sky blue", "#6c9fd8"),
];

/** Soft fabric colours used for clothes, scarves, bedding, rugs and curtains. */
export const FABRICS: Swatch[] = [
  sw("cream", "Cream", "#f1e6d4"),
  sw("white", "Cloud white", "#faf8f3"),
  sw("sage", "Sage", "#9db49b"),
  sw("mint", "Mint", "#a6d6c3"),
  sw("sky", "Sky", "#9cc2e3"),
  sw("navy", "Navy", "#3c4a6b"),
  sw("lavender", "Lavender", "#b8a7dc"),
  sw("rose", "Dusty rose", "#e2a4b2"),
  sw("coral", "Coral", "#e88e77"),
  sw("mustard", "Mustard", "#dfb04e"),
  sw("terracotta", "Terracotta", "#c8714f"),
  sw("plum", "Plum", "#8a5a83"),
  sw("forest", "Forest", "#4f6f55"),
  sw("denim", "Denim", "#5e7ea8"),
  sw("brown", "Cocoa", "#8a6148"),
  sw("charcoal", "Charcoal", "#4a4a53"),
];

export const WALLS: Swatch[] = [
  sw("cream", "Warm cream", "#ecdcc4"),
  sw("peach", "Peach", "#f0c8a6"),
  sw("blush", "Blush", "#e8c3ba"),
  sw("sage", "Sage", "#c2ceb3"),
  sw("sky", "Powder blue", "#bdcfdc"),
  sw("lavender", "Lavender", "#cec3df"),
  sw("terracotta", "Terracotta", "#cf9a7f"),
  sw("teal", "Deep teal", "#6b9593"),
  sw("navy", "Midnight", "#4e5b7b"),
  sw("plum", "Plum", "#7d6378"),
];

export const FLOORS: Swatch[] = [
  sw("oak", "Light oak", "#c9a27b"),
  sw("honey", "Honey", "#b98450"),
  sw("walnut", "Walnut", "#7b5339"),
  sw("ash", "Grey wash", "#a59c94"),
];

export const WALLPAPERS = [
  { id: "plain", name: "Plain" },
  { id: "stripes", name: "Stripes" },
  { id: "dots", name: "Dots" },
  { id: "stars", name: "Stars" },
  { id: "leaves", name: "Leaves" },
  { id: "check", name: "Gingham" },
  { id: "panels", name: "Wood panels" },
] as const;

export const BEDDING_PATTERNS = [
  { id: "plain", name: "Plain" },
  { id: "check", name: "Checks" },
  { id: "stripes", name: "Stripes" },
  { id: "dots", name: "Dots" },
] as const;

export const HAIR_STYLES = [
  { id: "short", name: "Short" },
  { id: "swept", name: "Swept" },
  { id: "curly", name: "Curly" },
  { id: "buzz", name: "Buzz" },
  { id: "long", name: "Long" },
  { id: "braid", name: "Braid" },
  { id: "bun", name: "Bun" },
  { id: "bob", name: "Bob" },
  { id: "hijab", name: "Headscarf" },
] as const;

export const TOPS = [
  { id: "hoodie", name: "Hoodie" },
  { id: "sweater", name: "Knit sweater" },
  { id: "tee", name: "T-shirt" },
  { id: "kurta", name: "Kurta" },
  { id: "cardigan", name: "Cardigan" },
] as const;

export const BOTTOMS = [
  { id: "joggers", name: "Joggers" },
  { id: "jeans", name: "Jeans" },
  { id: "shalwar", name: "Shalwar" },
  { id: "pyjamas", name: "Check pyjamas" },
] as const;

export const VIEWS = [
  { id: "city", name: "City lights" },
  { id: "forest", name: "Pine forest" },
  { id: "lake", name: "Mountain lake" },
  { id: "sea", name: "Seaside" },
  { id: "village", name: "Snowy village" },
] as const;

export const WEATHERS = [
  { id: "rain", name: "Soft rain" },
  { id: "storm", name: "Stormy" },
  { id: "snow", name: "Snow" },
  { id: "fog", name: "Fog" },
  { id: "clear", name: "Clear sky" },
] as const;

export const TIMES = [
  { id: "day", name: "Day" },
  { id: "evening", name: "Evening" },
  { id: "night", name: "Night" },
] as const;

export const ACTIVITIES = [
  { id: "gaze", name: "Sit by the window" },
  { id: "read", name: "Read a book" },
  { id: "drink", name: "Sip something warm" },
  { id: "music", name: "Listen to music" },
  { id: "nap", name: "Take a little nap" },
] as const;

export const DRINKS = [
  { id: "tea", name: "Chai", color: "#c08a5a" },
  { id: "coffee", name: "Coffee", color: "#6b4430" },
  { id: "cocoa", name: "Hot chocolate", color: "#7a4a35" },
] as const;

export const DECOR = [
  { id: "lamp", name: "Bedside lamp", emoji: "💡" },
  { id: "fairyLights", name: "Fairy lights", emoji: "✨" },
  { id: "curtains", name: "Curtains", emoji: "🪟" },
  { id: "posters", name: "Wall prints", emoji: "🖼️" },
  { id: "polaroids", name: "Photo string", emoji: "📸" },
  { id: "bookshelf", name: "Bookshelf", emoji: "📚" },
  { id: "desk", name: "Desk and laptop", emoji: "💻" },
  { id: "recordPlayer", name: "Record player", emoji: "🎶" },
  { id: "teaTray", name: "Tea tray", emoji: "🫖" },
  { id: "candles", name: "Candles", emoji: "🕯️" },
  { id: "bookStack", name: "Book stack", emoji: "📖" },
  { id: "sillPlants", name: "Little plants", emoji: "🌱" },
  { id: "bigPlant", name: "Big plant", emoji: "🪴" },
  { id: "hangingPlant", name: "Hanging plant", emoji: "🌿" },
  { id: "rug", name: "Fluffy rug", emoji: "🧶" },
  { id: "beanBag", name: "Bean bag", emoji: "🛋️" },
  { id: "catBed", name: "Sleepy cat", emoji: "🐱" },
  { id: "moonLamp", name: "Moon lamp", emoji: "🌙" },
  { id: "teddy", name: "Teddy bear", emoji: "🧸" },
] as const;

export type HairStyle = (typeof HAIR_STYLES)[number]["id"];
export type Top = (typeof TOPS)[number]["id"];
export type Bottom = (typeof BOTTOMS)[number]["id"];
export type ViewId = (typeof VIEWS)[number]["id"];
export type Weather = (typeof WEATHERS)[number]["id"];
export type TimeOfDay = (typeof TIMES)[number]["id"];
export type Activity = (typeof ACTIVITIES)[number]["id"];
export type Drink = (typeof DRINKS)[number]["id"];
export type DecorId = (typeof DECOR)[number]["id"];
export type Wallpaper = (typeof WALLPAPERS)[number]["id"];
export type BeddingPattern = (typeof BEDDING_PATTERNS)[number]["id"];
export type Kind = "girl" | "boy";

export type CharacterLook = {
  kind: Kind;
  skin: string;
  hairStyle: HairStyle;
  hairColor: string;
  top: Top;
  topColor: string;
  bottom: Bottom;
  bottomColor: string;
  socks: string;
  glasses: boolean;
};

export type RoomLook = {
  wall: string;
  wallpaper: Wallpaper;
  bedding: string;
  beddingPattern: BeddingPattern;
  floor: string;
  rug: string;
  curtains: string;
  beanBag: string;
  decor: DecorId[];
};

export type ObjectsState = {
  lamp: boolean;
  fairy: boolean;
  candles: boolean;
  curtainsDrawn: boolean;
  laptop: boolean;
  moon: boolean;
};

export type SceneState = {
  view: ViewId;
  weather: Weather;
  time: TimeOfDay;
  activity: Activity;
  drink: Drink;
};

export type SoundPrefs = {
  enabled: boolean;
  rain: boolean;
  music: boolean;
  thunder: boolean;
  volume: number;
};

export type CozyState = {
  version: number;
  character: CharacterLook;
  room: RoomLook;
  objects: ObjectsState;
  scene: SceneState;
  sound: SoundPrefs;
};

export const KIND_DEFAULT_HAIR: Record<Kind, HairStyle> = { girl: "braid", boy: "short" };

export const DEFAULT_STATE: CozyState = {
  version: SAVE_VERSION,
  character: {
    kind: "girl",
    skin: "s4",
    hairStyle: "braid",
    hairColor: "black",
    top: "sweater",
    topColor: "lavender",
    bottom: "pyjamas",
    bottomColor: "sky",
    socks: "rose",
    glasses: false,
  },
  room: {
    wall: "cream",
    wallpaper: "plain",
    bedding: "sage",
    beddingPattern: "plain",
    floor: "oak",
    rug: "cream",
    curtains: "rose",
    beanBag: "mustard",
    decor: [
      "lamp",
      "fairyLights",
      "curtains",
      "posters",
      "bookshelf",
      "desk",
      "recordPlayer",
      "teaTray",
      "candles",
      "bookStack",
      "sillPlants",
      "bigPlant",
      "rug",
      "catBed",
      "moonLamp",
    ],
  },
  objects: { lamp: true, fairy: true, candles: true, curtainsDrawn: false, laptop: false, moon: true },
  scene: { view: "city", weather: "rain", time: "evening", activity: "gaze", drink: "tea" },
  sound: { enabled: false, rain: true, music: true, thunder: true, volume: 0.6 },
};

/* ------------------------------- validation ------------------------------- */

const ids = <T extends readonly { id: string }[]>(list: T) => list.map((x) => x.id) as [T[number]["id"], ...T[number]["id"][]];
const swatchIds = (list: Swatch[]) => list.map((x) => x.id) as [string, ...string[]];

const pick = <T extends [string, ...string[]]>(values: T, fallback: T[number]) => z.enum(values).catch(fallback);
const flag = (fallback: boolean) => z.boolean().catch(fallback);

const D = DEFAULT_STATE;
const DECOR_IDS = new Set<string>(DECOR.map((d) => d.id));

const CharacterSchema = z
  .object({
    kind: pick(["girl", "boy"], D.character.kind),
    skin: pick(swatchIds(SKINS), D.character.skin),
    hairStyle: pick(ids(HAIR_STYLES), D.character.hairStyle),
    hairColor: z.enum([...swatchIds(HAIR_COLORS), ...swatchIds(FABRICS)] as [string, ...string[]]).catch(D.character.hairColor),
    top: pick(ids(TOPS), D.character.top),
    topColor: pick(swatchIds(FABRICS), D.character.topColor),
    bottom: pick(ids(BOTTOMS), D.character.bottom),
    bottomColor: pick(swatchIds(FABRICS), D.character.bottomColor),
    socks: pick(swatchIds(FABRICS), D.character.socks),
    glasses: flag(D.character.glasses),
  })
  .catch(D.character);

const RoomSchema = z
  .object({
    wall: pick(swatchIds(WALLS), D.room.wall),
    wallpaper: pick(ids(WALLPAPERS), D.room.wallpaper),
    bedding: pick(swatchIds(FABRICS), D.room.bedding),
    beddingPattern: pick(ids(BEDDING_PATTERNS), D.room.beddingPattern),
    floor: pick(swatchIds(FLOORS), D.room.floor),
    rug: pick(swatchIds(FABRICS), D.room.rug),
    curtains: pick(swatchIds(FABRICS), D.room.curtains),
    beanBag: pick(swatchIds(FABRICS), D.room.beanBag),
    decor: z
      .array(z.unknown())
      .max(80)
      .transform((list) => [...new Set(list.filter((id): id is DecorId => typeof id === "string" && DECOR_IDS.has(id)))])
      .catch(D.room.decor),
  })
  .catch(D.room);

const ObjectsSchema = z
  .object({
    lamp: flag(D.objects.lamp),
    fairy: flag(D.objects.fairy),
    candles: flag(D.objects.candles),
    curtainsDrawn: flag(D.objects.curtainsDrawn),
    laptop: flag(D.objects.laptop),
    moon: flag(D.objects.moon),
  })
  .catch(D.objects);

const SceneSchema = z
  .object({
    view: pick(ids(VIEWS), D.scene.view),
    weather: pick(ids(WEATHERS), D.scene.weather),
    time: pick(ids(TIMES), D.scene.time),
    activity: pick(ids(ACTIVITIES), D.scene.activity),
    drink: pick(ids(DRINKS), D.scene.drink),
  })
  .catch(D.scene);

const SoundSchema = z
  .object({
    enabled: flag(D.sound.enabled),
    rain: flag(D.sound.rain),
    music: flag(D.sound.music),
    thunder: flag(D.sound.thunder),
    volume: z.number().min(0).max(1).catch(D.sound.volume),
  })
  .catch(D.sound);

const SaveSchema = z.object({
  character: CharacterSchema,
  room: RoomSchema,
  objects: ObjectsSchema,
  scene: SceneSchema,
  sound: SoundSchema,
});

/** Turns untrusted saved JSON into a complete, valid state. Anything odd falls back to defaults. */
export function parseSave(raw: unknown): CozyState {
  if (!raw || typeof raw !== "object") return DEFAULT_STATE;
  const result = SaveSchema.safeParse(raw);
  if (!result.success) return DEFAULT_STATE;
  return { version: SAVE_VERSION, ...result.data } as CozyState;
}

/* --------------------------------- lookups -------------------------------- */

const byId = (list: Swatch[], id: string, fallback = list[0].color) => list.find((s) => s.id === id)?.color ?? fallback;

export const skinColor = (id: string) => byId(SKINS, id);
export const hairColor = (id: string) => byId(HAIR_COLORS, id, byId(FABRICS, id));
export const fabricColor = (id: string) => byId(FABRICS, id);
export const wallColor = (id: string) => byId(WALLS, id);
export const floorColor = (id: string) => byId(FLOORS, id);
export const drinkColor = (id: Drink) => DRINKS.find((d) => d.id === id)?.color ?? DRINKS[0].color;
