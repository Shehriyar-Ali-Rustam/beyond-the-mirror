import { useEffect, useRef, type ReactNode } from "react";
import { darken, lighten, type Shade } from "./palette";
import { drinkColor, fabricColor, hairColor, skinColor, type Activity, type CharacterLook, type Drink } from "./state";

/* -----------------------------------------------------------------------------
   The student's character: a small, round, original figure sitting cross-legged.
   Local coordinates: (0, 0) is the bottom centre of the seated figure and the
   head sits around y = -196. Pose loops use SMIL so that arms, mug, eyes and
   pages stay perfectly in step with each other.
----------------------------------------------------------------------------- */

type Pt = [number, number];
type Arm = { s: Pt; e: Pt; h: Pt };

const HEAD_Y = -196;

const ARMS: Record<"rest" | "read" | "drinkLow" | "drinkHigh", [Arm, Arm]> = {
  rest: [
    { s: [-38, -132], e: [-52, -90], h: [-20, -60] },
    { s: [38, -132], e: [52, -90], h: [20, -60] },
  ],
  read: [
    { s: [-38, -132], e: [-56, -92], h: [-50, -60] },
    { s: [38, -132], e: [56, -92], h: [50, -60] },
  ],
  drinkLow: [
    { s: [-38, -132], e: [-52, -88], h: [-17, -92] },
    { s: [38, -132], e: [52, -88], h: [17, -92] },
  ],
  drinkHigh: [
    { s: [-38, -132], e: [-56, -110], h: [-17, -146] },
    { s: [38, -132], e: [56, -110], h: [17, -146] },
  ],
};

const armD = (a: Arm) => `M${a.s[0]},${a.s[1]} Q${a.e[0]},${a.e[1]} ${a.h[0]},${a.h[1]}`;
const sleeveD = (a: Arm) => {
  const mx = a.s[0] + (a.e[0] - a.s[0]) * 0.55;
  const my = a.s[1] + (a.e[1] - a.s[1]) * 0.55;
  return `M${a.s[0]},${a.s[1]} Q${(a.s[0] + mx) / 2 + (a.e[0] > 0 ? 2 : -2)},${(a.s[1] + my) / 2} ${mx},${my}`;
};

/** Keyframe timing for the sipping loop (9 seconds). */
const SIP = { dur: "9s", keyTimes: "0;0.55;0.64;0.82;0.92;1", splines: ".45 0 .3 1;.45 0 .3 1;.45 0 .3 1;.45 0 .3 1;.45 0 .3 1" };
const sipFrames = <T,>(low: T, high: T) => [low, low, high, high, low, low];

/* ---------------------------------- hair ---------------------------------- */

function curlRing(cx: number, cy: number, r: number, from: number, to: number, step: number, size: number) {
  const out: [number, number, number][] = [];
  for (let a = from; a <= to; a += step) {
    const rad = (a * Math.PI) / 180;
    out.push([cx + Math.cos(rad) * r, cy + Math.sin(rad) * r, size]);
  }
  return out;
}
const CURLS_BACK = curlRing(0, HEAD_Y + 4, 54, 150, 390, 20, 19);
const CURLS_FRONT = [...curlRing(0, HEAD_Y, 48, 200, 340, 18, 15), [-22, -226, 13], [0, -230, 14], [22, -226, 13]] as [number, number, number][];

function HairBack({ style, color, scarf }: { style: CharacterLook["hairStyle"]; color: string; scarf: string }) {
  const dark = darken(color, 0.18);
  switch (style) {
    case "long":
      return (
        <g>
          <path d="M-56,-200 C-66,-266 66,-266 56,-200 C60,-160 68,-118 64,-78 C44,-68 -44,-68 -64,-78 C-68,-118 -60,-160 -56,-200 Z" fill={color} />
          <path d="M-40,-150 C-44,-120 -46,-100 -48,-80 M40,-150 C44,-120 46,-100 48,-80" stroke={dark} strokeWidth="2" fill="none" opacity="0.5" />
        </g>
      );
    case "bob":
      return <path d="M-58,-200 C-66,-266 66,-266 58,-200 C61,-182 61,-160 57,-142 C40,-136 -40,-136 -57,-142 C-61,-160 -61,-182 -58,-200 Z" fill={color} />;
    case "bun":
      return (
        <g>
          <circle cx="0" cy="-262" r="23" fill={color} />
          <path d="M-14,-270 C-6,-278 6,-278 14,-270" stroke={dark} strokeWidth="2" fill="none" opacity="0.6" />
          <path d="M-18,-246 C-8,-240 8,-240 18,-246" stroke={darken(color, 0.3)} strokeWidth="5" strokeLinecap="round" fill="none" />
        </g>
      );
    case "braid":
      return <path d="M-55,-200 C-62,-262 62,-262 55,-200 C52,-186 40,-178 30,-176 L-30,-176 C-40,-178 -52,-186 -55,-200 Z" fill={color} />;
    case "curly":
      return (
        <g fill={color}>
          {CURLS_BACK.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} />
          ))}
        </g>
      );
    case "hijab":
      return (
        <g>
          <path d="M-64,-198 C-70,-274 70,-274 64,-198 C66,-168 76,-138 82,-112 C44,-94 -44,-94 -82,-112 C-76,-138 -66,-168 -64,-198 Z" fill={scarf} />
          <path d="M-70,-140 C-56,-120 -40,-110 -20,-104 M70,-140 C58,-124 44,-112 26,-106" stroke={darken(scarf, 0.18)} strokeWidth="2.2" fill="none" opacity="0.7" />
        </g>
      );
    default:
      return null;
  }
}

function HairFront({ style, color, scarf }: { style: CharacterLook["hairStyle"]; color: string; scarf: string }) {
  const dark = darken(color, 0.22);
  const shine = lighten(color, 0.28);
  switch (style) {
    case "short":
      return (
        <g>
          <path d="M-53,-190 C-58,-240 -34,-264 0,-264 C36,-264 58,-240 53,-190 C50,-204 45,-213 38,-218 C31,-209 22,-207 13,-212 C5,-205 -7,-205 -15,-213 C-25,-206 -37,-209 -43,-218 C-49,-211 -52,-202 -53,-190 Z" fill={color} />
          <path d="M-24,-248 C-12,-254 6,-254 18,-250" stroke={shine} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.55" />
        </g>
      );
    case "swept":
      return (
        <g>
          <path d="M-54,-186 C-60,-242 -30,-266 6,-264 C42,-262 60,-236 54,-190 C51,-202 47,-209 41,-213 C24,-205 -2,-212 -20,-230 C-26,-212 -38,-198 -54,-186 Z" fill={color} />
          <path d="M-12,-246 C4,-240 22,-232 36,-222" stroke={dark} strokeWidth="2" fill="none" opacity="0.5" />
          <path d="M-30,-252 C-16,-258 4,-258 20,-254" stroke={shine} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />
        </g>
      );
    case "curly":
      return (
        <g fill={color}>
          {CURLS_FRONT.map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} />
          ))}
          {CURLS_FRONT.slice(0, 6).map(([x, y, r], i) => (
            <circle key={`s${i}`} cx={x - r * 0.3} cy={y - r * 0.35} r={r * 0.35} fill={shine} opacity="0.35" />
          ))}
        </g>
      );
    case "buzz":
      return <path d="M-51,-196 C-54,-242 -30,-256 0,-256 C30,-256 54,-242 51,-196 C47,-214 32,-223 0,-224 C-32,-223 -47,-214 -51,-196 Z" fill={color} opacity="0.92" />;
    case "long":
    case "bob":
      return (
        <g>
          <path d="M-53,-196 C-57,-246 -30,-262 0,-262 C30,-262 57,-246 53,-196 C48,-215 33,-227 13,-229 C8,-222 4,-216 0,-211 C-4,-216 -8,-222 -13,-229 C-33,-227 -48,-215 -53,-196 Z" fill={color} />
          <path d="M-53,-200 C-58,-178 -57,-158 -50,-140 L-41,-143 C-46,-162 -47,-182 -45,-202 Z M53,-200 C58,-178 57,-158 50,-140 L41,-143 C46,-162 47,-182 45,-202 Z" fill={color} />
          <path d="M-30,-250 C-18,-256 0,-257 14,-254" stroke={shine} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />
        </g>
      );
    case "braid":
    case "bun":
      return (
        <g>
          <path d="M-52,-194 C-56,-244 -30,-261 0,-261 C30,-261 56,-244 52,-194 C47,-216 27,-230 3,-230 L0,-221 L-3,-230 C-27,-230 -47,-216 -52,-194 Z" fill={color} />
          <path d="M-36,-244 C-28,-250 -16,-253 -6,-253" stroke={shine} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />
          {style === "bun" && <path d="M-50,-196 C-54,-186 -52,-176 -48,-170 M50,-196 C54,-186 52,-176 48,-170" stroke={color} strokeWidth="2.4" fill="none" strokeLinecap="round" />}
        </g>
      );
    case "hijab": {
      const fold = darken(scarf, 0.16);
      return (
        <g>
          <path
            fillRule="evenodd"
            d="M-61,-198 C-63,-264 63,-264 61,-198 C61,-166 40,-138 0,-134 C-40,-138 -61,-166 -61,-198 Z M-45,-198 C-45,-234 -23,-244 0,-244 C23,-244 45,-234 45,-198 C45,-170 27,-153 0,-153 C-27,-153 -45,-170 -45,-198 Z"
            fill={scarf}
          />
          <path d="M-45,-200 C-45,-236 -23,-246 0,-246 C23,-246 45,-236 45,-200" stroke={fold} strokeWidth="2.5" fill="none" opacity="0.55" />
          <path d="M30,-142 C46,-128 58,-110 62,-92 C52,-90 40,-96 30,-104 C34,-116 34,-130 30,-142 Z" fill={fold} opacity="0.45" />
          <circle cx="40" cy="-150" r="2.4" fill={lighten(scarf, 0.5)} opacity="0.8" />
        </g>
      );
    }
  }
}

function Braid({ color }: { color: string }) {
  const segs = Array.from({ length: 7 }, (_, i) => i);
  const edge = darken(color, 0.28);
  return (
    <g>
      {segs.map((i) => (
        <ellipse key={i} cx={36 + (i % 2 ? 3 : -2) + i * 0.8} cy={-168 + i * 13} rx={10.5 - i * 0.4} ry={9} fill={color} stroke={edge} strokeWidth="1.4" />
      ))}
      <rect x={36} y={-80} width={13} height={6} rx={3} fill="#e56f8a" />
      <path d="M38,-74 C36,-66 38,-60 42,-56 C46,-60 48,-66 46,-74 Z" fill={color} />
    </g>
  );
}

/* --------------------------------- clothes -------------------------------- */

function Legs({ look, s }: { look: CharacterLook; s: Shade }) {
  const base = s(fabricColor(look.bottomColor));
  const dark = darken(base, 0.16);
  const edge = darken(base, 0.3);
  const light = lighten(base, 0.14);
  const sock = s(fabricColor(look.socks));
  const puffy = look.bottom === "shalwar";
  const check = look.bottom === "pyjamas";
  const w = puffy ? 30 : 26;
  // Thighs run from the hips out to the knees; shins cross in front with feet tucked under the knees.
  const thighL = puffy
    ? "M-36,-66 C-70,-68 -104,-50 -106,-24 C-108,-6 -90,2 -72,0 L-14,-10 C-6,-30 -14,-52 -36,-66 Z"
    : "M-34,-62 C-66,-64 -98,-48 -100,-24 C-102,-8 -88,0 -72,-2 L-14,-12 C-8,-30 -14,-50 -34,-62 Z";
  const thighR = puffy
    ? "M36,-66 C70,-68 104,-50 106,-24 C108,-6 90,2 72,0 L14,-10 C6,-30 14,-52 36,-66 Z"
    : "M34,-62 C66,-64 98,-48 100,-24 C102,-8 88,0 72,-2 L14,-12 C8,-30 14,-50 34,-62 Z";
  const backShin = "M-82,-22 C-46,-12 12,-12 56,-16";
  const frontShin = "M82,-22 C44,-8 -12,-6 -56,-12";
  return (
    <g>
      {/* feet tucked under the opposite knees */}
      <ellipse cx={72} cy={-9} rx={16} ry={11} fill={sock} />
      <ellipse cx={-70} cy={-13} rx={16} ry={11} fill={sock} />
      <path d={thighL} fill={base} stroke={edge} strokeWidth="1.5" strokeOpacity="0.35" />
      <path d={thighR} fill={base} stroke={edge} strokeWidth="1.5" strokeOpacity="0.35" />
      <path d="M-36,-62 C-20,-68 20,-68 36,-62 L28,-16 L-28,-16 Z" fill={base} />
      <path d="M-84,-44 C-70,-54 -52,-58 -38,-56 M84,-44 C70,-54 52,-58 38,-56" stroke={light} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />
      {check && (
        <>
          <path d={thighL} fill="url(#cz-check)" opacity="0.3" />
          <path d={thighR} fill="url(#cz-check)" opacity="0.3" />
        </>
      )}
      {/* shins: the back one mostly hides behind the front one */}
      <path d={backShin} stroke={edge} strokeOpacity="0.35" strokeWidth={w + 3} strokeLinecap="round" fill="none" />
      <path d={backShin} stroke={darken(base, 0.07)} strokeWidth={w} strokeLinecap="round" fill="none" />
      <path d={frontShin} stroke={edge} strokeOpacity="0.4" strokeWidth={w + 3} strokeLinecap="round" fill="none" />
      <path d={frontShin} stroke={base} strokeWidth={w} strokeLinecap="round" fill="none" />
      {check && <path d={frontShin} stroke="url(#cz-check)" strokeWidth={w} strokeLinecap="round" fill="none" opacity="0.32" />}
      <path d="M60,-6 C30,2 -10,2 -44,-4" stroke={dark} strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.45" />
      <path d="M-92,-30 q6,-8 14,-10 M92,-34 q-6,-8 -14,-10" stroke={dark} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity="0.5" />
      {/* shade under the top's hem */}
      <path d="M-40,-60 C-20,-52 20,-52 40,-60 L36,-48 C16,-42 -16,-42 -36,-48 Z" fill="#000" opacity="0.1" />
      {look.bottom === "jeans" && (
        <path d="M-78,-44 C-60,-36 -40,-30 -20,-28 M78,-44 C60,-36 40,-30 20,-28" stroke={lighten(base, 0.35)} strokeWidth="1.4" strokeDasharray="3 3" fill="none" />
      )}
      {puffy && <path d="M-60,-38 C-50,-30 -40,-26 -28,-26 M60,-38 C50,-30 40,-26 28,-26 M30,-14 C20,-10 10,-10 0,-12" stroke={dark} strokeWidth="1.8" fill="none" opacity="0.6" />}
      {(look.bottom === "joggers" || puffy) && <rect x={-64} y={-27} width={10} height={24} rx={5} fill={dark} transform="rotate(-14 -59 -15)" />}
      {/* the front foot peeking out */}
      <ellipse cx={-66} cy={-14} rx={13} ry={10} fill={sock} />
      <path d="M-74,-18 q6,-3 12,0" stroke={darken(sock, 0.18)} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
    </g>
  );
}

function Torso({ look, s }: { look: CharacterLook; s: Shade }) {
  const c = s(fabricColor(look.topColor));
  const dark = darken(c, 0.15);
  const light = lighten(c, 0.18);
  const body = "M-44,-124 C-46,-140 -34,-146 -20,-147 L20,-147 C34,-146 46,-140 44,-124 L42,-58 C20,-50 -20,-50 -42,-58 Z";
  if (look.top === "kurta") {
    return (
      <g>
        <path d="M-44,-124 C-46,-140 -34,-146 -20,-147 L20,-147 C34,-146 46,-140 44,-124 L50,-40 C54,-24 60,-12 62,-4 C20,4 -20,4 -62,-4 C-60,-12 -54,-24 -50,-40 Z" fill={c} />
        <path d="M0,-146 L0,-100" stroke={dark} strokeWidth="2" />
        {[-138, -128, -118, -108].map((y) => (
          <circle key={y} cx={3.5} cy={y} r={1.6} fill={s("#e9c46a")} />
        ))}
        <path d="M-12,-148 C-6,-142 6,-142 12,-148" stroke={dark} strokeWidth="3" fill="none" />
        <path d="M-58,-10 C-20,-4 20,-4 58,-10" stroke={s("#e9c46a")} strokeWidth="2.2" strokeDasharray="1 4" strokeLinecap="round" fill="none" />
        <path d="M-36,-56 C-30,-36 -32,-20 -40,-6 M36,-56 C30,-36 32,-20 40,-6" stroke={dark} strokeWidth="1.6" fill="none" opacity="0.5" />
      </g>
    );
  }
  return (
    <g>
      {look.top === "hoodie" && <path d="M-34,-150 C-40,-166 -22,-174 0,-174 C22,-174 40,-166 34,-150 C22,-142 -22,-142 -34,-150 Z" fill={dark} />}
      <path d={body} fill={c} />
      <path d="M-44,-124 C-46,-140 -34,-146 -20,-147 L-10,-147 C-26,-130 -30,-100 -26,-60 L-42,-58 Z" fill={light} opacity="0.35" />
      {look.top === "sweater" && (
        <>
          <path d="M-42,-62 C-20,-54 20,-54 42,-62 L42,-54 C20,-46 -20,-46 -42,-54 Z" fill={dark} />
          <path d="M-12,-147 C-6,-141 6,-141 12,-147" stroke={dark} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M-20,-128 v60 M-8,-130 v66 M8,-130 v66 M20,-128 v60" stroke={dark} strokeWidth="1.3" opacity="0.35" strokeDasharray="4 3" />
        </>
      )}
      {look.top === "hoodie" && (
        <>
          <path d="M-24,-88 L24,-88 L30,-62 L-30,-62 Z" fill={dark} opacity="0.55" />
          <path d="M-8,-146 L-10,-118 M8,-146 L10,-118" stroke={s("#f3efe8")} strokeWidth="2" strokeLinecap="round" />
          <circle cx={-10} cy={-116} r={2.4} fill={s("#f3efe8")} />
          <circle cx={10} cy={-116} r={2.4} fill={s("#f3efe8")} />
        </>
      )}
      {look.top === "tee" && <path d="M-11,-147 C-6,-140 6,-140 11,-147" stroke={dark} strokeWidth="3" fill="none" />}
      {look.top === "cardigan" && (
        <>
          <path d="M-12,-147 L12,-147 L6,-56 L-6,-56 Z" fill={s("#f6f2ea")} />
          <path d="M-12,-147 L-4,-56 M12,-147 L4,-56" stroke={dark} strokeWidth="2.4" />
          {[-120, -100, -80].map((y) => (
            <circle key={y} cx={-7} cy={y} r={2.2} fill={darken(c, 0.35)} />
          ))}
          <rect x={-36} y={-84} width={16} height={14} rx={3} fill={dark} opacity="0.5" />
          <rect x={20} y={-84} width={16} height={14} rx={3} fill={dark} opacity="0.5" />
        </>
      )}
    </g>
  );
}

function ArmShape({ arm, look, s, frames }: { arm: Arm; look: CharacterLook; s: Shade; frames?: Arm[] }) {
  const top = s(fabricColor(look.topColor));
  const skin = s(skinColor(look.skin));
  const short = look.top === "tee";
  const full = (a: Arm) => armD(a);
  const anim = (fn: (a: Arm) => string) =>
    frames ? <animate attributeName="d" dur={SIP.dur} repeatCount="indefinite" keyTimes={SIP.keyTimes} calcMode="spline" keySplines={SIP.splines} values={frames.map(fn).join(";")} /> : null;
  return (
    <g strokeLinecap="round" fill="none">
      <path d={full(arm)} stroke={darken(short ? skin : top, 0.25)} strokeWidth={short ? 18 : 23} opacity="0.35">
        {anim(full)}
      </path>
      <path d={full(arm)} stroke={short ? skin : top} strokeWidth={short ? 15 : 20}>
        {anim(full)}
      </path>
      {short && (
        <path d={sleeveD(arm)} stroke={top} strokeWidth={23}>
          {anim(sleeveD)}
        </path>
      )}
      <circle cx={arm.h[0]} cy={arm.h[1]} r={8.5} fill={skin}>
        {frames && (
          <animateTransform
            attributeName="transform"
            type="translate"
            dur={SIP.dur}
            repeatCount="indefinite"
            keyTimes={SIP.keyTimes}
            calcMode="spline"
            keySplines={SIP.splines}
            values={frames.map((f) => `${f.h[0] - arm.h[0]} ${f.h[1] - arm.h[1]}`).join(";")}
          />
        )}
      </circle>
    </g>
  );
}

/* ---------------------------------- props --------------------------------- */

function Mug({ drink, s, still }: { drink: Drink; s: Shade; still: boolean }) {
  const mug = s("#f3e6d3");
  const band = s("#d9826a");
  return (
    <g>
      <path d="M17,-12 C30,-12 30,8 17,8" stroke={mug} strokeWidth="5" fill="none" />
      <path d="M-17,-18 L17,-18 L15,14 C14,19 10,21 6,21 L-6,21 C-10,21 -14,19 -15,14 Z" fill={mug} />
      <ellipse cx="0" cy="-18" rx="17" ry="4.5" fill={s(drinkColor(drink))} />
      {drink === "cocoa" && (
        <>
          <rect x={-8} y={-22} width={6} height={5} rx={1.5} fill={s("#fffaf2")} />
          <rect x={2} y={-21} width={6} height={5} rx={1.5} fill={s("#fff0f3")} />
        </>
      )}
      <path d="M-16,-2 L16,-2" stroke={band} strokeWidth="5" />
      <path d="M-2,4 c-3,-4 -8,0 -2,5 c6,-5 1,-9 -2,-5 Z" fill={band} />
      <Steam still={still} x={0} y={-24} scale={0.9} />
    </g>
  );
}

export function Steam({ still, x, y, scale = 1 }: { still: boolean; x: number; y: number; scale?: number }) {
  const wisps = [
    { dx: -7, delay: 0 },
    { dx: 1, delay: 1.1 },
    { dx: 8, delay: 2.2 },
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} pointerEvents="none">
      {wisps.map((w, i) => (
        <path key={i} d={`M${w.dx},0 c-5,-7 5,-12 0,-19 c-5,-7 5,-12 0,-19`} stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" opacity={still ? 0.35 : 0}>
          {!still && (
            <>
              <animate attributeName="opacity" values="0;0.55;0" keyTimes="0;0.35;1" dur="3.3s" begin={`${w.delay}s`} repeatCount="indefinite" />
              <animateTransform attributeName="transform" type="translate" values="0 4;0 -16" dur="3.3s" begin={`${w.delay}s`} repeatCount="indefinite" />
            </>
          )}
        </path>
      ))}
    </g>
  );
}

const PAGE = {
  right: "M2,-74 C20,-80 38,-80 54,-74 L54,-52 C38,-58 20,-58 2,-52 Z",
  lift: "M2,-74 C4,-88 6,-104 8,-118 L8,-96 C6,-82 4,-66 2,-52 Z",
  left: "M-2,-74 C-20,-80 -38,-80 -54,-74 L-54,-52 C-38,-58 -20,-58 -2,-52 Z",
};

function Book({ s, still, onTurn }: { s: Shade; still: boolean; onTurn?: () => void }) {
  const cover = s("#6f8fb3");
  const paper = s("#fbf6ea");
  const paperDark = s("#e9dfca");
  const ref = useRef<SVGAnimateElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !onTurn) return;
    el.addEventListener("repeatEvent", onTurn);
    return () => el.removeEventListener("repeatEvent", onTurn);
  }, [onTurn]);
  return (
    <g>
      <path d="M-60,-78 C-40,-84 -10,-82 0,-76 C10,-82 40,-84 60,-78 L60,-46 C40,-52 10,-52 0,-46 C-10,-52 -40,-52 -60,-46 Z" fill={cover} />
      <path d={PAGE.left} fill={paper} />
      <path d={PAGE.right} fill={paper} />
      <path d="M-46,-70 C-34,-73 -20,-73 -8,-70 M-46,-64 C-34,-67 -20,-67 -8,-64 M-46,-58 C-34,-61 -24,-61 -14,-59 M8,-70 C20,-73 34,-73 46,-70 M8,-64 C20,-67 34,-67 46,-64 M8,-58 C20,-61 30,-61 40,-60" stroke={paperDark} strokeWidth="1.6" fill="none" />
      <path d="M0,-75 L0,-50" stroke={paperDark} strokeWidth="2" />
      {!still && (
        <path d={PAGE.right} fill={lighten(paper, 0.3)} stroke={paperDark} strokeWidth="0.8" opacity="0">
          <animate ref={ref} attributeName="d" values={`${PAGE.right};${PAGE.right};${PAGE.lift};${PAGE.left}`} keyTimes="0;0.84;0.92;1" dur="7s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.84;0.99;1" dur="7s" repeatCount="indefinite" />
        </path>
      )}
    </g>
  );
}

function Headphones({ s }: { s: Shade }) {
  const band = s("#f0e9f7");
  const cup = s("#e88e9f");
  return (
    <g>
      <path d="M-56,-196 C-60,-268 60,-268 56,-196" stroke={band} strokeWidth="8" fill="none" strokeLinecap="round" />
      <rect x={-66} y={-212} width={18} height={34} rx={8} fill={cup} />
      <rect x={48} y={-212} width={18} height={34} rx={8} fill={cup} />
      <rect x={-61} y={-206} width={6} height={22} rx={3} fill={lighten(cup, 0.35)} opacity="0.7" />
    </g>
  );
}

function Notes({ still }: { still: boolean }) {
  if (still) return null;
  const notes = [
    { x: 64, y: -230, delay: 0 },
    { x: -74, y: -220, delay: 1.4 },
    { x: 78, y: -200, delay: 2.6 },
  ];
  return (
    <g fill="#fff3d6" pointerEvents="none">
      {notes.map((n, i) => (
        <g key={i} opacity="0">
          <path d={`M${n.x},${n.y} v-16 l10,-3 v14`} stroke="#fff3d6" strokeWidth="2" fill="none" />
          <ellipse cx={n.x - 3} cy={n.y} rx={4} ry={3} />
          <ellipse cx={n.x + 7} cy={n.y - 3} rx={4} ry={3} />
          <animate attributeName="opacity" values="0;0.9;0" dur="4s" begin={`${n.delay}s`} repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate" values="0 0;8 -34" dur="4s" begin={`${n.delay}s`} repeatCount="indefinite" />
        </g>
      ))}
    </g>
  );
}

function Zzz({ still }: { still: boolean }) {
  if (still) return <path d="M58,-262 h10 l-10,12 h10" stroke="#f3f0ff" strokeWidth="2.4" fill="none" strokeLinejoin="round" opacity="0.8" />;
  return (
    <g pointerEvents="none">
      {[0, 1.6, 3.2].map((d, i) => (
        <path key={i} d={`M${56 + i * 4},-250 h${10 - i * 2} l-${10 - i * 2},${12 - i * 2} h${10 - i * 2}`} stroke="#f3f0ff" strokeWidth="2.4" fill="none" strokeLinejoin="round" opacity="0">
          <animate attributeName="opacity" values="0;0.85;0" dur="4.8s" begin={`${d}s`} repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate" values="0 0;14 -30" dur="4.8s" begin={`${d}s`} repeatCount="indefinite" />
        </path>
      ))}
    </g>
  );
}

/* ---------------------------------- face ---------------------------------- */

function Face({ look, s, activity, still }: { look: CharacterLook; s: Shade; activity: Activity; still: boolean }) {
  const ink = s("#2b2023");
  const brow = look.hairStyle === "hijab" ? s("#2b2023") : darken(s(hairColor(look.hairColor)), 0.25);
  const closedAlways = activity === "music" || activity === "nap";
  const look_ = activity === "gaze" ? { dx: -2.6, dy: -1.6 } : activity === "read" ? { dx: 0, dy: 2.4 } : { dx: 0, dy: 0 };
  const eyeY = -191;
  const lashes = look.kind === "girl";
  const closed = (
    <g stroke={ink} strokeWidth="2.6" strokeLinecap="round" fill="none">
      <path d={`M-25,${eyeY} q6,5 12,0`} />
      <path d={`M13,${eyeY} q6,5 12,0`} />
    </g>
  );
  const open = (
    <g>
      {[-19, 19].map((x) => (
        <g key={x}>
          <ellipse cx={x + look_.dx} cy={eyeY + look_.dy} rx={5.2} ry={activity === "read" ? 4.6 : 6.4} fill={ink}>
            {!still && <animate attributeName="ry" values={activity === "read" ? "4.6;4.6;0.6;4.6" : "6.4;6.4;0.6;6.4"} keyTimes="0;0.93;0.965;1" dur={x < 0 ? "5.2s" : "5.2s"} repeatCount="indefinite" />}
          </ellipse>
          <circle cx={x + look_.dx + 1.8} cy={eyeY + look_.dy - 2.2} r={1.7} fill="#ffffff" opacity="0.95" />
          {lashes && <path d={x < 0 ? `M${x - 4.5},${eyeY - 3.5} q-3,0 -5,-3.5` : `M${x + 4.5},${eyeY - 3.5} q3,0 5,-3.5`} stroke={ink} strokeWidth="1.8" strokeLinecap="round" fill="none" />}
        </g>
      ))}
    </g>
  );
  return (
    <g>
      {/* brows */}
      <g stroke={brow} strokeWidth={look.kind === "boy" ? 3.4 : 2.6} strokeLinecap="round" fill="none">
        <path d={activity === "nap" ? "M-26,-204 q7,2 13,0" : "M-26,-206 q7,-4 13,-1"} />
        <path d={activity === "nap" ? "M13,-204 q7,2 13,0" : "M13,-207 q7,-3 13,1"} />
      </g>
      {closedAlways ? (
        closed
      ) : activity === "drink" && !still ? (
        <>
          <g>
            {open}
            <animate attributeName="opacity" values="1;1;0;0;1;1" keyTimes="0;0.6;0.62;0.86;0.88;1" dur={SIP.dur} repeatCount="indefinite" calcMode="discrete" />
          </g>
          <g opacity="0">
            {closed}
            <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.6;0.62;0.86;0.88;1" dur={SIP.dur} repeatCount="indefinite" calcMode="discrete" />
          </g>
        </>
      ) : (
        open
      )}
      <ellipse cx={-31} cy={-176} rx={8.5} ry={5} fill="#ef8f86" opacity="0.42" />
      <ellipse cx={31} cy={-176} rx={8.5} ry={5} fill="#ef8f86" opacity="0.42" />
      <path d="M-2,-182 q2,2 4,0" stroke={darken(s(skinColor(look.skin)), 0.3)} strokeWidth="2" strokeLinecap="round" fill="none" />
      {activity === "nap" ? (
        <ellipse cx="0" cy="-169" rx="3" ry="2.4" fill={s("#8a4a45")} />
      ) : (
        <path d="M-6,-171 q6,5.5 12,0" stroke={s("#8a4a45")} strokeWidth="2.4" strokeLinecap="round" fill="none" />
      )}
    </g>
  );
}

/* -------------------------------- character ------------------------------- */

export function CharacterFigure({
  look,
  activity,
  drink,
  shade,
  still,
  onPageTurn,
}: {
  look: CharacterLook;
  activity: Activity;
  drink: Drink;
  shade: Shade;
  still: boolean;
  onPageTurn?: () => void;
}) {
  const s = shade;
  const skin = s(skinColor(look.skin));
  const hair = s(hairColor(look.hairColor));
  const scarf = hair;
  const earsVisible = !["long", "bob", "hijab", "curly"].includes(look.hairStyle);
  const arms =
    activity === "read" ? ARMS.read : activity === "drink" ? ARMS.drinkLow : ARMS.rest;
  const breatheDur = activity === "nap" ? "6.4s" : "4.8s";
  const headTilt = activity === "nap" ? 9 : activity === "gaze" ? -5 : activity === "read" ? 3 : 0;

  // The head and the hair behind the body move together (same transforms, same SMIL clock).
  const headMotion = (children: ReactNode) => (
    <g transform={`rotate(${headTilt} 0 -150)`}>
      <g>
        {activity === "music" && !still && (
          <animateTransform attributeName="transform" type="rotate" values="-3 0 -150;3 0 -150;-3 0 -150" dur="1.667s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines=".45 0 .55 1;.45 0 .55 1" />
        )}
        {activity === "drink" && !still && (
          <animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 4;0 4;0 0;0 0" keyTimes={SIP.keyTimes} dur={SIP.dur} repeatCount="indefinite" calcMode="spline" keySplines={SIP.splines} />
        )}
        {children}
      </g>
    </g>
  );
  const scarfOverBody = look.hairStyle === "hijab";
  // A headscarf drapes over the shoulders, but hands holding a mug come up in front of it.
  const scarfOverArms = scarfOverBody && activity !== "drink";
  const hairBehind = headMotion(<HairBack style={look.hairStyle} color={hair} scarf={scarf} />);

  const head = headMotion(
    <>
        <rect x={-11} y={-158} width={22} height={18} rx={6} fill={darken(skin, 0.1)} />
        {earsVisible && (
          <g fill={skin}>
            <ellipse cx={-49} cy={-190} rx={7.5} ry={10} />
            <ellipse cx={49} cy={-190} rx={7.5} ry={10} />
            <ellipse cx={-49} cy={-189} rx={3.5} ry={5} fill={darken(skin, 0.12)} />
            <ellipse cx={49} cy={-189} rx={3.5} ry={5} fill={darken(skin, 0.12)} />
          </g>
        )}
        <path d="M-50,-200 C-50,-236 -26,-250 0,-250 C26,-250 50,-236 50,-200 C50,-168 30,-146 0,-146 C-30,-146 -50,-168 -50,-200 Z" fill={skin} />
        <path d="M-50,-200 C-50,-236 -26,-250 0,-250 C-20,-240 -40,-222 -42,-196 C-42,-176 -36,-162 -24,-152 C-40,-160 -50,-178 -50,-200 Z" fill={lighten(skin, 0.12)} opacity="0.45" />
        <Face look={look} s={s} activity={activity} still={still} />
        <HairFront style={look.hairStyle} color={hair} scarf={scarf} />
        {look.glasses && (
          <g stroke={s("#3b2f2c")} strokeWidth="2.4" fill="#ffffff" fillOpacity="0.12">
            <circle cx={-19} cy={-191} r={11} />
            <circle cx={19} cy={-191} r={11} />
            <path d="M-8,-192 q8,-4 16,0" fill="none" />
          </g>
        )}
        {activity === "music" && <Headphones s={s} />}
    </>,
  );

  return (
    <g>
      <ellipse cx="0" cy="4" rx="112" ry="12" fill="#000000" opacity="0.16" />
      <Legs look={look} s={s} />
      <g>
        {!still && <animateTransform attributeName="transform" type="translate" values="0 0;0 -1.8;0 0" dur={breatheDur} repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines=".45 0 .55 1;.45 0 .55 1" />}
        {!scarfOverBody && hairBehind}
        <Torso look={look} s={s} />
        {scarfOverBody && !scarfOverArms && hairBehind}
        {look.hairStyle === "braid" && <Braid color={hair} />}
        {activity === "read" && <Book s={s} still={still} onTurn={onPageTurn} />}
        {activity === "drink" && (
          <g transform="translate(0 -92)">
            <g>
              {!still && (
                <animateTransform attributeName="transform" type="translate" values={sipFrames("0 0", "0 -54").join(";")} keyTimes={SIP.keyTimes} dur={SIP.dur} repeatCount="indefinite" calcMode="spline" keySplines={SIP.splines} />
              )}
              <Mug drink={drink} s={s} still={still} />
            </g>
          </g>
        )}
        {arms.map((arm, i) =>
          activity === "drink" && !still ? (
            <ArmShape key={i} arm={arm} look={look} s={s} frames={sipFrames(ARMS.drinkLow[i], ARMS.drinkHigh[i])} />
          ) : (
            <ArmShape key={i} arm={arm} look={look} s={s} />
          ),
        )}
        {scarfOverArms && hairBehind}
        {head}
        {activity === "music" && <Notes still={still} />}
        {activity === "nap" && <Zzz still={still} />}
      </g>
    </g>
  );
}

/** Shared pattern used by checked pyjamas (and bedding). */
export function CheckPattern({ id = "cz-check", color = "#ffffff" }: { id?: string; color?: string }) {
  return (
    <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse">
      <rect width="14" height="7" fill={color} opacity="0.55" />
      <rect width="7" height="14" fill={color} opacity="0.55" />
    </pattern>
  );
}
