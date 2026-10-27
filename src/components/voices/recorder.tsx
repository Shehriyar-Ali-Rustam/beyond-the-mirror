"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Mic, RotateCcw, ShieldCheck, Square, Upload, VenetianMask } from "lucide-react";
import { submitVoiceNote } from "@/actions/voices";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import {
  formatSeconds,
  VOICE_CATEGORIES,
  VOICE_LANGUAGES,
  VOICE_MAX_SECONDS,
  VOICE_MIN_SECONDS,
  voiceCategory,
  type VoiceCategory,
  type VoiceLanguage,
} from "@/lib/voice-meta";
import { cn } from "@/lib/utils";
import { VoicePlayer } from "./voice-player";

const MAX_BYTES = 3.5 * 1024 * 1024;
const RECORD_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
const EXT: Record<string, string> = { "audio/webm": "webm", "audio/mp4": "m4a", "audio/ogg": "ogg", "audio/mpeg": "mp3" };

const now = () => performance.now();

type Take = { blob: Blob; url: string; seconds: number; type: string };

/** Reads the real length of an uploaded file (recorded WebM often has no duration header). */
async function measure(blob: Blob) {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    return buffer.duration;
  } finally {
    void ctx.close();
  }
}

export function Recorder({ firstName, onSubmitted }: { firstName: string; onSubmitted: () => void }) {
  const [state, action, pending] = useActionState(submitVoiceNote, null);
  const [category, setCategory] = useState<VoiceCategory>("lonely");
  const [language, setLanguage] = useState<VoiceLanguage>("en");
  const [title, setTitle] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [speaker, setSpeaker] = useState(firstName);
  const [consent, setConsent] = useState(false);
  const [take, setTake] = useState<Take | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(28).fill(0.08));
  const [error, setError] = useState<string | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const started = useRef(0);
  const raf = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cat = voiceCategory(category);

  const cleanup = () => {
    cancelAnimationFrame(raf.current);
    if (timer.current) clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  useEffect(() => cleanup, []);
  useEffect(() => () => void (take && URL.revokeObjectURL(take.url)), [take]);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Sent for review");
      /* eslint-disable react-hooks/set-state-in-effect -- reset after a successful submission */
      setTake(null);
      setTitle("");
      setConsent(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      onSubmitted();
    } else toast.error(state.error);
  }, [state, onSubmitted]);

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Recording isn't supported in this browser. You can upload an audio file instead.");
      return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      stream.current = media;
      const mimeType = RECORD_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(media, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 64000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        const seconds = Math.round((now() - started.current) / 1000);
        const type = (rec.mimeType || mimeType || "audio/webm").split(";")[0];
        const blob = new Blob(chunks, { type });
        cleanup();
        setRecording(false);
        setLevels(Array(28).fill(0.08));
        if (seconds < VOICE_MIN_SECONDS) {
          setError(`That was ${seconds} seconds. Voice notes need to be at least ${VOICE_MIN_SECONDS} seconds, so give it another go.`);
          return;
        }
        setTake({ blob, url: URL.createObjectURL(blob), seconds: Math.min(seconds, VOICE_MAX_SECONDS), type });
      };

      // Live level meter.
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      ctx.createMediaStreamSource(media).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        setLevels(Array.from({ length: 28 }, (_, i) => Math.max(0.08, (data[i % data.length] ?? 0) / 255)));
        raf.current = requestAnimationFrame(tick);
      };
      tick();

      recorder.current = rec;
      started.current = now();
      setElapsed(0);
      setTake(null);
      rec.start(250);
      setRecording(true);
      timer.current = setInterval(() => {
        const s = (now() - started.current) / 1000;
        setElapsed(s);
        if (s >= VOICE_MAX_SECONDS) stop();
      }, 200);
      rec.addEventListener("stop", () => void ctx.close().catch(() => {}));
    } catch {
      cleanup();
      setError("We couldn't use your microphone. Check that you've allowed it in your browser settings, or upload a file.");
    }
  };

  const stop = () => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  };

  const upload = async (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = "";
    if (!file) return;
    setError(null);
    const type = file.type.split(";")[0];
    if (!EXT[type] && !["audio/x-m4a", "audio/mp3"].includes(type)) return setError("Please choose an MP3, M4A, OGG or WebM audio file.");
    if (file.size > MAX_BYTES) return setError("That file is too big. Voice notes can be up to 3.5 MB.");
    try {
      const seconds = Math.round(await measure(file));
      if (seconds < VOICE_MIN_SECONDS || seconds > VOICE_MAX_SECONDS + 2) {
        return setError(`That recording is ${seconds} seconds. Voice notes need to be between ${VOICE_MIN_SECONDS} and ${VOICE_MAX_SECONDS} seconds.`);
      }
      const normalized = type === "audio/x-m4a" ? "audio/mp4" : type === "audio/mp3" ? "audio/mpeg" : type;
      setTake({ blob: file, url: URL.createObjectURL(file), seconds: Math.min(seconds, VOICE_MAX_SECONDS), type: normalized });
    } catch {
      setError("That file couldn't be played. Try a different recording.");
    }
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!take) return void toast.error("Record or upload a voice note first.");
    const fd = new FormData();
    fd.set("category", category);
    fd.set("language", language);
    fd.set("title", title);
    if (anonymous) fd.set("anonymous", "on");
    else fd.set("speakerName", speaker);
    fd.set("duration", String(take.seconds));
    if (consent) fd.set("consent", "on");
    fd.set("audio", new File([take.blob], `voice.${EXT[take.type] ?? "webm"}`, { type: take.type }));
    startTransition(() => action(fd));
  };

  const remaining = Math.max(0, VOICE_MAX_SECONDS - elapsed);

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold text-ink">1. Who is this voice note for?</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {VOICE_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                aria-pressed={category === c.id}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3 text-left text-sm transition",
                  category === c.id ? "border-transparent shadow-sm ring-2" : "border-line hover:border-line-strong",
                )}
                style={category === c.id ? { boxShadow: `0 0 0 2px ${c.color}`, background: `${c.color}12` } : undefined}
              >
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-lg", c.tone)}>{c.emoji}</span>
                <span className="font-medium text-ink">{c.title}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 rounded-2xl bg-surface-2 p-3 text-sm leading-relaxed text-ink-2">
            <span className="font-medium text-ink">Idea: </span>
            {cat.prompt}
          </p>
        </section>

        <section className="rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">2. Record ({VOICE_MIN_SECONDS} to {VOICE_MAX_SECONDS} seconds)</p>
            <div className="inline-flex rounded-xl bg-surface-2 p-1" role="radiogroup" aria-label="Language">
              {VOICE_LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={language === l.id}
                  onClick={() => setLanguage(l.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                    language === l.id ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink",
                  )}
                >
                  {l.native}
                </button>
              ))}
            </div>
          </div>

          <div
            className="relative mt-4 overflow-hidden rounded-3xl p-6 text-center"
            style={{ background: `linear-gradient(135deg, ${cat.color}1f, ${cat.color}0a)` }}
          >
            {take && !recording ? (
              <div className="animate-fade-up text-left">
                <p className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
                  <CheckCircle2 className="size-4 text-ok" /> Listen back before you send it ({formatSeconds(take.seconds)})
                </p>
                <VoicePlayer id="preview" src={take.url} duration={take.seconds} color={cat.deep} />
                <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => setTake(null)}>
                  <RotateCcw /> Record again
                </Button>
              </div>
            ) : (
              <>
                <div className="mx-auto flex h-16 max-w-sm items-center justify-center gap-[3px]" aria-hidden>
                  {levels.map((l, i) => (
                    <span
                      key={i}
                      className="w-1.5 rounded-full transition-[height] duration-75"
                      style={{ height: `${Math.round(l * 100)}%`, background: recording ? cat.color : "var(--line-strong)" }}
                    />
                  ))}
                </div>
                <p className="mt-3 font-display text-3xl tabular-nums text-ink" aria-live="polite">
                  {recording ? formatSeconds(elapsed) : "0:00"}
                </p>
                <p className="text-xs text-ink-3">
                  {recording
                    ? elapsed < VOICE_MIN_SECONDS
                      ? `Keep going: ${Math.ceil(VOICE_MIN_SECONDS - elapsed)}s until the minimum`
                      : `${Math.ceil(remaining)}s left`
                    : "Find a quiet spot and speak like you're talking to a friend."}
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {recording ? (
                    <Button type="button" variant="danger" size="lg" onClick={stop} className="rounded-full">
                      <Square fill="currentColor" /> Stop
                    </Button>
                  ) : (
                    <>
                      <Button type="button" size="lg" onClick={start} className="rounded-full">
                        <Mic /> Start recording
                      </Button>
                      <Button type="button" variant="secondary" size="lg" className="rounded-full" onClick={() => fileInput.current?.click()}>
                        <Upload /> Upload a file
                      </Button>
                    </>
                  )}
                </div>
                {recording && (
                  <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-danger px-2.5 py-1 text-xs font-semibold text-white">
                    <span className="size-1.5 animate-ping rounded-full bg-white" /> REC
                  </span>
                )}
              </>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/ogg,audio/webm,.mp3,.m4a,.ogg,.webm"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </div>
          {error && (
            <p className="mt-3 rounded-2xl bg-warn-soft p-3 text-sm text-warn" role="alert">
              {error}
            </p>
          )}
        </section>

        <section className="space-y-4 rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold text-ink">3. A few details</p>
          <Field label="Title" htmlFor="voice-title" hint="Shown to listeners, e.g. “It gets lighter, I promise”.">
            <Input id="voice-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="A short title" required minLength={3} />
          </Field>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-3.5 transition hover:border-line-strong">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="mt-1 size-4 accent-[var(--primary)]" />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <VenetianMask className="size-4 text-lilac" /> Keep my name private
              </span>
              <span className="mt-0.5 block text-[13px] text-ink-3">
                Listeners will see “Someone from your school”. Counselors can see who recorded it, for safety.
              </span>
            </span>
          </label>
          {!anonymous && (
            <Field label="Name to show" htmlFor="voice-speaker" hint="A first name or nickname is plenty.">
              <Input id="voice-speaker" value={speaker} onChange={(e) => setSpeaker(e.target.value)} maxLength={40} />
            </Field>
          )}
          <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-2">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-4 accent-[var(--primary)]" />
            I recorded this myself, it doesn&apos;t name anyone, and I&apos;m happy for students at my school to hear it after a counselor
            has reviewed it. I can delete it at any time.
          </label>
          <Button type="submit" size="lg" loading={pending} disabled={!take || !consent || title.trim().length < 3}>
            Send for review
          </Button>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
          <p className="flex items-center gap-2 font-medium text-ink">
            <ShieldCheck className="size-4 text-primary" /> Before you record
          </p>
          <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink-2">
            <li>💬 Talk like a friend, not a teacher. Real and simple works best.</li>
            <li>🙈 Don&apos;t say your full name or anyone else&apos;s, and skip details like your class or address.</li>
            <li>🩺 Share what helped you, but don&apos;t give medical advice or diagnoses.</li>
            <li>✅ Every voice note is listened to by a counselor before anyone else hears it.</li>
            <li>🗑️ You can delete your voice note whenever you like.</li>
          </ul>
        </div>
      </aside>
    </form>
  );
}
