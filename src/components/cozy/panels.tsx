import { useMemo, useState, type ReactNode } from "react";
import {
  Armchair,
  BookOpen,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  Coffee,
  Disc3,
  Headphones,
  Lamp,
  Laptop,
  Moon,
  MoonStar,
  Snowflake,
  Sparkles,
  Sun,
  Sunset,
  Timer,
  Volume2,
  VolumeX,
  Wind,
  Flame,
  Blinds,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CharacterFigure } from "./character";
import { makeShade, skyPalette } from "./palette";
import {
  ACTIVITIES,
  BEDDING_PATTERNS,
  BOTTOMS,
  DECOR,
  DRINKS,
  FABRICS,
  FLOORS,
  HAIR_COLORS,
  HAIR_STYLES,
  SKINS,
  TIMES,
  TOPS,
  VIEWS,
  WALLPAPERS,
  WALLS,
  WEATHERS,
  type Activity,
  type CharacterLook,
  type CozyState,
  type DecorId,
  type Kind,
  type RoomLook,
  type SceneState,
  type SoundPrefs,
} from "./state";
import { Chips, Section, Segmented, Swatches, ToggleRow } from "./ui";
import { WindowView } from "./window-view";

export type PanelId = "character" | "decor" | "view" | "sound" | "activities";
export type ObjectId = "lamp" | "fairy" | "candles" | "curtains" | "laptop" | "moon" | "record";

export type Actions = {
  setCharacter: (patch: Partial<CharacterLook>) => void;
  setKind: (kind: Kind) => void;
  setRoom: (patch: Partial<RoomLook>) => void;
  toggleDecor: (id: DecorId) => void;
  setScene: (patch: Partial<SceneState>) => void;
  setActivity: (a: Activity) => void;
  setSound: (patch: Partial<SoundPrefs>) => void;
  interact: (id: ObjectId) => void;
  startBreathe: () => void;
  startTimer: (minutes: number) => void;
  stopTimer: () => void;
};

export const PANELS: { id: PanelId; name: string; short: string }[] = [
  { id: "character", name: "Your character", short: "Character" },
  { id: "decor", name: "Decorate your room", short: "Decorate" },
  { id: "view", name: "View and weather", short: "Weather" },
  { id: "sound", name: "Sounds", short: "Sounds" },
  { id: "activities", name: "Things to do", short: "Relax" },
];

const PLAIN = makeShade([1, 1, 1]);

/* -------------------------------- character ------------------------------- */

function CharacterPanel({ state, act, still }: { state: CozyState; act: Actions; still: boolean }) {
  const c = state.character;
  const scarf = c.hairStyle === "hijab";
  return (
    <div className="space-y-6">
      <div className="relative mx-auto flex h-44 w-44 items-end justify-center overflow-hidden rounded-full bg-gradient-to-b from-lilac-soft via-sky-soft to-sun-soft">
        <svg viewBox="-150 -290 300 300" className="h-full w-full" aria-label="Preview of your character" role="img">
          <defs>
            <pattern id="cz-check" width="14" height="14" patternUnits="userSpaceOnUse">
              <rect width="14" height="7" fill="#fff" opacity="0.55" />
              <rect width="7" height="14" fill="#fff" opacity="0.55" />
            </pattern>
          </defs>
          <CharacterFigure look={c} activity="gaze" drink={state.scene.drink} shade={PLAIN} still={still} />
        </svg>
      </div>
      <Section title="Who is relaxing today?">
        <Segmented
          label="Character"
          items={[
            { id: "girl", name: "Girl" },
            { id: "boy", name: "Boy" },
          ]}
          value={c.kind}
          onPick={(k) => act.setKind(k as Kind)}
        />
      </Section>
      <Section title="Skin tone">
        <Swatches items={SKINS} value={c.skin} onPick={(skin) => act.setCharacter({ skin })} />
      </Section>
      <Section title="Hair">
        <Chips items={HAIR_STYLES} value={c.hairStyle} onPick={(hairStyle) => act.setCharacter({ hairStyle })} />
      </Section>
      <Section title={scarf ? "Scarf colour" : "Hair colour"}>
        <Swatches items={scarf ? FABRICS : HAIR_COLORS} value={c.hairColor} onPick={(hairColor) => act.setCharacter({ hairColor })} />
      </Section>
      <Section title="Top">
        <Chips items={TOPS} value={c.top} onPick={(top) => act.setCharacter({ top })} />
        <Swatches items={FABRICS} value={c.topColor} onPick={(topColor) => act.setCharacter({ topColor })} />
      </Section>
      <Section title="Bottoms">
        <Chips items={BOTTOMS} value={c.bottom} onPick={(bottom) => act.setCharacter({ bottom })} />
        <Swatches items={FABRICS} value={c.bottomColor} onPick={(bottomColor) => act.setCharacter({ bottomColor })} />
      </Section>
      <Section title="Cosy socks">
        <Swatches items={FABRICS} value={c.socks} onPick={(socks) => act.setCharacter({ socks })} />
      </Section>
      <ToggleRow label="Glasses" hint="Round and studious" checked={c.glasses} onChange={(glasses) => act.setCharacter({ glasses })} />
    </div>
  );
}

/* --------------------------------- decorate -------------------------------- */

function DecorPanel({ state, act }: { state: CozyState; act: Actions }) {
  const [tab, setTab] = useState<"items" | "walls" | "soft">("items");
  const r = state.room;
  const has = (id: DecorId) => r.decor.includes(id);
  return (
    <div className="space-y-6">
      <Segmented
        label="Decorate"
        items={[
          { id: "items", name: "Items" },
          { id: "walls", name: "Walls" },
          { id: "soft", name: "Bed & floor" },
        ]}
        value={tab}
        onPick={(t) => setTab(t)}
      />
      {tab === "items" && (
        <Section title="Add or remove" hint={`${r.decor.length} in your room`}>
          <div className="grid grid-cols-2 gap-2">
            {DECOR.map((d) => {
              const on = has(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => act.toggleDecor(d.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left text-sm font-medium transition active:scale-[0.98]",
                    on ? "border-primary/30 bg-primary-soft text-primary-soft-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
                  )}
                >
                  <span className="text-xl leading-none" aria-hidden>
                    {d.emoji}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">{d.name}</span>
                </button>
              );
            })}
          </div>
        </Section>
      )}
      {tab === "walls" && (
        <>
          <Section title="Wall colour">
            <Swatches items={WALLS} value={r.wall} onPick={(wall) => act.setRoom({ wall })} />
          </Section>
          <Section title="Wallpaper">
            <Chips items={WALLPAPERS} value={r.wallpaper} onPick={(wallpaper) => act.setRoom({ wallpaper })} />
          </Section>
          {has("curtains") && (
            <Section title="Curtains">
              <Swatches items={FABRICS} value={r.curtains} onPick={(curtains) => act.setRoom({ curtains })} />
            </Section>
          )}
        </>
      )}
      {tab === "soft" && (
        <>
          <Section title="Bedding">
            <Swatches items={FABRICS} value={r.bedding} onPick={(bedding) => act.setRoom({ bedding })} />
            <Chips items={BEDDING_PATTERNS} value={r.beddingPattern} onPick={(beddingPattern) => act.setRoom({ beddingPattern })} />
          </Section>
          <Section title="Floor">
            <Swatches items={FLOORS} value={r.floor} onPick={(floor) => act.setRoom({ floor })} />
          </Section>
          {has("rug") && (
            <Section title="Rug">
              <Swatches items={FABRICS} value={r.rug} onPick={(rug) => act.setRoom({ rug })} />
            </Section>
          )}
          {has("beanBag") && (
            <Section title="Bean bag">
              <Swatches items={FABRICS} value={r.beanBag} onPick={(beanBag) => act.setRoom({ beanBag })} />
            </Section>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------------------------- view ---------------------------------- */

const WEATHER_ICONS: Record<string, ReactNode> = {
  rain: <CloudRain className="size-4" />,
  storm: <CloudLightning className="size-4" />,
  snow: <Snowflake className="size-4" />,
  fog: <CloudFog className="size-4" />,
  clear: <Sparkles className="size-4" />,
};
const TIME_ICONS: Record<string, ReactNode> = {
  day: <Sun className="size-4" />,
  evening: <Sunset className="size-4" />,
  night: <Moon className="size-4" />,
};

function ViewPanel({ state, act }: { state: CozyState; act: Actions }) {
  const sc = state.scene;
  const palette = useMemo(() => skyPalette(sc.time, sc.weather), [sc.time, sc.weather]);
  return (
    <div className="space-y-6">
      <Section title="Time of day">
        <Segmented label="Time of day" items={TIMES.map((t) => ({ ...t, icon: TIME_ICONS[t.id] }))} value={sc.time} onPick={(time) => act.setScene({ time })} />
      </Section>
      <Section title="Weather">
        <div className="grid grid-cols-2 gap-2">
          {WEATHERS.map((w) => (
            <button
              key={w.id}
              type="button"
              aria-pressed={sc.weather === w.id}
              onClick={() => act.setScene({ weather: w.id })}
              className={cn(
                "flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium transition active:scale-[0.98]",
                sc.weather === w.id ? "bg-primary text-primary-ink shadow-sm" : "bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink",
              )}
            >
              {WEATHER_ICONS[w.id]}
              {w.name}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Window view">
        <div className="grid grid-cols-2 gap-3">
          {VIEWS.map((v) => {
            const on = sc.view === v.id;
            return (
              <button key={v.id} type="button" aria-pressed={on} onClick={() => act.setScene({ view: v.id })} className="group text-left">
                <span
                  className={cn(
                    "block aspect-[4/3] overflow-hidden rounded-t-full rounded-b-xl border-4 transition",
                    on ? "border-primary shadow-md" : "border-surface-3 group-hover:border-line-strong",
                  )}
                >
                  <WindowView view={v.id} palette={palette} idPrefix={`thumb-${v.id}`} className="block h-full w-full" />
                </span>
                <span className={cn("mt-1.5 block text-center text-sm font-medium", on ? "text-ink" : "text-ink-2")}>{v.name}</span>
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

/* --------------------------------- sounds --------------------------------- */

function SoundPanel({ state, act }: { state: CozyState; act: Actions }) {
  const s = state.sound;
  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => act.setSound({ enabled: !s.enabled })}
        aria-pressed={s.enabled}
        className={cn(
          "flex w-full items-center gap-3 rounded-3xl p-4 text-left transition active:scale-[0.99]",
          s.enabled ? "bg-gradient-to-br from-sky-soft to-lilac-soft" : "bg-surface-2",
        )}
      >
        <span className={cn("flex size-11 items-center justify-center rounded-2xl", s.enabled ? "bg-surface text-primary shadow-sm" : "bg-surface text-ink-3")}>
          {s.enabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </span>
        <span>
          <span className="block font-display text-lg text-ink">{s.enabled ? "Sound is on" : "Sound is off"}</span>
          <span className="block text-sm text-ink-2">{s.enabled ? "Tap to make the room quiet" : "Tap to hear the rain"}</span>
        </span>
      </button>
      <div className="space-y-2">
        <ToggleRow label="Rain and weather" hint="Rain on the glass, wind and night crickets" icon={<CloudRain className="size-4" />} checked={s.rain} onChange={(rain) => act.setSound({ rain, enabled: true })} />
        <ToggleRow label="Lo-fi music" hint="Soft chords that never quite repeat" icon={<Disc3 className="size-4" />} checked={s.music} onChange={(music) => act.setSound({ music, enabled: true })} />
        <ToggleRow label="Thunder and lightning" hint="Distant rumbles in stormy weather" icon={<CloudLightning className="size-4" />} checked={s.thunder} onChange={(thunder) => act.setSound({ thunder })} />
      </div>
      <Section title="Volume">
        <div className="flex items-center gap-3">
          <VolumeX className="size-4 text-ink-3" aria-hidden />
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(s.volume * 100)}
            onChange={(e) => act.setSound({ volume: Number(e.target.value) / 100 })}
            aria-label="Volume"
            className="cz-range h-2 flex-1 cursor-pointer"
          />
          <Volume2 className="size-4 text-ink-3" aria-hidden />
        </div>
      </Section>
      <p className="rounded-2xl bg-sun-soft px-4 py-3 text-sm leading-relaxed text-ink-2">
        Every sound here is made live by your browser, so it never runs out. Headphones make the rain feel extra close.
      </p>
    </div>
  );
}

/* -------------------------------- activities ------------------------------- */

const ACTIVITY_ICONS: Record<Activity, ReactNode> = {
  gaze: <Armchair className="size-5" />,
  read: <BookOpen className="size-5" />,
  drink: <Coffee className="size-5" />,
  music: <Headphones className="size-5" />,
  nap: <MoonStar className="size-5" />,
};

function ActivitiesPanel({ state, act, timerActive, musicOn }: { state: CozyState; act: Actions; timerActive: boolean; musicOn: boolean }) {
  const has = (id: DecorId) => state.room.decor.includes(id);
  const o = state.objects;
  return (
    <div className="space-y-6">
      <Section title="What would you like to do?">
        <div className="grid grid-cols-1 gap-2">
          {ACTIVITIES.map((a) => {
            const on = state.scene.activity === a.id;
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={on}
                onClick={() => act.setActivity(a.id)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm font-medium transition active:scale-[0.99]",
                  on ? "bg-primary text-primary-ink shadow-sm" : "bg-surface-2 text-ink hover:bg-surface-3",
                )}
              >
                <span className={cn("flex size-9 items-center justify-center rounded-xl", on ? "bg-white/15" : "bg-surface")}>{ACTIVITY_ICONS[a.id]}</span>
                {a.name}
              </button>
            );
          })}
        </div>
        {state.scene.activity === "drink" && (
          <div className="pt-1">
            <Chips items={DRINKS} value={state.scene.drink} onPick={(drink) => act.setScene({ drink })} />
          </div>
        )}
      </Section>
      <Section title="A calm minute">
        <div className="grid grid-cols-1 gap-2">
          <Button variant="soft" size="lg" className="justify-start rounded-2xl" onClick={act.startBreathe}>
            <Wind /> Breathe with the rain
          </Button>
          <div className="rounded-2xl bg-surface-2 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              <Timer className="size-4" /> Quiet timer
            </p>
            <p className="mt-0.5 text-xs text-ink-3">Rest or study, and a soft chime will let you know.</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {[5, 10, 20, 30].map((m) => (
                <Button key={m} variant="secondary" size="sm" className="rounded-full" onClick={() => act.startTimer(m)}>
                  {m} min
                </Button>
              ))}
              {timerActive && (
                <Button variant="ghost" size="sm" className="rounded-full" onClick={act.stopTimer}>
                  Stop
                </Button>
              )}
            </div>
          </div>
        </div>
      </Section>
      <Section title="Around the room">
        <div className="space-y-2">
          {has("lamp") && <ToggleRow label="Bedside lamp" icon={<Lamp className="size-4" />} checked={o.lamp} onChange={() => act.interact("lamp")} />}
          {has("fairyLights") && <ToggleRow label="Fairy lights" icon={<Sparkles className="size-4" />} checked={o.fairy} onChange={() => act.interact("fairy")} />}
          {has("candles") && <ToggleRow label="Candles" icon={<Flame className="size-4" />} checked={o.candles} onChange={() => act.interact("candles")} />}
          {has("curtains") && <ToggleRow label="Curtains drawn" icon={<Blinds className="size-4" />} checked={o.curtainsDrawn} onChange={() => act.interact("curtains")} />}
          {has("recordPlayer") && <ToggleRow label="Record player" icon={<Disc3 className="size-4" />} checked={musicOn} onChange={() => act.interact("record")} />}
          {has("desk") && <ToggleRow label="Laptop" icon={<Laptop className="size-4" />} checked={o.laptop} onChange={() => act.interact("laptop")} />}
          {has("moonLamp") && has("bookshelf") && <ToggleRow label="Moon lamp" icon={<Moon className="size-4" />} checked={o.moon} onChange={() => act.interact("moon")} />}
          {!has("lamp") && !has("fairyLights") && !has("candles") && !has("curtains") && !has("recordPlayer") && !has("desk") && (
            <p className="flex items-center gap-2 text-sm text-ink-3">
              <Cloud className="size-4" /> Add a few things in Decorate to play with them here.
            </p>
          )}
        </div>
      </Section>
    </div>
  );
}

export function PanelBody({
  id,
  state,
  act,
  still,
  timerActive,
  musicOn,
}: {
  id: PanelId;
  state: CozyState;
  act: Actions;
  still: boolean;
  timerActive: boolean;
  musicOn: boolean;
}) {
  switch (id) {
    case "character":
      return <CharacterPanel state={state} act={act} still={still} />;
    case "decor":
      return <DecorPanel state={state} act={act} />;
    case "view":
      return <ViewPanel state={state} act={act} />;
    case "sound":
      return <SoundPanel state={state} act={act} />;
    case "activities":
      return <ActivitiesPanel state={state} act={act} timerActive={timerActive} musicOn={musicOn} />;
  }
}

