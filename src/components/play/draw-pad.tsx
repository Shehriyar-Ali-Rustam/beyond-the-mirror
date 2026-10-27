"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Eraser, RefreshCw, Send, Trash2, Undo2 } from "lucide-react";
import { postDoodle } from "@/actions/doodles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DRAW_PROMPTS } from "./doodle-art";
import { pick } from "./shared";

const W = 640;
const H = 480;
const COLORS = ["#15201c", "#ef6a55", "#f5b82e", "#34b892", "#4b9fe1", "#9b85dd", "#e86a9a", "#8a5a3b"];
const SIZES = [4, 9, 18];

type Stroke = { color: string; size: number; points: [number, number][] };

function paint(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of strokes) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.beginPath();
    s.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (s.points.length === 1) ctx.lineTo(s.points[0][0] + 0.1, s.points[0][1]);
    ctx.stroke();
  }
}

export function DrawPad({ signedIn, onPosted }: { signedIn: boolean; onPosted?: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [erasing, setErasing] = useState(false);
  const [word, setWord] = useState(DRAW_PROMPTS[0]);
  const [posting, startPosting] = useTransition();
  const drawing = useRef<Stroke | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pick a random prompt on the client only
    setWord(pick(DRAW_PROMPTS));
  }, []);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx) paint(ctx, strokes);
  }, [strokes]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [Math.round(((e.clientX - rect.left) / rect.width) * W), Math.round(((e.clientY - rect.top) / rect.height) * H)];
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = { color: erasing ? "#ffffff" : color, size: erasing ? 28 : size, points: [point(e)] };
    const ctx = canvas.current!.getContext("2d")!;
    paint(ctx, [...strokes, drawing.current]);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current.points.push(point(e));
    const ctx = canvas.current!.getContext("2d")!;
    const s = drawing.current;
    const [x0, y0] = s.points[s.points.length - 2];
    const [x1, y1] = s.points[s.points.length - 1];
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };
  const up = () => {
    if (!drawing.current) return;
    const s = drawing.current;
    drawing.current = null;
    setStrokes((prev) => [...prev, s]);
  };

  const toBlob = () => new Promise<Blob | null>((r) => canvas.current?.toBlob(r, "image/png"));
  const inked = strokes.some((s) => s.color !== "#ffffff");

  const download = async () => {
    const blob = await toBlob();
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `doodle-${word.replace(/ /g, "-")}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const post = () =>
    startPosting(async () => {
      const blob = await toBlob();
      if (!blob) return void toast.error("Couldn't read your drawing.");
      const fd = new FormData();
      fd.set("word", word.trim().toLowerCase());
      fd.set("image", new File([blob], "doodle.png", { type: "image/png" }));
      const r = await postDoodle(fd);
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message ?? "Posted!");
      setStrokes([]);
      setWord(pick(DRAW_PROMPTS));
      onPosted?.();
    });

  const validWord = /^[a-z][a-z ]{1,23}$/.test(word.trim().toLowerCase());

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setColor(c);
                setErasing(false);
              }}
              aria-label={`Colour ${c}`}
              aria-pressed={!erasing && color === c}
              className={cn("size-8 rounded-full shadow-sm transition hover:scale-110", !erasing && color === c && "ring-2 ring-ink ring-offset-2 ring-offset-bg")}
              style={{ background: c }}
            />
          ))}
          <span className="mx-1 h-6 w-px bg-line-strong" />
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSize(s);
                setErasing(false);
              }}
              aria-label={`Brush size ${s}`}
              aria-pressed={!erasing && size === s}
              className={cn("flex size-8 items-center justify-center rounded-full bg-surface shadow-sm", !erasing && size === s && "ring-2 ring-ink")}
            >
              <span className="rounded-full bg-ink" style={{ width: Math.max(4, s / 1.5), height: Math.max(4, s / 1.5) }} />
            </button>
          ))}
          <Button type="button" size="icon-sm" variant={erasing ? "primary" : "secondary"} onClick={() => setErasing((e) => !e)} aria-label="Eraser" aria-pressed={erasing}>
            <Eraser />
          </Button>
          <Button type="button" size="icon-sm" variant="secondary" onClick={() => setStrokes((s) => s.slice(0, -1))} disabled={!strokes.length} aria-label="Undo">
            <Undo2 />
          </Button>
          <Button type="button" size="icon-sm" variant="secondary" onClick={() => setStrokes([])} disabled={!strokes.length} aria-label="Clear">
            <Trash2 />
          </Button>
        </div>
        <canvas
          ref={canvas}
          width={W}
          height={H}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
          className={cn("block aspect-[4/3] w-full rounded-3xl bg-white shadow-lg ring-1 ring-line", erasing ? "cursor-cell" : "cursor-crosshair")}
          style={{ touchAction: "none" }}
          aria-label="Drawing canvas"
        />
      </div>

      <aside className="space-y-4">
        <div className="rounded-3xl bg-gradient-to-br from-lilac-soft to-rose-soft p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-grape">Your word</p>
          <Input value={word} onChange={(e) => setWord(e.target.value.toLowerCase())} maxLength={24} className="mt-2 bg-surface font-display text-xl" aria-label="Word to draw" />
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setWord(pick(DRAW_PROMPTS.filter((w) => w !== word)))}>
            <RefreshCw /> Different word
          </Button>
          <p className="mt-2 text-xs text-ink-2">Draw it without writing any letters or numbers. Others will try to guess it!</p>
        </div>
        {signedIn ? (
          <Button size="lg" className="w-full rounded-full" onClick={post} loading={posting} disabled={!inked || !validWord}>
            {!posting && <Send />} Post to the Doodle Wall
          </Button>
        ) : (
          <div className="rounded-3xl border border-line bg-surface p-4 text-sm text-ink-2">
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>{" "}
            to post your doodle on the Doodle Wall for other students to guess.
          </div>
        )}
        <Button variant="secondary" className="w-full rounded-full" onClick={download} disabled={!inked}>
          <Download /> Save to my device
        </Button>
        {!validWord && <p className="text-xs text-danger">Use a simple word or two, letters only.</p>}
      </aside>
    </div>
  );
}
