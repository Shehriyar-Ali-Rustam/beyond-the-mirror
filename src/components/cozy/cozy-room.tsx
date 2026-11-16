"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, CloudRain, Maximize2, Minimize2, Palette, Shirt, Sparkles, Timer, Volume2, VolumeX, Wind, X } from "lucide-react";
import type { SavedGameProps } from "@/components/play/game-props";
import { cn } from "@/lib/utils";
import { CozyAudio, type Sfx } from "./audio-engine";
import { BreatheOverlay } from "./calm";
import { CharacterFigure, CheckPattern } from "./character";
import { CozyStyles } from "./cozy-styles";
import { SITTER, SITTER_BOX, SCENE_W, pctX, pctY } from "./geometry";
import { useReducedMotion, useWide } from "./hooks";
import { Hotspots, type Pop, type SpotId } from "./hotspots";
import { Lighting } from "./lighting";
import { roomLighting } from "./palette";
import { PANELS, PanelBody, type Actions, type ObjectId, type PanelId } from "./panels";
import { randRange, wallClock } from "./rng";
import { RoomBack } from "./room-back";
import { RoomFront } from "./room-front";
import { KIND_DEFAULT_HAIR, parseSave, type Activity, type CozyState, type TimeOfDay, type Weather } from "./state";
import { WindowGlass, type GlassControl, type Pointer } from "./window-glass";

/* -----------------------------------------------------------------------------
   Cozy Room: a little rainy escape. A student picks their character, decorates
   the room, changes the view and weather, and simply rests for a while.
----------------------------------------------------------------------------- */

const WEATHER_LINES: Record<Weather, string> = {
  rain: "Soft rain on the window. Nowhere you need to be.",
  storm: "A storm outside. You are safe and warm in here.",
  snow: "Snow is falling, quiet and slow.",
  fog: "Fog has wrapped the world in a soft blanket.",
  clear: "The sky has cleared. Take a deep breath.",
};
const TIME_LINES: Record<TimeOfDay, string> = {
  day: "A slow, grey-blue afternoon.",
  evening: "The sky is turning soft and golden.",
  night: "Night time. The lamps feel extra cosy now.",
};
const ACTIVITY_LINES: Record<Activity, string> = {
  gaze: "Watching the world outside the window.",
  read: "Lost in a good book.",
  drink: "Something warm to hold. Little sips.",
  music: "Headphones on. Just the music and the rain.",
  nap: "A tiny nap. You have earned it.",
};
const KIND_WORDS = [
  "You are allowed to rest.",
  "You are doing better than you think.",
  "This moment is just for you.",
  "Breathe out. Let your shoulders drop.",
  "It is okay to take things slowly.",
];

const STAGE_PHONE = "min(62svh, 520px)";
const STAGE_FULL = "min(100svh, max(62.5vw, 70svh))";

export default function CozyRoom({ initialSave, onSave, signedIn }: SavedGameProps) {
  const [state, setState] = useState<CozyState>(() => parseSave(initialSave));
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [audioLive, setAudioLive] = useState(false);
  const [caption, setCaption] = useState<{ id: number; text: string } | null>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  const [fx, setFx] = useState({ purring: false, rustle: 0, brewing: false });
  const [breathing, setBreathing] = useState(false);
  const [timer, setTimer] = useState<{ end: number; left: number } | null>(null);
  const [isFull, setIsFull] = useState(false);
  const [hint, setHint] = useState(true);
  const reduced = useReducedMotion();
  const wide = useWide();

  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audio = useRef<CozyAudio | null>(null);
  const pointer = useRef<Pointer>({ x: 0, y: 0 });
  const glass = useRef<GlassControl | null>(null);
  const flashRef = useRef<SVGRectElement>(null);
  const captionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popId = useRef(0);
  const saved = useRef(false);

  const { character, room, objects, scene, sound } = state;
  const decor = useMemo(() => new Set<string>(room.decor), [room.decor]);
  const light = useMemo(() => roomLighting(scene.time, scene.weather, objects, decor), [scene.time, scene.weather, objects, decor]);
  const musicOn = audioLive && sound.enabled && sound.music;
  const lampOn = decor.has("lamp") && objects.lamp;

  /* ------------------------------- saving -------------------------------- */

  useEffect(() => {
    if (!saved.current) {
      saved.current = true;
      return;
    }
    onSave(state);
  }, [state, onSave]);

  /* -------------------------------- audio -------------------------------- */

  const ensureAudio = useCallback(() => {
    if (!audio.current) {
      try {
        audio.current = new CozyAudio();
      } catch {
        return null;
      }
      setAudioLive(true);
    }
    audio.current.resume();
    return audio.current;
  }, []);

  useEffect(() => {
    const a = audio.current;
    if (!a || !audioLive) return;
    a.setScene(scene.weather, scene.time);
    a.setAmbience(sound.rain);
    a.setThunder(sound.thunder);
    a.setMusic(sound.enabled && sound.music);
    a.setEnabled(sound.enabled, sound.volume);
  }, [audioLive, scene.weather, scene.time, sound.rain, sound.thunder, sound.music, sound.enabled, sound.volume]);

  useEffect(
    () => () => {
      audio.current?.dispose();
      audio.current = null;
    },
    [],
  );

  const sfx = useCallback((name: Sfx) => {
    audio.current?.sfx(name);
  }, []);
  const onPageTurn = useCallback(() => audio.current?.sfx("page"), []);
  const onBreath = useCallback((level: number) => audio.current?.setBreath(level), []);
  const onPopDone = useCallback((id: number) => setPops((p) => p.filter((x) => x.id !== id)), []);
  const closeBreathe = useCallback(() => setBreathing(false), []);

  useEffect(
    () => () => {
      if (captionTimer.current) clearTimeout(captionTimer.current);
    },
    [],
  );

  /* ------------------------------ lightning ------------------------------- */

  useEffect(() => {
    if (!sound.thunder || (scene.weather !== "storm" && scene.weather !== "rain")) return;
    const storm = scene.weather === "storm";
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(
        () => {
          if (storm && !reduced) {
            glass.current?.strike();
            flashRef.current?.animate(
              [
                { opacity: 0 },
                { opacity: 0.1, offset: 0.14 },
                { opacity: 0.03, offset: 0.3 },
                { opacity: 0.07, offset: 0.4 },
                { opacity: 0 },
              ],
              { duration: 1400, easing: "ease-out" },
            );
          }
          audio.current?.thunder(storm ? randRange(0.65, 1) : randRange(0.25, 0.4), storm ? randRange(0.6, 2.6) : 0);
          next();
        },
        storm ? randRange(9000, 22000) : randRange(45000, 100000),
      );
    };
    next();
    return () => clearTimeout(t);
  }, [scene.weather, sound.thunder, reduced]);

  /* --------------------------- little helpers ---------------------------- */

  const say = useCallback((text: string) => {
    if (captionTimer.current) clearTimeout(captionTimer.current);
    setCaption({ id: wallClock(), text });
    captionTimer.current = setTimeout(() => setCaption(null), 4200);
  }, []);

  const pop = useCallback((x: number, y: number, kind: Pop["kind"], count = 1) => {
    setPops((p) => [...p, ...Array.from({ length: count }, (_, i) => ({ id: ++popId.current, x: x + (i - (count - 1) / 2) * 34, y, kind }))]);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setHint(false), 5000);
    return () => clearTimeout(t);
  }, []);

  /* ------------------------------- actions ------------------------------- */

  const update = useCallback((fn: (s: CozyState) => CozyState) => setState(fn), []);

  const setActivity = useCallback(
    (a: Activity) => {
      update((s) => ({ ...s, scene: { ...s.scene, activity: a } }));
      say(ACTIVITY_LINES[a]);
      if (a === "read") sfx("page");
      if (a === "drink") sfx("clink");
      if (a === "nap") sfx("tap");
      if (a === "music") {
        ensureAudio();
        update((s) => ({ ...s, sound: { ...s.sound, enabled: true, music: true } }));
      }
    },
    [update, say, sfx, ensureAudio],
  );

  const interact = useCallback(
    (id: ObjectId) => {
      const o = state.objects;
      switch (id) {
        case "lamp":
          sfx("click");
          update((s) => ({ ...s, objects: { ...s.objects, lamp: !s.objects.lamp } }));
          say(o.lamp ? "Lamp off. Let the window light in." : "Lamp on. Warm and golden.");
          break;
        case "fairy":
          sfx(o.fairy ? "click" : "chime");
          update((s) => ({ ...s, objects: { ...s.objects, fairy: !s.objects.fairy } }));
          break;
        case "candles":
          sfx(o.candles ? "blow" : "match");
          update((s) => ({ ...s, objects: { ...s.objects, candles: !s.objects.candles } }));
          say(o.candles ? "Candles out. A little curl of smoke." : "Candles lit. Watch the flames dance.");
          break;
        case "curtains":
          sfx("swish");
          update((s) => ({ ...s, objects: { ...s.objects, curtainsDrawn: !s.objects.curtainsDrawn } }));
          break;
        case "laptop":
          sfx("click");
          update((s) => ({ ...s, objects: { ...s.objects, laptop: !s.objects.laptop } }));
          say(o.laptop ? "Laptop closed. Screens can wait." : "Just a calm wallpaper. No notifications here.");
          break;
        case "moon":
          sfx("click");
          update((s) => ({ ...s, objects: { ...s.objects, moon: !s.objects.moon } }));
          break;
        case "record":
          if (musicOn) {
            update((s) => ({ ...s, sound: { ...s.sound, music: false } }));
            say("Record off. Just the rain now.");
          } else {
            const a = ensureAudio();
            a?.sfx("needle");
            update((s) => ({ ...s, sound: { ...s.sound, enabled: true, music: true } }));
            say("Needle down. Soft lo-fi on the record player.");
          }
          break;
      }
    },
    [state.objects, musicOn, sfx, update, say, ensureAudio],
  );

  const onSpot = useCallback(
    (id: SpotId, x: number, y: number) => {
      switch (id) {
        case "window":
          setActivity("gaze");
          say(WEATHER_LINES[scene.weather]);
          break;
        case "lamp":
        case "candles":
        case "laptop":
        case "moon":
          interact(id);
          break;
        case "fairy":
          interact("fairy");
          pop(x, y, "spark");
          break;
        case "curtainsL":
        case "curtainsR":
          interact("curtains");
          break;
        case "record":
          interact("record");
          pop(x, y - 60, "note");
          break;
        case "tea":
          sfx("pour");
          setFx((f) => ({ ...f, brewing: true }));
          setTimeout(() => setFx((f) => ({ ...f, brewing: false })), 7000);
          update((s) => ({ ...s, scene: { ...s.scene, activity: "drink" } }));
          say(scene.drink === "coffee" ? "A fresh cup of coffee. Hold it with both hands." : scene.drink === "cocoa" ? "Hot chocolate with marshmallows. Perfect." : "A cup of chai, just how you like it.");
          break;
        case "books":
        case "shelf":
          setActivity("read");
          break;
        case "bed":
          setActivity("nap");
          break;
        case "cat":
          sfx("purr");
          pop(x, y - 40, "heart", 2);
          setFx((f) => ({ ...f, purring: true }));
          setTimeout(() => setFx((f) => ({ ...f, purring: false })), 2600);
          say("Prrrr. The cat stretches a paw and goes back to sleep.");
          break;
        case "plant":
          sfx("rustle");
          pop(x, y - 140, "leaf");
          setFx((f) => ({ ...f, rustle: f.rustle + 1 }));
          say("The leaves rustle softly.");
          break;
        case "me":
          sfx("tap");
          pop(x, y - 120, "heart");
          say(KIND_WORDS[Math.floor(randRange(0, KIND_WORDS.length))]);
          break;
      }
    },
    [scene.weather, scene.drink, setActivity, interact, pop, sfx, update, say],
  );

  const actions: Actions = useMemo(
    () => ({
      setCharacter: (patch) => update((s) => ({ ...s, character: { ...s.character, ...patch } })),
      setKind: (kind) => update((s) => ({ ...s, character: { ...s.character, kind, hairStyle: KIND_DEFAULT_HAIR[kind], hairColor: s.character.hairStyle === "hijab" ? "black" : s.character.hairColor } })),
      setRoom: (patch) => update((s) => ({ ...s, room: { ...s.room, ...patch } })),
      toggleDecor: (id) => {
        const on = state.room.decor.includes(id);
        sfx(on ? "unpop" : "pop");
        update((s) => ({ ...s, room: { ...s.room, decor: on ? s.room.decor.filter((d) => d !== id) : [...s.room.decor, id] } }));
      },
      setScene: (patch) => {
        update((s) => ({ ...s, scene: { ...s.scene, ...patch } }));
        if (patch.weather) say(WEATHER_LINES[patch.weather]);
        if (patch.time) say(TIME_LINES[patch.time]);
      },
      setActivity,
      setSound: (patch) => {
        if (patch.enabled || patch.music || patch.rain) ensureAudio();
        update((s) => ({ ...s, sound: { ...s.sound, ...patch } }));
      },
      interact,
      startBreathe: () => {
        ensureAudio();
        setPanel(null);
        setBreathing(true);
      },
      startTimer: (minutes) => {
        const end = wallClock() + minutes * 60_000;
        setTimer({ end, left: minutes * 60 });
        say(`Quiet time: ${minutes} minutes. I will chime when it is done.`);
      },
      stopTimer: () => setTimer(null),
    }),
    [update, sfx, say, setActivity, interact, ensureAudio, state.room.decor],
  );

  /* -------------------------------- timer -------------------------------- */

  const timerEnd = timer?.end ?? 0;
  useEffect(() => {
    if (!timerEnd) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((timerEnd - wallClock()) / 1000));
      if (left <= 0) {
        setTimer(null);
        audio.current?.sfx("chime");
        say("Your quiet time is done. Nicely rested.");
      } else setTimer((t) => (t ? { ...t, left } : t));
    }, 1000);
    return () => clearInterval(id);
  }, [timerEnd, say]);

  /* ------------------------- parallax and layout ------------------------- */

  useEffect(() => {
    if (reduced) {
      pointer.current = { x: 0, y: 0 };
      return;
    }
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      pointer.current = { x: Math.max(-1, Math.min(1, e.gamma / 25)), y: Math.max(-1, Math.min(1, (e.beta - 45) / 25)) };
    };
    window.addEventListener("deviceorientation", onTilt);
    return () => window.removeEventListener("deviceorientation", onTilt);
  }, [reduced]);

  // On narrow screens the room is wider than the screen: start centred on the character.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (wide && !isFull) {
      el.scrollLeft = 0;
      return;
    }
    if (el.scrollWidth <= el.clientWidth + 2) return;
    el.scrollLeft = el.scrollWidth * (SITTER.x / SCENE_W) - el.clientWidth / 2;
  }, [wide, isFull]);

  useEffect(() => {
    const onChange = () => setIsFull(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const canFull = typeof document !== "undefined" && !!document.fullscreenEnabled;
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.().catch(() => {});
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    pointer.current = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 };
  };

  // Coming back with sound switched on: the first tap anywhere wakes it up (and
  // later taps resume it if the browser paused it).
  const wakeSound = () => {
    if (sound.enabled) ensureAudio();
  };

  const openPanel = (id: PanelId | null) => {
    setPanel(id);
    // On phones the sheet covers the bottom of the screen, so bring the room up to the top.
    if (id && !wide && !isFull) {
      const top = (rootRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 72;
      window.scrollTo({ top: Math.max(0, top), behavior: reduced ? "auto" : "smooth" });
    }
  };

  const sleeping = sound.enabled && !audioLive;
  const panelInfo = PANELS.find((p) => p.id === panel);

  const panelContent = panel && (
    <PanelBody id={panel} state={state} act={actions} still={reduced} timerActive={!!timer} musicOn={musicOn} />
  );

  const stageSize = isFull
    ? { height: STAGE_FULL, width: `calc(${STAGE_FULL} * 1.6)` }
    : wide
      ? undefined
      : { height: STAGE_PHONE, width: `calc(${STAGE_PHONE} * 1.6)` };

  const sheet = !wide && (
    <AnimatePresence>
      {panel && panelInfo && (
        <motion.div
          key="sheet"
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[56svh] flex-col rounded-t-[1.75rem] border-t border-line bg-surface shadow-[0_-18px_50px_-20px_rgba(20,16,30,0.45)]"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={reduced ? { duration: 0 } : { type: "spring", damping: 30, stiffness: 320 }}
          role="dialog"
          aria-label={panelInfo.name}
        >
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line-strong" aria-hidden />
          <div className="flex items-center justify-between px-5 pb-2 pt-2">
            <h2 className="font-display text-xl text-ink">{panelInfo.name}</h2>
            <button type="button" onClick={() => setPanel(null)} aria-label="Close panel" className="flex size-9 items-center justify-center rounded-full bg-surface-2 text-ink-2 hover:text-ink">
              <X className="size-4" />
            </button>
          </div>
          <div className="scrollbar-thin overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1">{panelContent}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div
      ref={rootRef}
      data-cozy-root
      onPointerUpCapture={wakeSound}
      onKeyDownCapture={wakeSound}
      className={cn("relative", isFull && "flex h-full w-full flex-col items-center justify-center bg-[#120e1a]")}
    >
      <CozyStyles />
      <div className={cn("relative overflow-hidden bg-[#1b1726] shadow-lg", isFull ? "w-full" : "rounded-[2rem]")}>
        <div ref={scrollRef} className={cn("cz-noscroll relative overflow-x-auto overflow-y-hidden overscroll-x-contain", wide && !isFull && "overflow-hidden")}>
          <div className={cn("relative select-none overflow-hidden", isFull && "mx-auto", wide && !isFull && "aspect-[16/10] w-full")} style={stageSize} onPointerMove={onPointerMove} onPointerLeave={() => (pointer.current = { x: 0, y: 0 })}>
            <RoomBack room={room} shade={light.shade} />
            <WindowGlass view={scene.view} weather={scene.weather} time={scene.time} lampOn={lampOn} reduced={reduced} pointerRef={pointer} controlRef={glass} />
            <RoomFront room={room} objects={objects} shade={light.shade} still={reduced} fx={{ musicOn, purring: fx.purring, rustle: fx.rustle, brewing: fx.brewing }} />
            <svg
              viewBox={`-150 -310 ${SITTER_BOX.w} ${SITTER_BOX.h}`}
              className="pointer-events-none absolute"
              style={{ left: pctX(SITTER_BOX.x), top: pctY(SITTER_BOX.y), width: pctX(SITTER_BOX.w), height: pctY(SITTER_BOX.h) }}
              aria-hidden
            >
              <defs>
                <CheckPattern />
              </defs>
              <g transform="scale(1.1)">
              <CharacterFigure
                key={`${scene.activity}-${reduced}`}
                look={character}
                activity={scene.activity}
                drink={scene.drink}
                shade={light.shade}
                still={reduced}
                onPageTurn={scene.activity === "read" ? onPageTurn : undefined}
              />
              </g>
            </svg>
            <Lighting time={scene.time} weather={scene.weather} objects={objects} decor={decor} glow={light.glow} still={reduced} flashRef={flashRef} />
            <Hotspots state={state} music={musicOn} onSpot={onSpot} pops={pops} onPopDone={onPopDone} still={reduced} />
          </div>
        </div>

        {/* overlays that stay put while the room scrolls */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div className="pointer-events-auto flex flex-wrap gap-2">
            {!audioLive || !sound.enabled ? (
              <button
                type="button"
                onClick={() => actions.setSound({ enabled: true })}
                className="flex items-center gap-2 rounded-full bg-white/90 px-3.5 py-2 text-sm font-medium text-ink shadow-md backdrop-blur transition hover:bg-white"
              >
                <Volume2 className="size-4 text-primary" />
                {sleeping ? "Tap to bring the sounds back" : scene.weather === "rain" || scene.weather === "storm" ? "Turn on the rain sounds" : "Turn on the cosy sounds"}
              </button>
            ) : null}
            {timer && (
              <span className="flex items-center gap-1.5 rounded-full bg-[#1d1828]/70 px-3 py-2 text-sm font-medium text-white backdrop-blur">
                <Timer className="size-4" />
                {Math.floor(timer.left / 60)}:{String(timer.left % 60).padStart(2, "0")}
              </span>
            )}
          </div>
          <div className="pointer-events-auto flex gap-2">
            {audioLive && sound.enabled && (
              <button
                type="button"
                onClick={() => actions.setSound({ enabled: false })}
                aria-label="Mute all sounds"
                className="flex size-9 items-center justify-center rounded-full bg-[#1d1828]/55 text-white backdrop-blur transition hover:bg-[#1d1828]/75"
              >
                <Volume2 className="size-4" />
              </button>
            )}
            {canFull && (
              <button
                type="button"
                onClick={toggleFull}
                aria-label={isFull ? "Leave full screen" : "Full screen"}
                className="flex size-9 items-center justify-center rounded-full bg-[#1d1828]/55 text-white backdrop-blur transition hover:bg-[#1d1828]/75"
              >
                {isFull ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </button>
            )}
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3 sm:justify-start">
          <AnimatePresence mode="wait">
            {caption && (
              <motion.p
                key={caption.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.4 }}
                className="max-w-[90%] rounded-full bg-[#1d1828]/65 px-4 py-2 text-center text-sm text-white shadow-md backdrop-blur-md sm:max-w-md sm:text-left"
                aria-live="polite"
              >
                {caption.text}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {!wide && hint && !isFull && (
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-1.5" aria-hidden>
            <span className="flex size-8 items-center justify-center rounded-full bg-white/70 text-ink shadow animate-pulse">
              <ChevronLeft className="size-4" />
            </span>
            <span className="flex size-8 items-center justify-center rounded-full bg-white/70 text-ink shadow animate-pulse">
              <ChevronRight className="size-4" />
            </span>
          </div>
        )}

        <AnimatePresence>{breathing && <BreatheOverlay still={reduced} onClose={closeBreathe} onBreath={onBreath} />}</AnimatePresence>

        {/* side panel on wider screens */}
        {wide && (
          <AnimatePresence>
            {panel && panelInfo && (
              <motion.div
                key="side"
                className="absolute bottom-3 right-3 top-3 z-30 flex w-[min(360px,42%)] flex-col overflow-hidden rounded-3xl border border-white/40 bg-surface/95 shadow-lg backdrop-blur-md"
                initial={{ x: 40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 40, opacity: 0 }}
                transition={reduced ? { duration: 0 } : { type: "spring", damping: 30, stiffness: 300 }}
                role="dialog"
                aria-label={panelInfo.name}
              >
                <div className="flex items-center justify-between px-5 pb-2 pt-4">
                  <h2 className="font-display text-xl text-ink">{panelInfo.name}</h2>
                  <button type="button" onClick={() => setPanel(null)} aria-label="Close panel" className="flex size-9 items-center justify-center rounded-full bg-surface-2 text-ink-2 hover:text-ink">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-5 pt-1">{panelContent}</div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* toolbar */}
      <nav aria-label="Cozy Room controls" className={cn("mt-3 grid grid-cols-5 gap-1.5 rounded-3xl border border-line bg-surface p-1.5 shadow-sm sm:gap-2 sm:p-2", isFull && "absolute bottom-3 left-1/2 w-[min(640px,94vw)] -translate-x-1/2 bg-surface/90 backdrop-blur")}>
        {PANELS.map((p) => {
          const Icon = { character: Shirt, decor: Palette, view: CloudRain, sound: sound.enabled && audioLive ? Volume2 : VolumeX, activities: Sparkles }[p.id];
          const on = panel === p.id;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              aria-label={p.name}
              onClick={() => openPanel(on ? null : p.id)}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-medium transition active:scale-[0.97] sm:flex-row sm:gap-2 sm:py-2.5 sm:text-sm",
                on ? "bg-primary text-primary-ink shadow-sm" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon className="size-5 shrink-0 sm:size-4" aria-hidden />
              <span className="truncate">{p.short}</span>
            </button>
          );
        })}
      </nav>
      {!isFull && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-sm text-ink-3">
          <p>Tap things in the room to use them. {signedIn ? "Your room is saved to your account." : "Your room is saved on this device."}</p>
          <button type="button" onClick={actions.startBreathe} className="inline-flex items-center gap-1.5 rounded-full bg-sky-soft px-3.5 py-1.5 font-medium text-ink transition hover:brightness-[0.97]">
            <Wind className="size-4 text-sky" /> Breathe with the rain
          </button>
        </div>
      )}

      {typeof document !== "undefined" && (isFull ? sheet : createPortal(sheet, document.body))}
    </div>
  );
}
