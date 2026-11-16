import { AnimatePresence, motion } from "motion/react";
import { pctX, pctY } from "./geometry";
import type { CozyState, DecorId } from "./state";

/* -----------------------------------------------------------------------------
   Real buttons laid over the things you can touch in the room.
----------------------------------------------------------------------------- */

export type SpotId = "window" | "lamp" | "candles" | "fairy" | "curtainsL" | "curtainsR" | "tea" | "books" | "shelf" | "moon" | "record" | "laptop" | "cat" | "plant" | "bed" | "me";

type Spot = { id: SpotId; decor?: DecorId; needs?: DecorId; x: number; y: number; w: number; h: number; label: (s: CozyState, music: boolean) => string; hidden?: boolean };

const SPOTS: Spot[] = [
  { id: "window", x: 500, y: 104, w: 600, h: 250, label: () => "Look out of the window" },
  { id: "shelf", decor: "bookshelf", x: 1300, y: 250, w: 200, h: 214, label: () => "Pick a book from the shelf" },
  { id: "moon", decor: "moonLamp", needs: "bookshelf", x: 1500, y: 390, w: 62, h: 66, label: (s) => (s.objects.moon ? "Switch off the moon lamp" : "Switch on the moon lamp") },
  { id: "fairy", decor: "fairyLights", x: 10, y: 160, w: 344, h: 74, label: (s) => (s.objects.fairy ? "Switch off the fairy lights" : "Switch on the fairy lights") },
  { id: "curtainsL", decor: "curtains", x: 404, y: 70, w: 74, h: 540, label: (s) => (s.objects.curtainsDrawn ? "Open the curtains" : "Draw the curtains") },
  { id: "curtainsR", decor: "curtains", x: 1122, y: 70, w: 74, h: 540, label: (s) => (s.objects.curtainsDrawn ? "Open the curtains" : "Draw the curtains"), hidden: true },
  { id: "lamp", decor: "lamp", x: 390, y: 504, w: 72, h: 136, label: (s) => (s.objects.lamp ? "Switch off the lamp" : "Switch on the lamp") },
  { id: "candles", decor: "candles", x: 362, y: 582, w: 46, h: 60, label: (s) => (s.objects.candles ? "Blow out the candles" : "Light the candles") },
  { id: "bed", x: 40, y: 586, w: 318, h: 168, label: () => "Have a little nap" },
  { id: "tea", decor: "teaTray", x: 556, y: 546, w: 150, h: 84, label: () => "Pour a warm drink" },
  { id: "books", decor: "bookStack", x: 984, y: 550, w: 72, h: 78, label: () => "Read a book" },
  { id: "me", x: 762, y: 384, w: 222, h: 268, label: () => "Say hello to yourself" },
  { id: "record", decor: "recordPlayer", x: 1144, y: 640, w: 140, h: 150, label: (_, music) => (music ? "Stop the record" : "Play a record") },
  { id: "laptop", decor: "desk", x: 1336, y: 494, w: 130, h: 98, label: (s) => (s.objects.laptop ? "Close the laptop" : "Open the laptop") },
  { id: "cat", decor: "catBed", x: 490, y: 850, w: 168, h: 90, label: () => "Pet the sleepy cat" },
  { id: "plant", decor: "bigPlant", x: 1440, y: 600, w: 160, h: 390, label: () => "Touch the leaves" },
];

export type Pop = { id: number; x: number; y: number; kind: "heart" | "leaf" | "note" | "spark" };

export function Hotspots({ state, music, onSpot, pops, onPopDone, still }: { state: CozyState; music: boolean; onSpot: (id: SpotId, x: number, y: number) => void; pops: Pop[]; onPopDone: (id: number) => void; still: boolean }) {
  const has = (id?: DecorId) => !id || state.room.decor.includes(id);
  return (
    <div className="absolute inset-0">
      {SPOTS.filter((s) => has(s.decor) && has(s.needs)).map((s) => {
        const label = s.label(state, music);
        const centre = s.x + s.w / 2;
        const tip = centre > 1320 ? "right-0" : centre < 280 ? "left-0" : "left-1/2 -translate-x-1/2";
        return (
          <button
            key={s.id}
            type="button"
            aria-label={label}
            aria-hidden={s.hidden || undefined}
            tabIndex={s.hidden ? -1 : undefined}
            title={label}
            onClick={() => onSpot(s.id, s.x + s.w / 2, s.y + s.h / 2)}
            className="group absolute cursor-pointer rounded-[1.4rem] outline-none transition-[background,box-shadow] duration-300 hover:bg-white/[0.06] hover:shadow-[0_0_0_2px_rgba(255,255,255,0.35),0_0_30px_rgba(255,236,200,0.25)] focus-visible:bg-white/[0.06] focus-visible:shadow-[0_0_0_3px_rgba(255,255,255,0.85)]"
            style={{ left: pctX(s.x), top: pctY(s.y), width: pctX(s.w), height: pctY(s.h) }}
          >
            <span className={`pointer-events-none absolute -top-3 ${tip} hidden -translate-y-full whitespace-nowrap rounded-full bg-[#1d1828]/85 px-3 py-1 text-xs font-medium text-white opacity-0 shadow-md backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 md:block`}>
              {label}
            </span>
          </button>
        );
      })}
      <AnimatePresence>
        {pops.map((p) => (
          <motion.span
            key={p.id}
            className="pointer-events-none absolute -translate-x-1/2 text-2xl"
            style={{ left: pctX(p.x), top: pctY(p.y) }}
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: [0, 1, 0], y: still ? -10 : -70, scale: 1.1 }}
            transition={{ duration: still ? 1 : 1.8, ease: "easeOut" }}
            onAnimationComplete={() => onPopDone(p.id)}
            aria-hidden
          >
            {p.kind === "heart" ? "💗" : p.kind === "leaf" ? "🍃" : p.kind === "note" ? "🎵" : "✨"}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
