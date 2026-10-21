"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Ban, Handshake, HandHelping, HeartCrack, School, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyButton, TalkCta } from "./shared";

type Script = { tone: "Gentle" | "Direct" | "Short"; text: string };
type Situation = { key: string; label: string; icon: typeof Ban; intro: string; scripts: Script[]; tips: string[] };

const SITUATIONS: Situation[] = [
  {
    key: "no",
    label: "Saying no",
    icon: Ban,
    intro: "You can say no without a long explanation. A clear, kind no is better than a yes you'll regret.",
    scripts: [
      { tone: "Gentle", text: "Thanks for asking me, but I'm going to pass this time. Hope it goes well!" },
      { tone: "Direct", text: "No, I'm not comfortable doing that." },
      { tone: "Short", text: "I can't, sorry." },
      { tone: "Gentle", text: "I'd love to help, but I've got too much on right now. Maybe next time?" },
    ],
    tips: ["You don't owe anyone a reason.", "Say it once, calmly. You can repeat the same words if they push.", "A real friend will accept your no."],
  },
  {
    key: "pressure",
    label: "Peer pressure",
    icon: ShieldCheck,
    intro: "When a group is pushing, having a line ready makes it much easier to hold your ground.",
    scripts: [
      { tone: "Short", text: "Nah, I'm good." },
      { tone: "Direct", text: "I said no. I'm not doing it." },
      { tone: "Gentle", text: "Not my thing, but you do you. I'll catch you later." },
      { tone: "Direct", text: "If I have to be pressured into it, it's a no." },
    ],
    tips: ["Have an exit: “I've got to head home.”", "Stand near someone who shares your view.", "It's okay to leave a situation that feels wrong."],
  },
  {
    key: "boundary",
    label: "Setting a boundary",
    icon: Users,
    intro: "Boundaries tell people how to treat you. They're about your behaviour, not controlling theirs.",
    scripts: [
      { tone: "Gentle", text: "I really value our friendship, so I want to be honest: when you joke about that, it hurts. Can you stop?" },
      { tone: "Direct", text: "Please don't read my messages or go through my phone." },
      { tone: "Gentle", text: "I need some time to myself after school. It's not about you, I just need to recharge." },
      { tone: "Direct", text: "If the yelling starts again, I'm going to leave the conversation and we can try later." },
    ],
    tips: ["Use “I” statements: “I feel… when… I need…”.", "Expect some pushback. It doesn't mean you were wrong.", "Follow through, kindly but consistently."],
  },
  {
    key: "apology",
    label: "Apologising",
    icon: HeartCrack,
    intro: "A good apology names what you did, doesn't make excuses, and says what you'll do differently.",
    scripts: [
      { tone: "Gentle", text: "I'm really sorry about what I said yesterday. It was unfair and I know it hurt you. I'll be more careful." },
      { tone: "Short", text: "I was wrong earlier, and I'm sorry." },
      { tone: "Gentle", text: "I've been thinking about what happened. I'm sorry I ignored you. I was dealing with my own stuff, but that's not an excuse. Can we talk?" },
    ],
    tips: ["Avoid “sorry if you were upset”, it shifts blame.", "Don't add “but…”.", "Give them time to respond. Forgiveness isn't instant."],
  },
  {
    key: "help",
    label: "Asking for help",
    icon: HandHelping,
    intro: "Asking for help is a skill, not a weakness. Most people are glad to be asked.",
    scripts: [
      { tone: "Gentle", text: "Hey, have you got a minute? I'm going through something and I could use someone to talk to." },
      { tone: "Direct", text: "I'm not okay at the moment and I don't know what to do. Can you help me figure it out?" },
      { tone: "Short", text: "Can we talk later? It's important." },
    ],
    tips: ["Pick someone you trust, at a time they can actually listen.", "You don't have to explain everything at once.", "If the first person can't help, try someone else."],
  },
  {
    key: "argument",
    label: "Fixing an argument",
    icon: Handshake,
    intro: "Once things have cooled down, reaching out first is a strength, not losing.",
    scripts: [
      { tone: "Gentle", text: "I hate that we fell out. Can we talk about what happened? I want to understand how you see it." },
      { tone: "Gentle", text: "I think we both said things we didn't mean. I miss hanging out. Can we reset?" },
      { tone: "Direct", text: "I'm still upset about what happened, but I don't want it to ruin our friendship. Can we sort it out face to face?" },
    ],
    tips: ["Talk in person if you can, text loses tone.", "Listen to understand, not to win.", "It's okay to agree to disagree."],
  },
  {
    key: "teacher",
    label: "Talking to a teacher",
    icon: School,
    intro: "Teachers would usually rather know early. A short, honest message goes a long way.",
    scripts: [
      { tone: "Direct", text: "I'm finding this topic really hard and I'm falling behind. Could you suggest how I could catch up?" },
      { tone: "Gentle", text: "Things are a bit difficult at home at the moment, which is why my work has slipped. Could I have a short extension?" },
      { tone: "Short", text: "Could I talk to you after class about my grade?" },
    ],
    tips: ["You don't have to share private details. “Things are difficult” is enough.", "Ask for something specific: extra time, a recap, a check-in.", "Email is fine if speaking up in class is hard."],
  },
];

export function SayItTool() {
  const [key, setKey] = useState(SITUATIONS[0].key);
  const s = SITUATIONS.find((x) => x.key === key)!;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {SITUATIONS.map((x) => (
          <button
            key={x.key}
            onClick={() => setKey(x.key)}
            aria-pressed={x.key === key}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
              x.key === key ? "border-primary bg-primary text-primary-ink" : "border-line-strong bg-surface text-ink-2 hover:border-ink-3",
            )}
          >
            <x.icon className="size-4" /> {x.label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={s.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
          <p className="text-[15px] leading-relaxed text-ink-2">{s.intro}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {s.scripts.map((sc, i) => (
              <div key={i} className="flex flex-col rounded-3xl border border-line bg-surface p-5">
                <span className={cn("self-start rounded-full px-2 py-0.5 text-[11px] font-medium", sc.tone === "Direct" ? "bg-clay-soft text-clay" : sc.tone === "Short" ? "bg-lilac-soft text-lilac" : "bg-primary-soft text-primary-soft-ink")}>
                  {sc.tone}
                </span>
                <p className="mt-3 flex-1 font-display text-lg leading-snug text-ink">“{sc.text}”</p>
                <CopyButton text={sc.text} className="mt-3 self-start" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-surface-2 p-5 text-sm">
            <p className="font-medium text-ink">Good to know</p>
            <ul className="mt-2 space-y-1.5 text-ink-2">
              {s.tips.map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-ink-3" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </AnimatePresence>
      <TalkCta title="Want help with the exact words?" body="Your counselor can help you plan a difficult conversation, or practise it with you." />
    </div>
  );
}
