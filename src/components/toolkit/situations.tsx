"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Category } from "@/lib/types";
import { CopyButton, TalkCta } from "./shared";

type Guide = {
  key: string;
  group: "Friends" | "Home" | "Bullying";
  label: string;
  category: Category;
  feels: string;
  steps: string[];
  avoid: string[];
  adult: string;
  log?: boolean;
};

const GUIDES: Guide[] = [
  {
    key: "ignored",
    group: "Friends",
    label: "My friends are ignoring me or leaving me out",
    category: "friendship",
    feels: "Being left out can hurt as much as physical pain — that's how our brains are wired. It makes sense that this is getting to you.",
    steps: [
      "Check the facts gently: is it everyone, or one or two people? Is it new?",
      "Talk to the friend you're closest to, one-on-one: “I've felt a bit left out lately — is everything okay between us?”",
      "Spend time with other people too: a club, a class partner, someone you used to be close to.",
      "Look after yourself while it settles — things you enjoy, people outside school.",
    ],
    avoid: ["Posting about it online or sending angry messages.", "Assuming the worst before you've talked to anyone.", "Changing who you are just to be included."],
    adult: "If it carries on for weeks, turns into nasty comments, or you dread going to school, talk to your counselor.",
  },
  {
    key: "fallout",
    group: "Friends",
    label: "I've fallen out with a close friend",
    category: "friendship",
    feels: "Fallouts with close friends can feel like a breakup. It's normal to feel angry, sad, and to miss them all at once.",
    steps: [
      "Give it a day or two to cool down before you talk.",
      "Think about your part honestly — not to blame yourself, but to understand.",
      "Reach out in person or with a short message. (The “What should I say?” tool has scripts.)",
      "Listen to their side. You can disagree and still be friends.",
    ],
    avoid: ["Getting others to take sides.", "Sharing private things they told you.", "Arguing over text."],
    adult: "If it's affecting your sleep, schoolwork, or turning into a group conflict, your counselor can help mediate.",
  },
  {
    key: "pressure",
    group: "Friends",
    label: "I'm being pressured to do something I don't want to",
    category: "friendship",
    feels: "Pressure can be loud or subtle. Feeling uneasy is your instinct telling you something — it's worth listening to.",
    steps: [
      "Remember you're allowed to say no without explaining.",
      "Have a line ready: “Nah, I'm good” or “I've got to go.”",
      "Stay close to people who respect your choices.",
      "Leave the situation if you need to — call someone to pick you up.",
    ],
    avoid: ["Going along with it to avoid awkwardness.", "Keeping it secret if it involves anything dangerous or illegal."],
    adult: "If anyone is threatening you, or you're being pressured into something sexual, dangerous, or illegal, tell a trusted adult straight away.",
  },
  {
    key: "misunderstood",
    group: "Home",
    label: "I feel misunderstood at home",
    category: "family",
    feels: "Feeling like your family doesn't get you is really common at this age — you're changing fast, and they're catching up.",
    steps: [
      "Choose a calm moment, not mid-argument.",
      "Start with how you feel: “I feel like you don't see how hard I'm trying.”",
      "Pick one thing you'd like to change, rather than everything at once.",
      "If talking is hard, write a letter or message first.",
    ],
    avoid: ["Shutting down completely.", "Saying things in anger you'll regret."],
    adult: "Your counselor can help you plan the conversation, or meet with you and a parent together if you want.",
  },
  {
    key: "tension",
    group: "Home",
    label: "There's a lot of tension or arguing at home",
    category: "family",
    feels: "It's hard to focus on anything when home doesn't feel calm. Adult arguments are never your fault or your job to fix.",
    steps: [
      "Find a space that feels calmer — your room, a library, a relative's house.",
      "Use headphones, a walk, or the Bad-day reset when it gets loud.",
      "Talk to someone you trust about what's happening.",
      "Keep your routines where you can — they help you feel steady.",
    ],
    avoid: ["Taking sides or trying to referee.", "Blaming yourself."],
    adult: "If you ever feel unsafe at home, or someone is being hurt, tell your counselor or another trusted adult as soon as possible.",
  },
  {
    key: "grades",
    group: "Home",
    label: "My family puts a lot of pressure on my grades",
    category: "exams",
    feels: "Pressure usually comes from love and worry — but it can still feel crushing. Both things can be true.",
    steps: [
      "Show them your effort, not just results — your plan, your schedule.",
      "Share how the pressure affects you, calmly.",
      "Agree on realistic goals together.",
      "Ask your counselor or a teacher to help explain your progress.",
    ],
    avoid: ["Hiding results — it usually makes things harder later.", "Studying all night — it backfires."],
    adult: "The Exam stress kit has scripts for talking to family. Your counselor can also join that conversation.",
  },
  {
    key: "bullied",
    group: "Bullying",
    label: "I'm being bullied in person",
    category: "bullying",
    feels: "Bullying is never your fault, and you don't have to handle it alone. Telling someone is the bravest — and most effective — step.",
    steps: [
      "Stay near friends or adults in places where it tends to happen.",
      "Respond calmly if you can (“Leave me alone”) and walk away.",
      "Write down what happened, as soon as you can (see the log below).",
      "Tell a trusted adult — your counselor, a teacher, or a parent.",
    ],
    avoid: ["Fighting back physically — you could end up in trouble.", "Keeping it to yourself and hoping it stops."],
    adult: "Always tell an adult about bullying. Schools have a duty to act, and your counselor can help make sure it's handled carefully.",
    log: true,
  },
  {
    key: "online",
    group: "Bullying",
    label: "I'm being bullied online",
    category: "bullying",
    feels: "Online bullying can feel like it follows you everywhere. You can take back some control.",
    steps: [
      "Don't reply — it's often what they want.",
      "Screenshot everything: messages, usernames, dates and times.",
      "Block and report the accounts on the platform.",
      "Check your privacy settings and who can contact you.",
      "Tell a trusted adult and share your evidence.",
    ],
    avoid: ["Deleting the evidence.", "Posting back or getting friends to retaliate."],
    adult: "If you're being threatened, or someone is sharing private images, tell an adult immediately. That may be a crime.",
    log: true,
  },
];

const LOG_TEMPLATE = `INCIDENT LOG (keep this somewhere private)

Date:
Time:
Where it happened:
Who was involved:
What happened (their exact words if you remember):
Who saw it:
Evidence (screenshots, photos):
How it made me feel:
Who I've told:
`;

export function SituationsTool() {
  const [key, setKey] = useState<string | null>(null);
  const g = GUIDES.find((x) => x.key === key);

  return (
    <AnimatePresence mode="wait">
      {!g ? (
        <motion.div key="picker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
          <p className="text-[15px] leading-relaxed text-ink-2">Choose what&apos;s closest to what&apos;s happening.</p>
          {(["Friends", "Home", "Bullying"] as const).map((group) => (
            <div key={group}>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-ink-3">{group}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {GUIDES.filter((x) => x.group === group).map((x) => (
                  <button
                    key={x.key}
                    onClick={() => setKey(x.key)}
                    className="rounded-2xl border border-line bg-surface px-4 py-3.5 text-left text-[15px] text-ink transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-sm"
                  >
                    {x.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      ) : (
        <motion.div key={g.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
          <Button variant="ghost" size="sm" onClick={() => setKey(null)} className="-ml-2">
            <ArrowLeft /> All situations
          </Button>
          <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
            <h2 className="font-display text-2xl leading-snug text-ink">{g.label}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{g.feels}</p>

            <p className="mt-6 text-sm font-semibold text-ink">What you can do</p>
            <ol className="mt-3 space-y-3">
              {g.steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-ink">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-soft-ink">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-surface-2 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-ink">
                  <XCircle className="size-4 text-danger" /> Try to avoid
                </p>
                <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
                  {g.avoid.map((a) => (
                    <li key={a}>• {a}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-clay-soft/70 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-ink">
                  <AlertTriangle className="size-4 text-clay" /> When to involve an adult
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{g.adult}</p>
              </div>
            </div>
          </div>

          {g.log && (
            <div className="rounded-3xl border border-line bg-surface p-6">
              <p className="flex items-center gap-2 font-medium text-ink">
                <FileText className="size-4 text-primary" /> Documenting incidents safely
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-2">
                {[
                  "Write things down the same day, while you remember details.",
                  "Keep screenshots in a private folder — not a shared device.",
                  "Note who saw it. Witnesses help adults take action.",
                  "Stick to facts: what was said and done, not just how it felt.",
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" /> {t}
                  </li>
                ))}
              </ul>
              <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-surface-2 p-4 font-sans text-sm leading-relaxed text-ink-2">{LOG_TEMPLATE}</pre>
              <CopyButton text={LOG_TEMPLATE} label="Copy template" className="mt-2" />
            </div>
          )}

          <TalkCta category={g.category} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
