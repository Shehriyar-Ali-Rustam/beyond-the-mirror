"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { HeartHandshake, Phone, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { CRISIS } from "@/lib/constants";
import type { Safety } from "./chat-engine";
import { Sheet } from "./panels";
import { SPECIES } from "./species";
import type { SpeciesId } from "./types";

export type ChatMsg = { id: number; from: "pet" | "you"; text: string; safety?: Safety };

const QUICK = ["I'm stressed 😣", "I had a good day!", "I'm bored", "Tell me a joke", "I feel lonely", "How are you?"];

/** Clear, visible guidance whenever a message sounds serious. Not a pet joke. */
export function SafetyCard({ kind }: { kind: Safety }) {
  if (kind === "support") {
    return (
      <div className="rounded-2xl border border-sky/30 bg-sky-soft p-3 text-[12px] leading-relaxed text-ink" role="note">
        <p className="flex items-center gap-1.5 font-semibold">
          <HeartHandshake className="size-4 text-sky" aria-hidden /> You deserve support
        </p>
        <p className="mt-1">Talk to someone you trust: a parent or carer, a teacher, or your school counselor. They can help make things better.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border-2 border-danger/30 bg-danger-soft p-3 text-[12px] leading-relaxed text-ink" role="alert">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-danger">
        <HeartHandshake className="size-4" aria-hidden /> Please reach out to a real person now
      </p>
      <ul className="mt-1.5 list-disc space-y-1 pl-4">
        <li>Tell a trusted adult right away: a parent, carer, teacher or your school counselor.</li>
        {kind === "abuse" && <li>What is happening is not your fault, and you deserve to be safe.</li>}
        <li className="flex flex-wrap items-center gap-x-1">
          If you are in danger or might hurt yourself, call{" "}
          {CRISIS.number ? (
            <a href={`tel:${CRISIS.number}`} className="inline-flex items-center gap-1 font-semibold text-danger underline-offset-2 hover:underline">
              <Phone className="inline size-3" aria-hidden /> {CRISIS.name} on {CRISIS.number}
            </a>
          ) : (
            <strong>your local emergency number</strong>
          )}{" "}
          now.
        </li>
        <li>You can also message your school counselor on this website, anonymously if you prefer.</li>
      </ul>
      <p className="mt-1.5 text-ink-2">You don&apos;t have to handle this on your own.</p>
    </div>
  );
}

export function ChatPanel({ name, species, messages, typing, onSend, onClose }: { name: string; species: SpeciesId; messages: ChatMsg[]; typing: boolean; onSend: (text: string) => void; onClose: () => void }) {
  const [text, setText] = useState("");
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, typing]);
  const send = (t: string) => {
    const v = t.trim().slice(0, 300);
    if (!v) return;
    onSend(v);
    setText("");
  };
  const emoji = SPECIES[species].emoji;
  return (
    <Sheet title={`Chat with ${name}`} subtitle={`Just between you two. Nothing is saved. ${name} is a pet, not a counselor.`} onClose={onClose} className="max-h-[66%] sm:max-h-none">
      <div className="flex h-full min-h-[220px] flex-col">
        <div ref={list} className="scrollbar-thin -mx-1 flex-1 space-y-2 overflow-y-auto px-1 pb-2" aria-live="polite" aria-label="Messages">
          {messages.map((m) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex flex-col gap-1.5", m.from === "you" ? "items-end" : "items-start")}>
              <div className={cn("flex max-w-[88%] items-end gap-1.5", m.from === "you" && "flex-row-reverse")}>
                {m.from === "pet" && (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sun-soft text-sm" aria-hidden>
                    {emoji}
                  </span>
                )}
                <p className={cn("whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13px] leading-snug", m.from === "you" ? "rounded-br-md bg-primary text-white" : "rounded-bl-md bg-white text-ink shadow-sm ring-1 ring-black/5")}>
                  <span className="sr-only">{m.from === "you" ? "You: " : `${name}: `}</span>
                  {m.text}
                </p>
              </div>
              {m.safety && <SafetyCard kind={m.safety} />}
            </motion.div>
          ))}
          {typing && (
            <div className="flex items-center gap-1.5" aria-label={`${name} is typing`}>
              <span className="flex size-6 items-center justify-center rounded-full bg-sun-soft text-sm" aria-hidden>
                {emoji}
              </span>
              <span className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-3 py-2.5 shadow-sm ring-1 ring-black/5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="size-1.5 animate-bounce rounded-full bg-ink-3" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          )}
        </div>
        <div className="scrollbar-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2 pt-1">
          {QUICK.map((q) => (
            <button key={q} type="button" onClick={() => send(q)} className="shrink-0 rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-medium text-ink-2 transition hover:bg-black/10 hover:text-ink">
              {q}
            </button>
          ))}
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <label htmlFor="pet-chat-input" className="sr-only">
            Message {name}
          </label>
          <input
            id="pet-chat-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={300}
            autoComplete="off"
            placeholder={`Tell ${name} about your day...`}
            className="h-10 min-w-0 flex-1 rounded-full border border-line-strong bg-white px-4 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-primary"
          />
          <button type="submit" disabled={!text.trim()} aria-label="Send message" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50">
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </Sheet>
  );
}
