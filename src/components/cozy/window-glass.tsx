import { useEffect, useId, useMemo, useRef, type RefObject } from "react";
import { GLASS, SCENE_H, SCENE_W, VIEW_H, VIEW_PAD_X, VIEW_PAD_Y, VIEW_W } from "./geometry";
import { GlassDrops } from "./glass-drops";
import { OutsideWeather } from "./outside-weather";
import { hexToRgb, skyPalette } from "./palette";
import { now } from "./rng";
import type { TimeOfDay, ViewId, Weather } from "./state";
import { WindowView } from "./window-view";

/* -----------------------------------------------------------------------------
   The arched window: the view outside (with parallax), weather on one canvas,
   drops on the glass on another, plus reflections and lightning.
----------------------------------------------------------------------------- */

export type Pointer = { x: number; y: number };
export type GlassControl = { strike: () => void };

const rgbStr = (hex: string) => hexToRgb(hex).join(",");

export function WindowGlass({
  view,
  weather,
  time,
  lampOn,
  reduced,
  pointerRef,
  controlRef,
}: {
  view: ViewId;
  weather: Weather;
  time: TimeOfDay;
  lampOn: boolean;
  reduced: boolean;
  pointerRef: RefObject<Pointer>;
  controlRef: RefObject<GlassControl | null>;
}) {
  const id = "czv" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const palette = useMemo(() => skyPalette(time, weather), [time, weather]);
  const boxRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const outsideRef = useRef<HTMLCanvasElement>(null);
  const dropsRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const engines = useRef<{ outside: OutsideWeather; drops: GlassDrops } | null>(null);

  // Create the simulations once and run a single animation loop for both.
  useEffect(() => {
    const box = boxRef.current;
    const oc = outsideRef.current;
    const dc = dropsRef.current;
    if (!box || !oc || !dc) return;
    const outside = new OutsideWeather(oc);
    const drops = new GlassDrops(dc);
    engines.current = { outside, drops };

    const resize = () => {
      const rect = box.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      outside.resize(rect.width, rect.height, dpr);
      drops.resize(rect.width, rect.height, Math.min(2, dpr * 1.25));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    let raf = 0;
    let last = now();
    let onScreen = true;
    const cur = { x: 0, y: 0 };
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const t = now();
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      outside.step(dt);
      outside.draw();
      drops.step(dt);
      drops.draw();
      const target = pointerRef.current;
      if (target) {
        const k = Math.min(1, dt * 2.5);
        cur.x += (target.x - cur.x) * k;
        cur.y += (target.y - cur.y) * k;
        const v = viewRef.current;
        if (v) {
          v.style.setProperty("--px", cur.x.toFixed(4));
          v.style.setProperty("--py", cur.y.toFixed(4));
        }
      }
    };
    const start = () => {
      if (raf || document.hidden || !onScreen) return;
      last = now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) start();
      else stop();
    });
    io.observe(box);
    start();

    controlRef.current = {
      strike: () => {
        outside.strike();
        flashRef.current?.animate(
          [
            { opacity: 0, offset: 0 },
            { opacity: 0.34, offset: 0.12 },
            { opacity: 0.12, offset: 0.26 },
            { opacity: 0.24, offset: 0.36 },
            { opacity: 0, offset: 1 },
          ],
          { duration: 1300, easing: "ease-out" },
        );
      },
    };

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      engines.current = null;
      controlRef.current = null;
    };
  }, [pointerRef, controlRef]);

  // Restyle the weather and the glass when the scene changes.
  useEffect(() => {
    const e = engines.current;
    if (!e) return;
    e.outside.configure(weather, time, reduced, rgbStr(palette.rainColor), rgbStr(palette.haze));
    const mist = time === "day" ? "222,230,240" : time === "evening" ? "214,198,204" : lampOn ? "128,112,112" : "104,108,128";
    const glint = time === "day" ? "rgba(255,255,255,0.92)" : lampOn ? "rgba(255,226,182,0.9)" : "rgba(214,226,255,0.85)";
    e.drops.configure(weather, reduced, mist, glint);
  }, [weather, time, reduced, lampOn, palette]);

  // Give the drops a little picture of the view to refract.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const c = document.createElement("canvas");
      c.width = 320;
      c.height = Math.round((320 * GLASS.h) / GLASS.w);
      const g = c.getContext("2d");
      if (!g) return;
      g.drawImage(img, VIEW_PAD_X, VIEW_PAD_Y, GLASS.w, GLASS.h, 0, 0, c.width, c.height);
      engines.current?.drops.setBackground(c);
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    return () => {
      cancelled = true;
    };
  }, [view, palette]);

  const night = time !== "day";
  return (
    <div
      ref={boxRef}
      className="absolute overflow-hidden"
      style={{
        left: `${(GLASS.x / SCENE_W) * 100}%`,
        top: `${(GLASS.y / SCENE_H) * 100}%`,
        width: `${(GLASS.w / SCENE_W) * 100}%`,
        height: `${(GLASS.h / SCENE_H) * 100}%`,
        borderTopLeftRadius: `50% ${(GLASS.w / 2 / GLASS.h) * 100}%`,
        borderTopRightRadius: `50% ${(GLASS.w / 2 / GLASS.h) * 100}%`,
        background: palette.mid,
      }}
    >
      <div
        ref={viewRef}
        className="absolute"
        style={{
          left: `${(-VIEW_PAD_X / GLASS.w) * 100}%`,
          top: `${(-VIEW_PAD_Y / GLASS.h) * 100}%`,
          width: `${(VIEW_W / GLASS.w) * 100}%`,
          height: `${(VIEW_H / GLASS.h) * 100}%`,
        }}
      >
        <WindowView view={view} palette={palette} idPrefix={id} svgRef={svgRef} className="block h-full w-full" />
      </div>
      <div ref={flashRef} className="pointer-events-none absolute inset-0 bg-[#e6edff] opacity-0" />
      <canvas ref={outsideRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      {/* the room faintly reflected in the glass after dark */}
      {night && lampOn && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(60% 45% at 8% 92%, rgba(255,190,120,0.16), transparent 70%)" }}
        />
      )}
      <canvas ref={dropsRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(118deg, transparent 28%, rgba(255,255,255,0.07) 38%, transparent 46%, transparent 58%, rgba(255,255,255,0.04) 63%, transparent 68%)" }}
      />
    </div>
  );
}
