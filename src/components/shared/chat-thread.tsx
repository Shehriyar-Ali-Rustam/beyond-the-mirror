"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, ArrowUp, Check, CheckCheck, Lock, RotateCw, Zap } from "lucide-react";
import { sendMessage, markConversationRead } from "@/actions/messages";
import { useRealtime } from "@/hooks/use-realtime";
import { Avatar } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { dayKey, dayLabel, formatTime } from "@/lib/time";
import type { Conversation, Message } from "@/lib/types";

type Person = { name: string; hue: number };
type LocalMessage = Message & { pending?: boolean; failed?: boolean };

const GROUP_GAP_MS = 5 * 60_000;
const MAX = 4000;

export function ChatThread({
  conversationId,
  viewerId,
  side,
  anonymousStudent,
  tz,
  initialMessages,
  people,
  otherLastReadAt: initialOtherRead,
  otherReadField,
  placeholder = "Write a message…",
  quickReplies,
  intro,
  closedNotice,
}: {
  conversationId: string;
  viewerId: string;
  /** Which side of the conversation the viewer is on. */
  side: "student" | "counselor";
  /** Shown for student messages when the conversation is anonymous. */
  anonymousStudent?: Person;
  tz: string;
  initialMessages: Message[];
  people: Record<string, Person>;
  otherLastReadAt: string | null;
  otherReadField: "student_last_read_at" | "counselor_last_read_at";
  placeholder?: string;
  quickReplies?: string[];
  intro?: React.ReactNode;
  closedNotice?: React.ReactNode;
}) {
  const [messages, setMessages] = useState<LocalMessage[]>(initialMessages);
  const [otherRead, setOtherRead] = useState(initialOtherRead);
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const nearBottom = useRef(true);
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftKey = `btm:reply:${conversationId}`;

  // Restore an unsent reply (per conversation, this tab only).
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(draftKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring from sessionStorage after mount
      if (saved) setDraft(saved);
    } catch {}
  }, [draftKey]);
  useEffect(() => {
    try {
      if (draft) sessionStorage.setItem(draftKey, draft);
      else sessionStorage.removeItem(draftKey);
    } catch {}
  }, [draft, draftKey]);

  const markRead = useCallback(() => {
    if (readTimer.current) clearTimeout(readTimer.current);
    readTimer.current = setTimeout(() => void markConversationRead(conversationId), 600);
  }, [conversationId]);

  useEffect(() => {
    markRead();
  }, [markRead]);

  useRealtime<Message>(
    `messages:${conversationId}`,
    { table: "messages", event: "INSERT", filter: `conversation_id=eq.${conversationId}` },
    (payload) => {
      const m = payload.new as Message;
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      if (m.from_student !== (side === "student")) markRead();
    },
  );

  useRealtime<Conversation>(
    `conversation:${conversationId}`,
    { table: "conversations", event: "UPDATE", filter: `id=eq.${conversationId}` },
    (payload) => {
      const row = payload.new as Conversation;
      setOtherRead(row[otherReadField]);
    },
  );

  // Keep the newest message in view if the reader is already near the bottom.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && nearBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = scroller.current;
    if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const autoGrow = () => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  };
  useEffect(autoGrow, [draft]);

  const deliver = async (temp: LocalMessage) => {
    const res = await sendMessage({ conversationId, body: temp.body });
    setMessages((prev) => {
      if (!res.ok) return prev.map((m) => (m.id === temp.id ? { ...m, pending: false, failed: true } : m));
      const real = res.data!;
      const withoutTemp = prev.filter((m) => m.id !== temp.id);
      return withoutTemp.some((m) => m.id === real.id) ? withoutTemp : [...withoutTemp, real];
    });
  };

  const send = () => {
    const body = draft.trim();
    if (!body || body.length > MAX) return;
    const temp: LocalMessage = {
      id: `temp-${crypto.randomUUID()}`,
      conversation_id: conversationId,
      sender_id: viewerId,
      from_student: side === "student",
      body,
      created_at: new Date().toISOString(),
      pending: true,
    };
    nearBottom.current = true;
    setMessages((prev) => [...prev, temp]);
    setDraft("");
    void deliver(temp);
    textarea.current?.focus();
  };

  const retry = (m: LocalMessage) => {
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, pending: true, failed: false } : x)));
    void deliver(m);
  };

  const isMine = (m: Message) => m.from_student === (side === "student");
  const personFor = (m: Message) => (m.sender_id ? people[m.sender_id] : m.from_student ? anonymousStudent : undefined);
  const lastOwn = [...messages].reverse().find((m) => isMine(m) && !m.pending && !m.failed);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scroller}
        onScroll={onScroll}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6"
        aria-live="polite"
        aria-label="Conversation"
      >
        {intro}
        <ol className="space-y-1">
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const mine = isMine(m);
            const newDay = !prev || dayKey(prev.created_at, tz) !== dayKey(m.created_at, tz);
            const startsGroup =
              newDay ||
              prev.from_student !== m.from_student ||
              Date.parse(m.created_at) - Date.parse(prev.created_at) > GROUP_GAP_MS;
            const endsGroup =
              !next ||
              next.from_student !== m.from_student ||
              Date.parse(next.created_at) - Date.parse(m.created_at) > GROUP_GAP_MS ||
              dayKey(next.created_at, tz) !== dayKey(m.created_at, tz);
            const person = personFor(m);

            return (
              <li key={m.id}>
                {newDay && (
                  <div className="my-5 flex items-center gap-3 text-xs font-medium text-ink-3">
                    <span className="h-px flex-1 bg-line" />
                    {dayLabel(m.created_at, tz)}
                    <span className="h-px flex-1 bg-line" />
                  </div>
                )}
                <motion.div
                  initial={m.pending ? { opacity: 0, y: 6 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn("flex items-end gap-2.5", mine ? "justify-end" : "justify-start", startsGroup && "pt-3")}
                >
                  {!mine && (
                    <div className="w-8 shrink-0">
                      {endsGroup && person && <Avatar name={person.name} hue={person.hue} size="sm" />}
                    </div>
                  )}
                  <div className={cn("flex max-w-[min(78%,560px)] flex-col", mine ? "items-end" : "items-start")}>
                    {startsGroup && !mine && person && (
                      <span className="mb-1 ml-1 text-xs font-medium text-ink-3">{person.name}</span>
                    )}
                    <div
                      className={cn(
                        "whitespace-pre-wrap break-words px-4 py-2.5 text-[15px] leading-relaxed",
                        mine
                          ? "rounded-[20px] rounded-br-md bg-primary text-primary-ink"
                          : "rounded-[20px] rounded-bl-md border border-line bg-surface text-ink",
                        mine && !endsGroup && "rounded-br-[20px]",
                        !mine && !endsGroup && "rounded-bl-[20px]",
                        m.pending && "opacity-70",
                        m.failed && "bg-danger-soft text-danger",
                      )}
                    >
                      {m.body}
                    </div>
                    {endsGroup && (
                      <span className="mt-1 flex items-center gap-1 px-1 text-[11px] text-ink-3">
                        {formatTime(m.created_at, tz)}
                        {m.failed ? (
                          <button onClick={() => retry(m)} className="ml-1 inline-flex items-center gap-1 font-medium text-danger hover:underline">
                            <AlertCircle className="size-3" /> Not sent · Retry <RotateCw className="size-3" />
                          </button>
                        ) : m.pending ? (
                          <span className="ml-0.5">· Sending…</span>
                        ) : mine && m.id === lastOwn?.id ? (
                          otherRead && Date.parse(otherRead) >= Date.parse(m.created_at) ? (
                            <span className="ml-0.5 inline-flex items-center gap-0.5 text-primary">
                              <CheckCheck className="size-3.5" /> Seen
                            </span>
                          ) : (
                            <span className="ml-0.5 inline-flex items-center gap-0.5">
                              <Check className="size-3.5" /> Delivered
                            </span>
                          )
                        ) : null}
                      </span>
                    )}
                  </div>
                </motion.div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="border-t border-line bg-surface/80 px-3 pb-3 pt-3 backdrop-blur sm:px-5">
        {closedNotice}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-end gap-2 rounded-[22px] border border-line-strong bg-surface p-1.5 pl-2 shadow-sm transition focus-within:border-primary focus-within:ring-4 focus-within:ring-[var(--ring)]"
        >
          {quickReplies && quickReplies.length > 0 && (
            <Popover>
              <PopoverTrigger
                type="button"
                className="mb-0.5 rounded-full p-2 text-ink-3 transition hover:bg-surface-2 hover:text-primary"
                aria-label="Insert a quick reply"
                title="Quick replies"
              >
                <Zap className="size-[18px]" />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(360px,calc(100vw-24px))] p-1.5">
                <p className="px-3 pb-1 pt-2 text-xs font-medium text-ink-3">Quick replies (edit before sending)</p>
                {quickReplies.map((q) => (
                  <PopoverClose asChild key={q}>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft((d) => (d ? `${d}\n\n${q}` : q));
                        textarea.current?.focus();
                      }}
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm leading-snug text-ink-2 transition hover:bg-surface-2 hover:text-ink"
                    >
                      {q}
                    </button>
                  </PopoverClose>
                ))}
              </PopoverContent>
            </Popover>
          )}
          <label htmlFor={`composer-${conversationId}`} className="sr-only">
            Message
          </label>
          <textarea
            id={`composer-${conversationId}`}
            ref={textarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(min-width: 768px)").matches) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            maxLength={MAX}
            placeholder={placeholder}
            className="max-h-[220px] min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-relaxed text-ink placeholder:text-ink-3 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-ink shadow-sm transition hover:bg-primary-hover active:scale-95 disabled:bg-surface-3 disabled:text-ink-3"
            aria-label="Send message"
          >
            <ArrowUp className="size-[18px]" />
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between px-2 text-[11px] text-ink-3">
          <span className="inline-flex items-center gap-1">
            <Lock className="size-3" /> Only you and your {side === "student" ? "counselor" : "student"} can see this conversation
          </span>
          <AnimatePresence>
            {draft.length > MAX * 0.8 && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn(draft.length >= MAX && "text-danger")}>
                {draft.length}/{MAX}
              </motion.span>
            )}
          </AnimatePresence>
          <span className="hidden md:inline">Enter to send · Shift + Enter for a new line</span>
        </div>
      </div>
    </div>
  );
}
