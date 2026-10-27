"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Eye, EyeOff, Flag, Loader2, Trash2, Users } from "lucide-react";
import { guessDoodle, hideDoodle, loadDoodles, removeDoodle, reportDoodle, revealDoodle } from "@/actions/doodles";
import type { Doodle } from "@/lib/doodles";
import type { Role } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Confetti } from "./shared";

function DoodleCard({ doodle, staff, onChange, onRemove }: { doodle: Doodle; staff: boolean; onChange: (d: Doodle) => void; onRemove: () => void }) {
  const [guess, setGuess] = useState("");
  const [shake, setShake] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [busy, start] = useTransition();
  const finished = doodle.is_mine || doodle.solved || doodle.revealed || doodle.attempts >= 3;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim()) return;
    start(async () => {
      const r = await guessDoodle(doodle.id, guess);
      if (!r.ok) return void toast.error(r.error);
      const { correct, answer, attempts } = r.data!;
      onChange({ ...doodle, solved: correct, attempts, answer: answer ?? doodle.answer, solvers: doodle.solvers + (correct ? 1 : 0) });
      if (correct) setCelebrate(true);
      else {
        setShake(true);
        setTimeout(() => setShake(false), 450);
        setGuess("");
      }
    });
  };

  const act = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, done?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error ?? "Something went wrong.");
      if (r.message) toast.success(r.message);
      done?.();
    });

  return (
    <li className={cn("relative flex flex-col overflow-hidden rounded-3xl border bg-surface shadow-sm", doodle.hidden ? "border-danger/40 opacity-80" : "border-line")}>
      {celebrate && <Confetti count={24} />}
      <div className="relative aspect-[4/3] bg-white">
        {doodle.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from private storage
          <img src={doodle.url} alt={finished && doodle.answer ? `A doodle of ${doodle.answer}` : "A doodle to guess"} className="h-full w-full object-contain" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-3">Image unavailable</div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1">
          {doodle.is_mine && <Badge tone="primary">Yours</Badge>}
          {doodle.hidden && <Badge tone="danger">Hidden</Badge>}
          {staff && doodle.report_count > 0 && (
            <Badge tone="pending">
              <Flag /> {doodle.report_count}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        {finished && doodle.answer ? (
          <p className={cn("font-display text-xl", doodle.solved ? "text-ok" : "text-ink")}>
            {doodle.solved && <Check className="mr-1 inline size-5" />}
            {doodle.answer}
          </p>
        ) : (
          <p className="font-mono text-xl tracking-[0.25em] text-ink" aria-label={`${doodle.hint.length} characters`}>
            {doodle.hint}
          </p>
        )}
        <p className="mt-1 flex items-center gap-1 text-xs text-ink-3">
          <Users className="size-3" /> {doodle.solvers} guessed it · {relativeTime(doodle.created_at)}
          {staff && doodle.author_name && ` · by ${doodle.author_name}`}
        </p>

        {!finished && (
          <form onSubmit={submit} className="mt-3">
            <div className={cn("flex gap-2", shake && "animate-shake")}>
              <Input value={guess} onChange={(e) => setGuess(e.target.value)} placeholder="Your guess" aria-label="Your guess" className="h-10 text-sm" maxLength={40} autoComplete="off" />
              <Button type="submit" size="sm" className="h-10" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : "Guess"}
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-ink-3">
              <span>{3 - doodle.attempts} of 3 tries left</span>
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-ink"
                onClick={() =>
                  act(
                    async () => {
                      const r = await revealDoodle(doodle.id);
                      if (r.ok) onChange({ ...doodle, revealed: true, answer: r.data!.answer });
                      return r;
                    },
                  )
                }
              >
                <Eye className="size-3" /> Show answer
              </button>
            </div>
          </form>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-1 pt-3">
          {!doodle.is_mine && !staff && (
            <Button
              variant="ghost"
              size="sm"
              className="text-ink-3"
              onClick={() => {
                if (confirm("Report this doodle as unkind or inappropriate?")) act(() => reportDoodle(doodle.id));
              }}
            >
              <Flag /> Report
            </Button>
          )}
          {staff && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => act(() => hideDoodle(doodle.id, !doodle.hidden), () => onChange({ ...doodle, hidden: !doodle.hidden }))}
            >
              {doodle.hidden ? <Eye /> : <EyeOff />} {doodle.hidden ? "Unhide" : "Hide"}
            </Button>
          )}
          {(doodle.is_mine || staff) && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-danger hover:text-danger"
              onClick={() => {
                if (confirm("Delete this doodle?")) act(() => removeDoodle(doodle.id), onRemove);
              }}
            >
              <Trash2 /> Delete
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

export function DoodleWall({ initial, role, onDraw }: { initial: Doodle[]; role: Role; onDraw: () => void }) {
  const [doodles, setDoodles] = useState(initial);
  const [more, setMore] = useState(initial.length >= 24);
  const [loading, start] = useTransition();
  const staff = role !== "student";

  const loadMore = () =>
    start(async () => {
      const last = doodles[doodles.length - 1];
      const next = await loadDoodles(last?.created_at);
      setDoodles((d) => [...d, ...next.filter((n) => !d.some((x) => x.id === n.id))]);
      setMore(next.length >= 24);
    });

  if (!doodles.length)
    return (
      <div className="rounded-3xl border border-dashed border-line-strong bg-surface/70">
        <EmptyState
          illustration="character-drawing"
          title="The wall is empty"
          description="Be the first to draw something for everyone to guess."
          action={
            <Button className="rounded-full" onClick={onDraw}>
              Draw a doodle
            </Button>
          }
        />
      </div>
    );

  return (
    <div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {doodles.map((d) => (
          <DoodleCard
            key={d.id}
            doodle={d}
            staff={staff}
            onChange={(n) => setDoodles((all) => all.map((x) => (x.id === n.id ? n : x)))}
            onRemove={() => setDoodles((all) => all.filter((x) => x.id !== d.id))}
          />
        ))}
      </ul>
      {more && (
        <div className="mt-6 text-center">
          <Button variant="secondary" onClick={loadMore} loading={loading}>
            Load more doodles
          </Button>
        </div>
      )}
    </div>
  );
}
