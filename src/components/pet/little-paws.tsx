"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import type { SavedGameProps } from "@/components/play/game-props";
import { Confetti } from "@/components/play/shared";
import { Button } from "@/components/ui/button";
import { Adopt, type Draft } from "./adopt";
import { audio } from "./audio";
import { ACCESSORIES, DEFAULT_DECOR, FOOD_BY_ID, ROOMS, friendLevel } from "./catalog";
import { ChatEngine } from "./chat-engine";
import { ChatPanel, type ChatMsg } from "./chat-panel";
import { NameChip, RoomNav, StatMeters, Toolbar, TopRight, type ToolId } from "./hud";
import { LAYOUTS } from "./layouts";
import { BathBar, PlayBar, SleepBar, TalkBar } from "./modes";
import { DressPanel, FeedPanel, MenuPanel, RoomPanel } from "./panels";
import { DEFAULT_STATS, addStats, applyAway, defaultSave, parseSave, tickStats } from "./save";
import PetScene from "./scene";
import { SPECIES } from "./species";
import type { Accessories, Decor, FoodId, Lighting, LightingChoice, Panel, PetLook, RoomId, SaveData, Slot, Stats, WorldEvent } from "./types";
import { World, type Bubble, type CamMode, type ChatMood } from "./world";

// Impure helpers live outside the component (React Compiler rules).
const nowMs = () => Date.now();
const hourNow = () => new Date().getHours();
const rand = () => Math.random();

type Mode = "bath" | "play" | "sleep" | "talk" | null;
const EMPTY_ACC: Accessories = {};

function autoLighting(h: number): Lighting {
  if (h >= 7 && h < 17) return "day";
  if (h >= 17 && h < 20) return "evening";
  return "night";
}

function boot(initial: unknown) {
  const now = nowMs();
  const save = parseSave(initial, now);
  const away = save.pet ? Math.max(0, now - save.savedAt) : 0;
  if (save.pet) save.stats = applyAway(save.stats, away);
  return { save, away };
}

function serialize(s: SaveData, now: number) {
  return { ...s, savedAt: now, stats: { ...s.stats } };
}

function unlocksFor(friendship: number, current: string[]) {
  const add = ACCESSORIES.filter((a) => a.unlockAt <= friendship && !current.includes(a.id)).map((a) => a.id);
  return add.length ? [...current, ...add] : current;
}

function formatAway(ms: number) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} minutes`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"}`;
}

type CareKind = "meals" | "baths" | "plays" | "pets" | "talks";

export default function LittlePaws({ initialSave, onSave, signedIn }: SavedGameProps) {
  const [bootData] = useState(() => boot(initialSave));
  const [save, setSave] = useState<SaveData>(bootData.save);
  const [panel, setPanel] = useState<Panel>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [playMode, setPlayMode] = useState<"ball" | "yarn" | "hide" | null>(null);
  const [bubble, setBubble] = useState<Bubble>(null);
  const [hour, setHour] = useState(hourNow);
  const [active, setActive] = useState(true);
  const [fade, setFade] = useState(false);
  const [welcome, setWelcome] = useState(() => bootData.away > 10 * 60_000 && !!bootData.save.pet);
  const [hideMsg, setHideMsg] = useState<string | null>(null);
  const [asleep, setAsleep] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [wide, setWide] = useState(false);
  const [celebrate, setCelebrate] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => ({ species: "dog", look: SPECIES.dog.defaultLook, name: "" }));
  const reduced = useReducedMotion() ?? false;

  const pet = save.pet;
  const species = pet?.species ?? draft.species;
  const look = pet?.look ?? draft.look;
  const acc = pet?.acc ?? EMPTY_ACC;
  const fish = species === "goldfish";
  const room: RoomId = pet ? save.room : "living";
  const decor: Decor = save.decor[room] ?? DEFAULT_DECOR[room] ?? { wall: "sunny", floor: "oak" };
  // The adoption centre is always bright and welcoming.
  const lighting: Lighting = !save.pet ? "day" : save.lighting === "auto" ? autoLighting(hour) : save.lighting;

  const worldRef = useRef<World | null>(null);
  if (worldRef.current === null) worldRef.current = new World(species, room);
  const chatEngine = useRef<ChatEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef(save);
  const msgId = useRef(0);
  const lastTouch = useRef(0);
  const chatGain = useRef(0);
  const lastTick = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    saveRef.current = save;
  });

  // ------------------------------------------------------------------ saving

  const lastSaved = useRef({ key: "", at: 0 });
  useEffect(() => {
    if (!save.pet) return;
    const { stats: _s, savedAt: _a, ...rest } = save;
    void _s;
    void _a;
    const key = JSON.stringify(rest);
    const t = nowMs();
    // Meaningful changes save straight away; slow stat drift every 30 seconds.
    if (key !== lastSaved.current.key || t - lastSaved.current.at > 30_000) {
      lastSaved.current = { key, at: t };
      onSave(serialize(save, t));
    }
  }, [save, onSave]);

  useEffect(() => {
    const flush = () => {
      if (saveRef.current.pet) onSave(serialize(saveRef.current, nowMs()));
    };
    const onVis = () => document.hidden && flush();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      flush();
    };
  }, [onSave]);

  // ------------------------------------------------------------------ time passing

  const hasPet = !!pet;
  useEffect(() => {
    if (!hasPet) return;
    lastTick.current = nowMs();
    const id = setInterval(() => {
      const t = nowMs();
      const secs = (t - lastTick.current) / 1000;
      lastTick.current = t;
      const w = worldRef.current;
      setSave((s) => ({
        ...s,
        // Long gaps (tab asleep) use the gentle away rules.
        stats: secs > 90 ? applyAway(s.stats, secs * 1000) : tickStats(s.stats, secs, { asleep: !!w?.asleep, playing: !!w?.playMode, inBath: !!w?.bath.active }),
      }));
    }, 4000);
    return () => clearInterval(id);
  }, [hasPet]);

  useEffect(() => {
    const id = setInterval(() => setHour(hourNow()), 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  // ------------------------------------------------------------------ keeping the world in sync

  useEffect(() => {
    worldRef.current?.setSpecies(species);
  }, [species]);
  useEffect(() => {
    worldRef.current?.setRoom(room);
  }, [room]);
  useEffect(() => {
    worldRef.current?.setStats(save.stats, save.friendship);
  }, [save.stats, save.friendship]);
  useEffect(() => {
    const w = worldRef.current;
    if (!w) return;
    w.musicOn = save.sound.music;
    w.reduced = reduced;
    w.pitch = 0.92 + ((pet?.name.length ?? 5) % 5) * 0.04;
  }, [save.sound.music, reduced, pet?.name]);

  const camMode: CamMode = !pet ? "adopt" : panel === "dress" ? "pet" : panel === "chat" || mode === "talk" ? "face" : mode === "bath" ? "bath" : mode === "sleep" ? (LAYOUTS[room].bed && !fish ? "bed" : "pet") : "room";
  const sidePanel = !!pet && panel !== null;
  useEffect(() => {
    const w = worldRef.current;
    if (!w) return;
    w.camMode = camMode;
    w.stay = !pet || panel === "dress" ? "present" : panel === "chat" || mode === "talk" ? "sit" : "off";
    if (!pet) w.viewShift = wide ? { x: -0.17, y: 0 } : { x: 0, y: 0.26 };
    else if (sidePanel) w.viewShift = wide ? { x: 0.17, y: 0 } : { x: 0, y: panel === "chat" ? 0.3 : 0.22 };
    else if (mode === "bath" || mode === "talk" || mode === "play") w.viewShift = wide ? { x: 0, y: 0.04 } : { x: 0, y: 0.08 };
    else w.viewShift = { x: 0, y: 0 };
  }, [camMode, pet, sidePanel, wide, panel, mode]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Pause rendering and sound when the tab is hidden or the game is scrolled away.
  useEffect(() => {
    const el = containerRef.current;
    let visible = !document.hidden;
    let inView = true;
    const update = () => {
      const on = visible && inView;
      setActive(on);
      audio.suspend(!on);
    };
    const onVis = () => {
      visible = !document.hidden;
      update();
    };
    document.addEventListener("visibilitychange", onVis);
    const io = new IntersectionObserver(
      ([en]) => {
        inView = en.isIntersecting;
        update();
      },
      { threshold: 0.02 },
    );
    if (el) io.observe(el);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      io.disconnect();
    };
  }, []);

  // Sound settings and ambience
  useEffect(() => audio.setSfx(save.sound.sfx), [save.sound.sfx]);
  useEffect(() => audio.setMusic(save.sound.music), [save.sound.music]);
  useEffect(() => audio.setAmbient(pet ? room : null, lighting), [room, lighting, pet]);
  useEffect(
    () => () => {
      audio.setAmbient(null, "day");
      audio.setMusic(false);
      audio.loop("shower", false);
      audio.loop("dryer", false);
      worldRef.current?.dispose();
      for (const t of timers.current) clearTimeout(t);
    },
    [],
  );

  // ------------------------------------------------------------------ care and progress

  const care = useCallback((delta: Partial<Stats>, friend: number, kind?: CareKind) => {
    setSave((s) => {
      const friendship = Math.min(100, s.friendship + friend);
      return {
        ...s,
        stats: addStats(s.stats, delta),
        friendship: Math.round(friendship * 100) / 100,
        unlocked: unlocksFor(friendship, s.unlocked),
        counts: kind ? { ...s.counts, [kind]: s.counts[kind] + 1 } : s.counts,
      };
    });
  }, []);

  // Celebrate unlocks and new friendship levels.
  const prevUnlocked = useRef(save.unlocked);
  const prevLevel = useRef(friendLevel(save.friendship).index);
  useEffect(() => {
    const fresh = save.unlocked.filter((id) => !prevUnlocked.current.includes(id));
    prevUnlocked.current = save.unlocked;
    if (!pet) return;
    for (const id of fresh) {
      const a = ACCESSORIES.find((x) => x.id === id);
      if (a) toast.success(`New unlock: ${a.emoji} ${a.name}`, { description: "Find it in Dress up." });
    }
  }, [save.unlocked, pet]);
  useEffect(() => {
    const lvl = friendLevel(save.friendship);
    if (lvl.index > prevLevel.current && pet) {
      toast(`💗 You and ${pet.name} are now ${lvl.name.toLowerCase()}!`, { description: "Your friendship is growing." });
      worldRef.current?.say("💗", "Best day ever!", 2400);
    }
    prevLevel.current = lvl.index;
  }, [save.friendship, pet]);

  const onWorld = useCallback(
    (e: WorldEvent) => {
      const name = saveRef.current.pet?.name ?? "Your pet";
      switch (e.type) {
        case "ate": {
          const f = FOOD_BY_ID[e.food];
          const m = e.verdict === "love" ? 1.15 : 1;
          care({ hunger: f.hunger * m, happiness: f.joy + (e.verdict === "love" ? 8 : 2), health: f.health }, e.verdict === "love" ? 2 : 1.2, e.food === "water" ? undefined : "meals");
          break;
        }
        case "touch": {
          const t = nowMs();
          if (t - lastTouch.current > 900) {
            lastTouch.current = t;
            care({ happiness: 1.5 }, 0.3, "pets");
          }
          break;
        }
        case "fetch":
          care({ happiness: 6, energy: -2.5, hunger: -1, cleanliness: -1.2 }, 1.1, "plays");
          break;
        case "yarn":
          care({ happiness: 3, energy: -1.2 }, 0.4);
          break;
        case "found":
          care({ happiness: 10, energy: -3 }, 2, "plays");
          setHideMsg(e.tries === 1 ? `Found ${name} on the first try!` : `You found ${name}! (${e.tries} tries)`);
          setCelebrate((c) => c + 1);
          later(() => {
            setHideMsg(null);
            setPlayMode((p) => (p === "hide" ? null : p));
          }, 2800);
          break;
        case "hideMiss":
          setHideMsg(`Not there! Listen for a giggle...`);
          break;
        case "hidden":
          setHideMsg(`Ready or not! Where is ${name} hiding? Tap a spot.`);
          break;
        case "asleep":
          setAsleep(true);
          break;
        case "woke":
          setAsleep(false);
          setMode((m) => (m === "sleep" ? null : m));
          break;
        case "dance":
          care({ happiness: 2 }, 0.2);
          break;
      }
    },
    [care, later],
  );
  useEffect(() => {
    worldRef.current?.setHandlers(onWorld, setBubble);
  }, [onWorld]);

  // Say hello (or welcome back) when the game opens.
  useEffect(() => {
    if (!bootData.save.pet) return;
    const t = setTimeout(() => worldRef.current?.greet(bootData.away), 900);
    return () => clearTimeout(t);
  }, [bootData]);

  // ------------------------------------------------------------------ rooms

  const goRoom = useCallback(
    (r: RoomId, then?: () => void) => {
      if (r === saveRef.current.room) {
        then?.();
        return;
      }
      setFade(true);
      later(() => {
        setSave((s) => ({ ...s, room: r }));
        later(() => {
          setFade(false);
          then?.();
        }, 120);
      }, 260);
    },
    [later],
  );
  const stepRoom = (dir: 1 | -1) => {
    const i = ROOMS.findIndex((r) => r.id === room);
    endMode();
    goRoom(ROOMS[(i + dir + ROOMS.length) % ROOMS.length].id);
  };

  // ------------------------------------------------------------------ actions

  const endMode = () => {
    const w = worldRef.current;
    if (!w) return;
    if (mode === "bath") finishBath(w.bathScore(), false);
    if (mode === "play") {
      w.endPlay();
      setPlayMode(null);
      setHideMsg(null);
    }
    if (mode === "talk") w.listen(false);
    if (mode === "sleep" && w.asleep) w.wake();
    setMode(null);
  };

  const closePanel = () => {
    const w = worldRef.current;
    if (panel === "feed") w?.openFridge(false);
    if (panel === "dress" || panel === "chat") w?.endPresent();
    setPanel(null);
  };

  const finishBath = (score: { soap: boolean; rinse: boolean; dry: boolean; brush: boolean }, jump = true) => {
    const w = worldRef.current;
    if (!w) return;
    const steps = fish ? [score.soap, score.rinse, score.brush] : [score.soap, score.rinse, score.dry, score.brush];
    const done = steps.filter(Boolean).length;
    const all = done === steps.length;
    if (done > 0) {
      care({ cleanliness: all ? 100 : (100 / steps.length) * done * 0.9, happiness: all ? 8 : 2, health: all ? 4 : 1 }, all ? 3 : 1, "baths");
    }
    w.endBath(jump);
    if (all) {
      w.say("✨", "Sparkling clean!", 2400);
      setCelebrate((c) => c + 1);
    } else if (done > 0) w.say("🫧", "Fresher already!", 2000);
    setMode(null);
  };

  const pick = (id: ToolId) => {
    audio.ensure();
    audio.play("tap");
    const w = worldRef.current;
    if (!w || !pet) return;
    // Toggle off when pressing the active tool again.
    if ((panel === id || (id === "room" && panel === "room")) && id !== "bath") {
      closePanel();
      return;
    }
    if (mode === id && id !== "talk") {
      endMode();
      return;
    }
    if (panel) closePanel();
    if (mode && mode !== id) endMode();
    switch (id) {
      case "feed":
        if (fish || room === "kitchen") {
          setPanel("feed");
          if (!fish) w.openFridge(true);
        } else {
          goRoom("kitchen", () => {
            setPanel("feed");
            worldRef.current?.openFridge(true);
          });
        }
        break;
      case "bath":
        if (mode === "bath") return;
        setMode("bath");
        if (fish) w.startBath();
        else goRoom("bathroom", () => worldRef.current?.startBath());
        break;
      case "play": {
        setMode("play");
        const start = () => {
          worldRef.current?.startPlay("ball");
          setPlayMode("ball");
        };
        if (!fish && (room === "bathroom" || room === "kitchen")) goRoom("playroom", start);
        else start();
        break;
      }
      case "sleep":
        setMode("sleep");
        if (!fish && !LAYOUTS[room].bed) goRoom("bedroom", () => worldRef.current?.goToSleep());
        else w.goToSleep();
        break;
      case "dress":
        setPanel("dress");
        w.presentForDressUp();
        break;
      case "talk":
        setMode("talk");
        w.sitWithYou();
        break;
      case "chat":
        setPanel("chat");
        w.sitWithYou();
        if (!chatEngine.current) chatEngine.current = new ChatEngine();
        if (chat.length === 0) {
          const g = chatEngine.current.greeting(chatCtx());
          setChat([{ id: ++msgId.current, from: "pet", text: g.text }]);
          w.chatReply(g.mood, g.text.length);
        }
        break;
      case "room":
        setPanel("room");
        break;
    }
  };

  const chatCtx = () => ({ name: pet?.name ?? "", species, stats: save.stats, friendship: save.friendship, adoptedAt: pet?.adoptedAt ?? 0, now: nowMs() });

  const sendChat = (text: string) => {
    if (!chatEngine.current) chatEngine.current = new ChatEngine();
    const reply = chatEngine.current.reply(text, chatCtx());
    setChat((c) => [...c, { id: ++msgId.current, from: "you", text }]);
    setTyping(true);
    if (chatGain.current < 6) {
      chatGain.current += 0.3;
      care({ happiness: 1 }, 0.3);
    }
    const delay = reply.safety === "crisis" || reply.safety === "abuse" ? 350 : 650 + rand() * 650;
    later(() => {
      setTyping(false);
      setChat((c) => [...c, { id: ++msgId.current, from: "pet", text: reply.text, safety: reply.safety }]);
      const w = worldRef.current;
      w?.chatReply(reply.mood as ChatMood, reply.text.length);
      if (reply.action === "breathe") later(() => worldRef.current?.breathe(), 1200);
      if (reply.action === "dance") later(() => worldRef.current?.dance(5), 900);
    }, delay);
  };

  const feed = (food: FoodId) => {
    const w = worldRef.current;
    if (!w) return;
    if (save.stats.hunger >= 96 && food !== "water") {
      w.say("😊", "I'm full, thank you!", 2000);
      return;
    }
    w.openFridge(false);
    setPanel(null);
    w.feed(food);
  };

  const pickPlay = (m: "ball" | "yarn" | "hide") => {
    const w = worldRef.current;
    if (!w) return;
    setPlayMode(m);
    w.startPlay(m);
    if (m === "hide") {
      const name = pet?.name ?? "Your pet";
      setHideMsg(`Cover your eyes! ${name} is hiding... 3`);
      later(() => setHideMsg((s) => (s?.startsWith("Cover") ? `Cover your eyes! ${name} is hiding... 2` : s)), 1000);
      later(() => setHideMsg((s) => (s?.startsWith("Cover") ? `Cover your eyes! ${name} is hiding... 1` : s)), 2000);
    } else setHideMsg(null);
  };

  const lookTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHappy = useRef(0);
  const setLook = (l: PetLook) => {
    // Debounced so dragging a colour picker doesn't rebuild the pet every frame.
    if (lookTimer.current) clearTimeout(lookTimer.current);
    lookTimer.current = setTimeout(() => {
      setSave((s) => (s.pet ? { ...s, pet: { ...s.pet, look: l } } : s));
      const t = nowMs();
      if (t - lastHappy.current > 1500) {
        lastHappy.current = t;
        later(() => worldRef.current?.happyLook(), 80);
        care({ happiness: 2 }, 0.2);
      }
    }, 90);
  };
  const setAcc = (slot: Slot, id: string | null) => {
    setSave((s) => {
      if (!s.pet) return s;
      const next = { ...s.pet.acc };
      if (id) next[slot] = id;
      else delete next[slot];
      return { ...s, pet: { ...s.pet, acc: next } };
    });
    if (id) {
      worldRef.current?.happyLook();
      care({ happiness: 3 }, 0.3);
    }
  };

  const adopt = () => {
    const name = draft.name.trim().slice(0, 20);
    if (!name) return;
    audio.ensure();
    const now = nowMs();
    setSave((s) => ({
      ...defaultSave(now),
      sound: s.sound,
      decor: s.decor,
      lighting: s.lighting,
      pet: { name, species: draft.species, look: draft.look, acc: {}, adoptedAt: now },
      stats: { ...DEFAULT_STATS },
    }));
    setCelebrate((c) => c + 1);
    later(() => {
      worldRef.current?.endPresent();
      worldRef.current?.greet(0);
    }, 500);
  };

  const startOver = () => {
    endMode();
    setPanel(null);
    setChat([]);
    chatEngine.current = null;
    setSave((s) => ({ ...defaultSave(nowMs()), sound: s.sound, decor: s.decor, lighting: s.lighting }));
    setDraft({ species: "dog", look: SPECIES.dog.defaultLook, name: "" });
  };

  // Preview the pet while adopting.
  useEffect(() => {
    if (!pet) worldRef.current?.presentNow();
  }, [pet, draft.species]);
  const draftLook = draft.look;
  const firstLook = useRef(true);
  useEffect(() => {
    if (firstLook.current) {
      firstLook.current = false;
      return;
    }
    if (!pet) worldRef.current?.happyLook();
  }, [draftLook, pet]);

  const toggleSound = (k: "sfx" | "music") => {
    audio.ensure();
    setSave((s) => ({ ...s, sound: { ...s.sound, [k]: !s.sound[k] } }));
  };

  const activeTool = panel ?? mode;
  const touchAction = mode === "bath" || mode === "play" ? "none" : "pan-y";

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full select-none overflow-hidden rounded-[2rem] bg-[#f6efe6] shadow-lg ring-1 ring-black/5 h-[min(84svh,680px)] min-h-[520px] sm:h-auto sm:min-h-0 sm:aspect-[16/10]"
      onPointerDownCapture={() => audio.ensure()}
      onKeyDownCapture={() => audio.ensure()}
    >
      <div className="absolute inset-0">
        <PetScene
          species={species}
          look={look}
          acc={acc}
          room={room}
          decor={decor}
          lighting={lighting}
          world={worldRef}
          bubble={bubble}
          reduced={reduced}
          active={active}
          interactive={!fade}
          touchAction={touchAction}
        />
      </div>

      {/* Room change fade */}
      <div className={`pointer-events-none absolute inset-0 z-40 bg-[#fdf8f2] transition-opacity duration-300 ${fade ? "opacity-100" : "opacity-0"}`} aria-hidden />

      {celebrate > 0 && !reduced && <Confetti key={celebrate} />}

      {pet ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col p-2.5 sm:p-3">
          {/* Top bar */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-2">
              <NameChip name={pet.name} species={pet.species} friendship={save.friendship} onOpen={() => (panel === "menu" ? closePanel() : (closePanel(), setPanel("menu")))} />
              <div className="hidden sm:block">
                <StatMeters stats={save.stats} />
              </div>
            </div>
            <div className="hidden pt-0.5 sm:block">
              <RoomNav room={room} onPrev={() => stepRoom(-1)} onNext={() => stepRoom(1)} onOpen={() => pick("room")} />
            </div>
            <TopRight sfx={save.sound.sfx} music={save.sound.music} onSfx={() => toggleSound("sfx")} onMusic={() => toggleSound("music")} onMenu={() => (panel === "menu" ? closePanel() : (closePanel(), setPanel("menu")))} />
          </div>
          {/* On phones the stats tuck away while a panel is open, so the pet stays in view. */}
          {!(panel && !wide) && (
            <>
              <div className="mt-2 sm:hidden">
                <StatMeters stats={save.stats} />
              </div>
              <div className="mt-2 flex justify-center sm:hidden">
                <RoomNav room={room} onPrev={() => stepRoom(-1)} onNext={() => stepRoom(1)} onOpen={() => pick("room")} />
              </div>
            </>
          )}

          {/* Hide and seek prompts */}
          <AnimatePresence>
            {hideMsg && (
              <motion.div key="hide" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-auto mt-3 max-w-[90%] rounded-full bg-ink/80 px-4 py-2 text-center text-sm font-semibold text-white shadow-md backdrop-blur" role="status">
                {hideMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1" />

          {/* Bottom: mode bar or toolbar */}
          <div className="relative z-30 mx-auto w-full max-w-[640px]">
            <AnimatePresence mode="wait" initial={false}>
              {mode === "bath" ? (
                <BathBar key="bath" world={worldRef} name={pet.name} fish={fish} onDone={(s) => finishBath(s)} />
              ) : mode === "play" ? (
                <PlayBar key="play" mode={playMode} fish={fish} name={pet.name} onPick={pickPlay} onClose={endMode} />
              ) : mode === "sleep" ? (
                <SleepBar key="sleep" name={pet.name} energy={save.stats.energy} asleep={asleep} onWake={() => worldRef.current?.wake()} onClose={endMode} />
              ) : mode === "talk" ? (
                <TalkBar
                  key="talk"
                  world={worldRef}
                  name={pet.name}
                  rate={SPECIES[pet.species].voiceRate}
                  onTalked={() => care({ happiness: 4 }, 1, "talks")}
                  onClose={() => {
                    worldRef.current?.listen(false);
                    worldRef.current?.endPresent();
                    setMode(null);
                  }}
                />
              ) : (
                <motion.div key="tools" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
                  <Toolbar active={activeTool} onPick={pick} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {panel === "feed" && <FeedPanel key="feed" pet={pet} hunger={save.stats.hunger} onFeed={feed} onClose={closePanel} />}
            {panel === "dress" && <DressPanel key="dress" pet={pet} unlocked={save.unlocked} friendship={save.friendship} onLook={setLook} onAcc={setAcc} onClose={closePanel} />}
            {panel === "room" && (
              <RoomPanel
                key="room"
                room={room}
                decor={decor}
                lighting={save.lighting}
                onRoom={(r) => {
                  endMode();
                  goRoom(r);
                }}
                onDecor={(d) => setSave((s) => ({ ...s, decor: { ...s.decor, [room]: d } }))}
                onLighting={(l: LightingChoice) => setSave((s) => ({ ...s, lighting: l }))}
                onClose={closePanel}
              />
            )}
            {panel === "chat" && <ChatPanel key="chat" name={pet.name} species={pet.species} messages={chat} typing={typing} onSend={sendChat} onClose={closePanel} />}
            {panel === "menu" && (
              <MenuPanel
                key="menu"
                save={save}
                signedIn={signedIn}
                onRename={(n) => {
                  setSave((s) => (s.pet ? { ...s, pet: { ...s.pet, name: n } } : s));
                  worldRef.current?.say("😊", `${n}? I love it!`, 2000);
                }}
                onStartOver={startOver}
                onClose={closePanel}
              />
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 z-20">
          <AnimatePresence>
            <Adopt key="adopt" draft={draft} setDraft={setDraft} onAdopt={adopt} />
          </AnimatePresence>
        </div>
      )}

      {/* Welcome back */}
      <AnimatePresence>
        {welcome && pet && (
          <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center bg-white/40 p-4 backdrop-blur-[2px]">
            <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm rounded-3xl bg-white p-5 text-center shadow-lg" role="dialog" aria-label="Welcome back">
              <p className="text-4xl" aria-hidden>
                {SPECIES[pet.species].emoji}
              </p>
              <h3 className="mt-2 font-display text-2xl text-ink">Welcome back!</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">
                {pet.name} missed you. You were away for {formatAway(bootData.away)}, and {pet.name} {bootData.away > 3 * 3_600_000 ? "had a lovely long nap" : "kept your spot warm"}.
              </p>
              <Button className="mt-4 rounded-full" onClick={() => setWelcome(false)}>
                Say hi to {pet.name}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
