"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Confetti, pick, useLocalList } from "./shared";

const JOKES = [
  ["Why did the student eat their homework?", "Because the teacher said it was a piece of cake."],
  ["What do you call a sleeping dinosaur?", "A dino-snore."],
  ["Why was the maths book sad?", "It had too many problems."],
  ["What did one wall say to the other wall?", "I'll meet you at the corner."],
  ["Why don't eggs tell jokes?", "They'd crack each other up."],
  ["What's a cat's favourite colour?", "Purr-ple."],
  ["Why did the bicycle fall over?", "It was two-tired."],
  ["What do you call a bear with no teeth?", "A gummy bear."],
  ["Why did the cookie go to the doctor?", "It was feeling crummy."],
  ["What do clouds wear under their clothes?", "Thunderwear."],
  ["Why can't you trust stairs?", "They're always up to something."],
  ["What did the ocean say to the beach?", "Nothing, it just waved."],
];

const MESSAGES = [
  "You are doing better than you think you are.",
  "Rest is productive too. You're allowed to slow down.",
  "One hard day doesn't undo all your progress.",
  "Someone is really glad you exist. (We are, for a start.)",
  "You don't have to have it all figured out today.",
  "Your feelings make sense, even the messy ones.",
  "Small steps are still steps. Keep going.",
  "You've survived every bad day so far. That's a 100% record.",
  "Be proud of how far you've come, not just how far you have to go.",
  "It's okay to ask for help. That's what strong people do.",
];

const CHALLENGES = [
  "Smile at the next person you see. 😊",
  "Name three songs that always lift your mood.",
  "Stand up and do your best superhero pose for 20 seconds.",
  "Write down one thing you're looking forward to.",
  "Send a heart emoji to someone you haven't spoken to in a while.",
  "Find something soft and hold it for a moment.",
  "Take 3 big breaths and roll your shoulders back.",
  "Tell yourself, out loud: “I'm doing my best.”",
];

export const STICKERS = [
  { id: "sun", emoji: "🌞", name: "Sunny Sam" },
  { id: "rainbow", emoji: "🌈", name: "Rainbow Ray" },
  { id: "cat", emoji: "🐱", name: "Calm Cat" },
  { id: "panda", emoji: "🐼", name: "Pep Panda" },
  { id: "unicorn", emoji: "🦄", name: "Uni Dreams" },
  { id: "star", emoji: "⭐", name: "Super Star" },
  { id: "plant", emoji: "🪴", name: "Growing Gus" },
  { id: "rocket", emoji: "🚀", name: "Rocket Rina" },
  { id: "bee", emoji: "🐝", name: "Busy Bee" },
  { id: "octopus", emoji: "🐙", name: "Hug Octopus" },
  { id: "moon", emoji: "🌙", name: "Sleepy Moon" },
  { id: "frog", emoji: "🐸", name: "Chill Frog" },
  { id: "dolphin", emoji: "🐬", name: "Splash" },
  { id: "butterfly", emoji: "🦋", name: "Flutter" },
  { id: "donut", emoji: "🍩", name: "Sweet Donut" },
  { id: "heart", emoji: "💖", name: "Big Heart" },
];

const chance = () => Math.random();

type Prize =
  | { kind: "joke"; q: string; a: string }
  | { kind: "sticker"; sticker: (typeof STICKERS)[number]; isNew: boolean }
  | { kind: "message"; text: string }
  | { kind: "challenge"; text: string };

const BOXES = [
  { color: "#e86a9a", ribbon: "#f5b82e" },
  { color: "#4b9fe1", ribbon: "#ffffff" },
  { color: "#9b85dd", ribbon: "#34b892" },
];

function GiftBox({ color, ribbon, opening, onClick, delay }: { color: string; ribbon: string; opening: boolean; onClick: () => void; delay: number }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label="Open this mystery box"
      className="group relative mx-auto block w-full max-w-[160px] focus-visible:outline-none"
      initial={{ y: 20, opacity: 0 }}
      animate={opening ? { rotate: [0, -8, 8, -6, 6, 0], scale: [1, 1.05, 1.05, 1.1, 1.1, 1.15] } : { y: 0, opacity: 1 }}
      transition={opening ? { duration: 0.7 } : { delay, type: "spring" }}
      whileHover={{ y: -8 }}
    >
      <svg viewBox="0 0 120 120" className="h-auto w-full drop-shadow-lg">
        <motion.g animate={opening ? { y: -30, rotate: -15, opacity: 0 } : { y: 0 }} transition={{ delay: 0.6, duration: 0.3 }}>
          <path d="M60 28c-8-14-26-16-26-6 0 8 14 8 26 6Zm0 0c8-14 26-16 26-6 0 8-14 8-26 6Z" fill={ribbon} stroke="#15201c" strokeOpacity=".15" strokeWidth="2" />
          <rect x="10" y="28" width="100" height="22" rx="5" fill={color} />
          <rect x="10" y="28" width="100" height="22" rx="5" fill="#fff" opacity=".15" />
          <rect x="53" y="28" width="14" height="22" fill={ribbon} />
        </motion.g>
        <rect x="16" y="50" width="88" height="62" rx="5" fill={color} />
        <rect x="16" y="50" width="88" height="10" fill="#000" opacity=".1" />
        <rect x="53" y="50" width="14" height="62" fill={ribbon} />
        <text x="60" y="93" textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff" opacity=".9">
          ?
        </text>
      </svg>
      <span className="mt-2 block text-center text-sm font-medium text-ink-2 group-hover:text-ink">Tap to open</span>
    </motion.button>
  );
}

export function MysteryGame() {
  const [opening, setOpening] = useState<number | null>(null);
  const [prize, setPrize] = useState<Prize | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [stickers, addSticker] = useLocalList("stickers");

  const open = (i: number) => {
    if (opening !== null) return;
    setOpening(i);
    setShowAnswer(false);
    const roll = chance();
    let next: Prize;
    if (roll < 0.3) {
      const s = pick(STICKERS);
      next = { kind: "sticker", sticker: s, isNew: !stickers.includes(s.id) };
      addSticker(s.id);
    } else if (roll < 0.55) {
      const [q, a] = pick(JOKES);
      next = { kind: "joke", q, a };
    } else if (roll < 0.8) next = { kind: "message", text: pick(MESSAGES) };
    else next = { kind: "challenge", text: pick(CHALLENGES) };
    setTimeout(() => setPrize(next), 900);
  };

  const again = () => {
    setPrize(null);
    setOpening(null);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative min-h-[300px] rounded-[2rem] bg-gradient-to-br from-rose-soft via-lilac-soft to-sky-soft p-6 shadow-sm sm:p-10">
        <AnimatePresence mode="wait">
          {!prize ? (
            <motion.div key="boxes" exit={{ opacity: 0, scale: 0.95 }}>
              <p className="text-center font-display text-2xl text-ink">Pick a box, any box</p>
              <p className="mt-1 text-center text-sm text-ink-2">Inside: a joke, a sticker, a kind message or a mini challenge.</p>
              <div className="mt-8 grid grid-cols-3 gap-4 sm:gap-8">
                {BOXES.map((b, i) => (
                  <GiftBox key={i} {...b} delay={i * 0.1} opening={opening === i} onClick={() => open(i)} />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="prize"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="relative mx-auto max-w-lg rounded-3xl bg-surface p-6 text-center shadow-lg sm:p-8"
            >
              <Confetti key={JSON.stringify(prize)} count={28} />
              {prize.kind === "sticker" && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose">{prize.isNew ? "New sticker!" : "Sticker (you already have this one)"}</p>
                  <motion.p className="mt-3 text-7xl" initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", delay: 0.15 }}>
                    {prize.sticker.emoji}
                  </motion.p>
                  <p className="mt-3 font-display text-2xl text-ink">{prize.sticker.name}</p>
                  <p className="mt-1 text-sm text-ink-2">Added to your sticker book below.</p>
                </>
              )}
              {prize.kind === "joke" && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-sky">A joke for you 😄</p>
                  <p className="mt-4 font-display text-2xl leading-snug text-ink">{prize.q}</p>
                  {showAnswer ? (
                    <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-lg font-medium text-ink-2">
                      {prize.a}
                    </motion.p>
                  ) : (
                    <Button variant="soft" className="mt-5" onClick={() => setShowAnswer(true)}>
                      Tell me!
                    </Button>
                  )}
                </>
              )}
              {prize.kind === "message" && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#1f8a6b]">A message for you 💛</p>
                  <p className="mt-4 font-display text-2xl leading-snug text-ink">{prize.text}</p>
                </>
              )}
              {prize.kind === "challenge" && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-coral">Mini challenge ⚡</p>
                  <p className="mt-4 font-display text-2xl leading-snug text-ink">{prize.text}</p>
                </>
              )}
              <Button className="mt-6 rounded-full" onClick={again}>
                <RotateCcw /> Open another box
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <section className="mt-6 rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-lg text-ink">My sticker book</p>
          <p className="text-sm text-ink-3">
            {stickers.length} / {STICKERS.length}
          </p>
        </div>
        <ul className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-8">
          {STICKERS.map((s) => {
            const has = stickers.includes(s.id);
            return (
              <li
                key={s.id}
                title={has ? s.name : "Not found yet"}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-2xl text-3xl transition",
                  has ? "bg-gradient-to-br from-sun-soft to-rose-soft shadow-sm" : "border border-dashed border-line-strong bg-surface-2 text-xl grayscale",
                )}
              >
                {has ? s.emoji : <span className="opacity-30">?</span>}
                <span className="sr-only">{has ? s.name : "Locked sticker"}</span>
              </li>
            );
          })}
        </ul>
        {stickers.length === STICKERS.length && <p className="mt-4 text-center text-sm font-medium text-ink">🎉 You collected every sticker! Legend.</p>}
      </section>
    </div>
  );
}
