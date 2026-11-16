import { Steam } from "./character";
import { ARCH_CX, ARCH_CY, ARCH_R, GLASS } from "./geometry";
import { darken, lighten, mix, type Shade } from "./palette";
import { fabricColor, type RoomLook } from "./state";

/* -----------------------------------------------------------------------------
   Decor items a student can add or remove. Positions are fixed "slots" that
   were composed to look good together.
----------------------------------------------------------------------------- */

type P = { s: Shade };

export function Lamp({ s, on }: P & { on: boolean }) {
  const base = s("#e7d6c3");
  const shade = on ? "#ffe2b0" : s("#f1e3cc");
  return (
    <g>
      <path d="M418,640 C402,640 398,624 404,608 C410,594 416,588 420,580 L428,580 C432,588 438,594 444,608 C450,624 446,640 430,640 Z" fill={base} />
      <path d="M408,622 C412,612 416,604 420,598" stroke="#fff" strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" fill="none" />
      <rect x={421} y={566} width={6} height={16} fill={s("#b89a76")} />
      <path d="M394,566 L454,566 L442,512 L406,512 Z" fill={shade} />
      <path d="M394,566 L454,566 L452,560 L396,560 Z" fill={on ? "#ffd08a" : s("#e2cfb3")} />
      {on && <ellipse cx={424} cy={566} rx={26} ry={4} fill="#fff4d6" opacity="0.9" />}
      <path d="M406,512 L442,512" stroke={on ? "#fff3d8" : s("#f8efe0")} strokeWidth="2" />
    </g>
  );
}

function Flame({ x, y, lit, still }: { x: number; y: number; lit: boolean; still: boolean }) {
  if (!lit) return <path d={`M${x},${y} l0,-6`} stroke="#3a2e2b" strokeWidth="1.6" strokeLinecap="round" />;
  return (
    <g>
      <path d={`M${x},${y} l0,-4`} stroke="#3a2e2b" strokeWidth="1.4" />
      <g className={still ? undefined : "cz-flame"} style={{ transformOrigin: `${x}px ${y}px` }}>
        <path d={`M${x},${y - 18} C${x + 6},${y - 10} ${x + 5},${y - 2} ${x},${y - 1} C${x - 5},${y - 2} ${x - 6},${y - 10} ${x},${y - 18} Z`} fill="#ffcf6b" />
        <path d={`M${x},${y - 11} C${x + 3},${y - 6} ${x + 2},${y - 2} ${x},${y - 2} C${x - 2},${y - 2} ${x - 3},${y - 6} ${x},${y - 11} Z`} fill="#fff8e1" />
      </g>
    </g>
  );
}

export function Candles({ s, lit, still }: P & { lit: boolean; still: boolean }) {
  const glass = s("#e9dccb");
  const wax = s("#fbf3e6");
  return (
    <g>
      <rect x={370} y={606} width={18} height={34} rx={4} fill={wax} />
      <rect x={370} y={620} width={18} height={20} rx={4} fill={glass} opacity="0.65" />
      <rect x={390} y={618} width={14} height={22} rx={4} fill={s("#f3c9c2")} />
      <Flame x={379} y={606} lit={lit} still={still} />
      <Flame x={397} y={618} lit={lit} still={still} />
    </g>
  );
}

export function TeaTray({ s, still, brewing }: P & { still: boolean; brewing: boolean }) {
  const tray = s("#b98552");
  const pot = s("#7fa8a0");
  const potLight = lighten(pot, 0.25);
  const cup = s("#f3e6d3");
  return (
    <g>
      <path d="M560,622 L700,622 L692,610 L568,610 Z" fill={tray} />
      <rect x={560} y={620} width={140} height={6} rx={2} fill={darken(tray, 0.2)} />
      {/* teapot */}
      <path d="M600,614 C584,614 578,594 584,580 C590,566 606,560 618,560 C630,560 646,566 652,580 C658,594 652,614 636,614 Z" fill={pot} />
      <path d="M588,590 C590,576 602,568 614,566" stroke={potLight} strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M650,586 C664,584 668,572 674,562 L678,566 C672,580 666,594 650,598 Z" fill={pot} />
      <path d="M586,578 C570,576 570,600 586,600" stroke={pot} strokeWidth="5" fill="none" />
      <ellipse cx={618} cy={562} rx={16} ry={5} fill={darken(pot, 0.12)} />
      <circle cx={618} cy={555} r={5} fill={darken(pot, 0.12)} />
      <path d="M604,592 h28" stroke={s("#f3e6d3")} strokeWidth="3" strokeDasharray="2 5" strokeLinecap="round" />
      {/* cup and saucer */}
      <ellipse cx={686} cy={612} rx={16} ry={3.5} fill={s("#e6d5bf")} />
      <path d="M674,596 L698,596 L695,610 L677,610 Z" fill={cup} />
      <ellipse cx={686} cy={596} rx={12} ry={3} fill={s("#c08a5a")} />
      <path d="M698,600 c6,0 6,7 0,7" stroke={cup} strokeWidth="2.5" fill="none" />
      <Steam still={still} x={686} y={592} scale={0.6} />
      {brewing && <Steam still={still} x={676} y={558} scale={0.9} />}
    </g>
  );
}

export function BookStack({ s }: P) {
  const books = [
    { y: 604, w: 62, c: "#6f8fb3", dx: 0 },
    { y: 588, w: 56, c: "#e0b04f", dx: 4 },
    { y: 574, w: 60, c: "#c96f5a", dx: -2 },
    { y: 560, w: 50, c: "#8fae8b", dx: 6 },
  ];
  return (
    <g>
      {books.map((b, i) => (
        <g key={i}>
          <rect x={990 + b.dx} y={b.y} width={b.w} height={i === 0 ? 18 : 15} rx={3} fill={s(b.c)} />
          <rect x={994 + b.dx} y={b.y + 3} width={b.w - 8} height={i === 0 ? 12 : 9} rx={1} fill={s("#fbf6ea")} opacity="0.85" />
          <rect x={990 + b.dx} y={b.y} width={6} height={i === 0 ? 18 : 15} rx={2} fill={s(darken(b.c, 0.15))} />
        </g>
      ))}
    </g>
  );
}

export function SillPlants({ s }: P) {
  const leaf = s("#6f9c6a");
  const leafDark = s("#4f7a50");
  return (
    <g>
      {/* trailing pothos */}
      <path d="M1066,622 L1062,594 L1100,594 L1096,622 Z" fill={s("#e8d2b8")} />
      <rect x={1060} y={590} width={42} height={7} rx={3} fill={s("#f1e1cc")} />
      <path d="M1070,592 C1060,604 1056,620 1058,640 M1090,592 C1098,610 1104,628 1102,648" stroke={leafDark} strokeWidth="2" fill="none" />
      {[
        [1062, 606, -30],
        [1057, 624, 20],
        [1059, 640, -20],
        [1098, 610, 30],
        [1103, 630, -20],
        [1101, 648, 25],
        [1072, 584, -40],
        [1086, 580, 30],
        [1080, 572, 0],
      ].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx={7} ry={4.5} fill={i % 2 ? leaf : leafDark} transform={`rotate(${r} ${x} ${y})`} />
      ))}
      {/* tiny succulent */}
      <path d="M1112,622 L1110,604 L1138,604 L1136,622 Z" fill={s("#c96f5a")} />
      {[-50, -20, 10, 40, 70].map((a, i) => (
        <ellipse key={i} cx={1124} cy={596} rx={4} ry={10} fill={i % 2 ? s("#8cbf9a") : s("#a6d1b0")} transform={`rotate(${a} 1124 604)`} />
      ))}
    </g>
  );
}

export function RecordPlayer({ s, playing, still }: P & { playing: boolean; still: boolean }) {
  const crate = s("#c69a6a");
  const crateDark = darken(crate, 0.2);
  const teak = s("#9a6a45");
  const sleeves = ["#e88e77", "#6f8fb3", "#e0b04f", "#8fae8b", "#b48ad0"];
  return (
    <g>
      {/* crate of records */}
      {sleeves.map((c, i) => (
        <rect key={i} x={1160 + i * 22} y={694 - (i % 2) * 8} width={20} height={40} rx={2} fill={s(c)} />
      ))}
      <rect x={1152} y={708} width={124} height={84} rx={4} fill={crate} />
      {[724, 750, 776].map((y) => (
        <rect key={y} x={1152} y={y} width={124} height={4} fill={crateDark} opacity="0.5" />
      ))}
      <rect x={1196} y={716} width={36} height={10} rx={5} fill={crateDark} />
      {/* turntable */}
      <rect x={1146} y={662} width={136} height={34} rx={6} fill={teak} />
      <rect x={1146} y={662} width={136} height={6} rx={3} fill={lighten(teak, 0.2)} />
      <circle cx={1268} cy={682} r={4} fill={s("#d9c7a8")} />
      <ellipse cx={1206} cy={662} rx={50} ry={13} fill={s("#25222a")} />
      <ellipse cx={1206} cy={662} rx={38} ry={9.5} fill="none" stroke="#fff" strokeOpacity="0.08" strokeWidth="2" />
      <ellipse cx={1206} cy={662} rx={14} ry={4} fill={s("#e88e77")} />
      {/* a sheen that circles round when spinning */}
      <ellipse cx={1206} cy={662} rx={50} ry={13} fill="none" stroke="#fff" strokeOpacity="0.16" strokeWidth="4" strokeDasharray="22 140">
        {playing && !still && <animate attributeName="stroke-dashoffset" values="0;-162" dur="1.8s" repeatCount="indefinite" />}
      </ellipse>
      <circle cx={1206} cy={662} r={2} fill={s("#d9c7a8")} />
      {/* tone arm */}
      <path d={playing ? "M1266,650 L1258,668 L1236,668" : "M1266,650 L1270,672 L1262,686"} stroke={s("#d9dbe0")} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx={1266} cy={650} r={6} fill={s("#b9bcc4")} />
    </g>
  );
}

export function Polaroids({ s }: P) {
  const photos = [
    { x: 1166, y: 482, r: -6, sky: "#9cc2e3", art: "sun" },
    { x: 1208, y: 490, r: 4, sky: "#e8a3b3", art: "heart" },
    { x: 1248, y: 484, r: -3, sky: "#8fae8b", art: "hill" },
  ];
  return (
    <g>
      <path d="M1148,470 C1190,494 1240,494 1290,470" stroke={s("#8a7a6a")} strokeWidth="1.6" fill="none" />
      {photos.map((p, i) => (
        <g key={i} transform={`rotate(${p.r} ${p.x + 15} ${p.y})`}>
          <rect x={p.x} y={p.y} width={30} height={36} rx={1.5} fill={s("#fbf8f2")} />
          <rect x={p.x + 3} y={p.y + 3} width={24} height={22} fill={s(p.sky)} />
          {p.art === "sun" && <circle cx={p.x + 15} cy={p.y + 14} r={5} fill={s("#fff1b8")} />}
          {p.art === "heart" && <path d={`M${p.x + 15},${p.y + 20} c-8,-6 -6,-12 0,-9 c6,-3 8,3 0,9 Z`} fill={s("#fff4f6")} />}
          {p.art === "hill" && <path d={`M${p.x + 3},${p.y + 25} C${p.x + 10},${p.y + 14} ${p.x + 18},${p.y + 14} ${p.x + 27},${p.y + 22} L${p.x + 27},${p.y + 25} Z`} fill={s("#5f8a5c")} />}
          <rect x={p.x + 12} y={p.y - 4} width={6} height={8} rx={1} fill={s("#c9a15c")} />
        </g>
      ))}
    </g>
  );
}

export function HangingPlant({ s, still }: P & { still: boolean }) {
  const leaf = s("#6f9c6a");
  const leafDark = s("#4f7a50");
  const vines = [
    { d: "M1196,206 C1186,250 1192,300 1180,350", leaves: [[1190, 232], [1188, 262], [1190, 292], [1184, 322], [1180, 348]] },
    { d: "M1214,210 C1216,250 1206,290 1214,320", leaves: [[1214, 238], [1210, 266], [1210, 294], [1214, 318]] },
    { d: "M1232,206 C1244,236 1240,262 1250,292", leaves: [[1238, 226], [1242, 250], [1246, 272], [1250, 292]] },
  ];
  return (
    <g>
      <path d="M1214,20 L1192,176 M1214,20 L1214,176 M1214,20 L1236,176" stroke={s("#d8c4a6")} strokeWidth="2" />
      <circle cx={1214} cy={22} r={4} fill={s("#b89a76")} />
      <path d="M1186,174 L1242,174 L1236,208 C1232,214 1196,214 1192,208 Z" fill={s("#f0e2cf")} />
      <path d="M1190,186 h48" stroke={s("#d8c4a6")} strokeWidth="2" />
      <g className={still ? undefined : "cz-sway"} style={{ transformOrigin: "1214px 180px" }}>
        {vines.map((v, i) => (
          <g key={i}>
            <path d={v.d} stroke={leafDark} strokeWidth="2" fill="none" />
            {v.leaves.map(([x, y], j) => (
              <path key={j} d={`M${x},${y} c-10,-2 -12,-10 -8,-14 c6,0 10,6 8,14 Z`} fill={j % 2 ? leaf : leafDark} transform={`rotate(${j % 2 ? 30 : -40} ${x} ${y}) ${j % 2 ? `scale(-1 1) translate(${-2 * x} 0)` : ""}`} />
            ))}
          </g>
        ))}
        {[
          [1196, 178, -50],
          [1210, 172, -10],
          [1228, 174, 30],
          [1240, 182, 60],
        ].map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={y} rx={11} ry={6} fill={i % 2 ? leaf : leafDark} transform={`rotate(${r} ${x} ${y})`} />
        ))}
      </g>
    </g>
  );
}

export function Posters({ s }: P) {
  return (
    <g>
      {/* arches print: a little nod to the mirror */}
      <rect x={64} y={234} width={136} height={176} rx={4} fill={s("#8b6248")} />
      <rect x={72} y={242} width={120} height={160} fill={s("#f7efe2")} />
      <g transform="translate(132 372)">
        <path d="M-48,0 A48,48 0 0 1 48,0 L34,0 A34,34 0 0 0 -34,0 Z" fill={s("#d9826a")} />
        <path d="M-34,0 A34,34 0 0 1 34,0 L21,0 A21,21 0 0 0 -21,0 Z" fill={s("#e9b65c")} />
        <path d="M-21,0 A21,21 0 0 1 21,0 Z" fill={s("#93b394")} />
        <circle cx={0} cy={-84} r={14} fill={s("#e9b65c")} />
      </g>
      {/* night sky print */}
      <rect x={214} y={234} width={104} height={84} rx={4} fill={s("#8b6248")} />
      <rect x={220} y={240} width={92} height={72} fill={s("#33406b")} />
      <circle cx={282} cy={262} r={12} fill={s("#f7edc8")} />
      <circle cx={288} cy={258} r={11} fill={s("#33406b")} />
      {[
        [236, 256],
        [252, 290],
        [300, 296],
        [240, 302],
        [262, 252],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.6} fill={s("#f7edc8")} />
      ))}
      {/* leaf print */}
      <rect x={214} y={330} width={104} height={80} rx={4} fill={s("#8b6248")} />
      <rect x={220} y={336} width={92} height={68} fill={s("#cfdcc8")} />
      <path d="M266,396 C262,376 262,360 270,346" stroke={s("#5f8a5c")} strokeWidth="2" fill="none" />
      <path d="M266,380 c-14,-2 -18,-10 -16,-16 c10,2 14,8 16,16 Z M267,368 c12,-4 16,-12 14,-18 c-10,2 -13,10 -14,18 Z M268,356 c-10,-4 -12,-10 -8,-14 c6,2 8,8 8,14 Z" fill={s("#6f9c6a")} />
    </g>
  );
}

export function Rug({ s, room }: P & { room: RoomLook }) {
  const c = s(fabricColor(room.rug));
  const dark = darken(c, 0.14);
  const light = lighten(c, 0.2);
  return (
    <g>
      <ellipse cx={800} cy={912} rx={392} ry={74} fill="#000" opacity="0.12" />
      <ellipse cx={800} cy={906} rx={388} ry={72} fill={c} />
      <ellipse cx={800} cy={906} rx={388} ry={72} fill="none" stroke={light} strokeWidth="6" strokeDasharray="2 7" strokeLinecap="round" />
      <ellipse cx={800} cy={906} rx={300} ry={52} fill="none" stroke={dark} strokeWidth="4" opacity="0.6" />
      <ellipse cx={800} cy={906} rx={210} ry={34} fill="none" stroke={light} strokeWidth="10" opacity="0.6" />
      <ellipse cx={800} cy={906} rx={110} ry={16} fill={dark} opacity="0.35" />
    </g>
  );
}

export function CatBed({ s, still, purring }: P & { still: boolean; purring: boolean }) {
  const bed = s("#b9a6d6");
  const bedDark = darken(bed, 0.18);
  const fur = s("#e9a25f");
  const furDark = s("#c9783c");
  const cream = s("#fbe8cf");
  return (
    <g>
      <ellipse cx={572} cy={918} rx={86} ry={22} fill="#000" opacity="0.18" />
      <path d="M492,904 C490,876 530,862 572,862 C614,862 654,876 652,904 C652,926 614,934 572,934 C530,934 492,926 492,904 Z" fill={bed} />
      <ellipse cx={572} cy={892} rx={66} ry={20} fill={bedDark} />
      <g className={still ? undefined : purring ? "cz-purr" : "cz-breathe"} style={{ transformOrigin: "572px 905px" }}>
        {/* curled-up cat */}
        <path d="M520,898 C516,872 548,858 580,860 C614,862 632,878 628,896 C626,910 600,914 572,914 C544,914 522,910 520,898 Z" fill={fur} />
        <path d="M560,866 C566,880 566,892 560,904 M584,862 C590,876 590,892 584,906 M606,868 C612,880 612,892 606,902" stroke={furDark} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.6" />
        <path d="M620,900 C640,904 640,920 610,920 C584,920 552,920 534,914" stroke={fur} strokeWidth="11" strokeLinecap="round" fill="none" />
        <path d="M612,920 C600,920 590,920 584,919" stroke={furDark} strokeWidth="11" strokeLinecap="round" fill="none" opacity="0.5" />
        {/* head */}
        <g>
          <path d="M520,880 L516,856 L534,870 Z M548,872 L556,852 L560,876 Z" fill={fur} />
          <path d="M521,876 L519,862 L529,870 Z" fill={s("#f2b8a8")} />
          <ellipse cx={538} cy={890} rx={24} ry={19} fill={fur} />
          <ellipse cx={540} cy={898} rx={13} ry={8} fill={cream} />
          <path d="M526,888 q5,4 10,0 M544,889 q5,4 10,0" stroke={s("#4a3328")} strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M538,896 l2,2 l2,-2" stroke={s("#c76a5a")} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      </g>
      <path d="M500,906 C520,928 624,928 644,906" stroke={bedDark} strokeWidth="3" fill="none" opacity="0.5" />
    </g>
  );
}

export function BeanBag({ s, room }: P & { room: RoomLook }) {
  const c = s(fabricColor(room.beanBag));
  const dark = darken(c, 0.18);
  const light = lighten(c, 0.22);
  return (
    <g>
      <ellipse cx={1120} cy={958} rx={130} ry={20} fill="#000" opacity="0.2" />
      <path d="M1000,940 C984,900 1000,846 1040,826 C1072,810 1110,824 1132,812 C1170,794 1226,810 1240,860 C1252,904 1244,944 1220,956 C1180,970 1040,972 1000,940 Z" fill={c} />
      <path d="M1020,870 C1050,850 1090,852 1120,870 C1150,886 1196,884 1226,866" stroke={dark} strokeWidth="3" fill="none" opacity="0.45" />
      <path d="M1040,834 C1060,826 1080,830 1100,826" stroke={light} strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M1052,940 C1080,916 1150,914 1190,940" stroke={dark} strokeWidth="3" fill="none" opacity="0.35" />
    </g>
  );
}

export function BigPlant({ s, still, rustle }: P & { still: boolean; rustle: number }) {
  const pot = s("#c8714f");
  const potDark = darken(pot, 0.2);
  const leaf = s("#5f9466");
  const leafDark = s("#3f6f4a");
  const leafLight = s("#7fb07f");
  const leaves = [
    { x: 1500, y: 700, r: -40, sc: 1.1, c: leafDark },
    { x: 1580, y: 690, r: 35, sc: 1.05, c: leaf },
    { x: 1530, y: 640, r: -8, sc: 1.2, c: leaf },
    { x: 1470, y: 770, r: -70, sc: 0.95, c: leafLight },
    { x: 1600, y: 770, r: 70, sc: 0.95, c: leafDark },
    { x: 1556, y: 740, r: 10, sc: 0.9, c: leafLight },
  ];
  return (
    <g>
      <ellipse cx={1540} cy={988} rx={74} ry={12} fill="#000" opacity="0.22" />
      <g key={rustle} className={still || !rustle ? undefined : "cz-rustle"} style={{ transformOrigin: "1540px 880px" }}>
        {leaves.map((l, i) => (
          <path key={`st${i}`} d={`M1540,872 Q${(1540 + l.x) / 2},${l.y + 60} ${l.x},${l.y + 40 * l.sc}`} stroke={leafDark} strokeWidth="4" fill="none" />
        ))}
        {leaves.map((l, i) => (
          <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.r}) scale(${l.sc})`}>
            <path
              d="M0,-70 C40,-66 56,-30 50,6 C44,40 18,58 0,62 C-18,58 -44,40 -50,6 C-56,-30 -40,-66 0,-70 Z M14,-40 L50,-26 L51,-16 Z M18,-6 L52,6 L50,16 Z M14,24 L40,36 L34,44 Z M-14,-40 L-50,-26 L-51,-16 Z M-18,-6 L-52,6 L-50,16 Z M-14,24 L-40,36 L-34,44 Z"
              fillRule="evenodd"
              fill={l.c}
            />
            <path d="M0,-66 L0,58" stroke={darken(l.c, 0.2)} strokeWidth="2.5" />
            <path d="M-30,-48 C-20,-56 -8,-60 0,-60" stroke="#fff" strokeOpacity="0.2" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
        ))}
      </g>
      <path d="M1484,876 L1596,876 L1584,982 C1582,988 1498,988 1496,982 Z" fill={pot} />
      <rect x={1478} y={866} width={124} height={20} rx={6} fill={lighten(pot, 0.08)} />
      <path d="M1496,900 L1500,972" stroke={potDark} strokeWidth="3" opacity="0.4" />
    </g>
  );
}

export function Teddy({ s }: P) {
  const fur = s("#b7865b");
  const light = s("#e3c29a");
  return (
    <g>
      <ellipse cx={206} cy={622} rx={26} ry={24} fill={fur} />
      <ellipse cx={206} cy={628} rx={14} ry={13} fill={light} />
      <circle cx={186} cy={636} r={9} fill={fur} />
      <circle cx={226} cy={636} r={9} fill={fur} />
      <circle cx={206} cy={586} r={21} fill={fur} />
      <circle cx={190} cy={570} r={8} fill={fur} />
      <circle cx={222} cy={570} r={8} fill={fur} />
      <circle cx={190} cy={570} r={4} fill={light} />
      <circle cx={222} cy={570} r={4} fill={light} />
      <ellipse cx={206} cy={593} rx={9} ry={7} fill={light} />
      <circle cx={199} cy={583} r={2.2} fill="#2b2023" />
      <circle cx={213} cy={583} r={2.2} fill="#2b2023" />
      <ellipse cx={206} cy={591} rx={3} ry={2.2} fill="#2b2023" />
      <path d="M196,606 L206,612 L216,606 L216,616 L206,612 L196,616 Z" fill={s("#e56f8a")} />
    </g>
  );
}

export function MoonLamp({ s, on }: P & { on: boolean }) {
  const c = on ? "#fff4d4" : s("#d9d3c6");
  const crater = on ? "#f0ddb0" : s("#c2bba9");
  return (
    <g>
      <rect x={1514} y={444} width={32} height={8} rx={3} fill={s("#9a6a45")} />
      <circle cx={1530} cy={420} r={23} fill={c} />
      <circle cx={1522} cy={412} r={5} fill={crater} />
      <circle cx={1538} cy={426} r={4} fill={crater} />
      <circle cx={1534} cy={406} r={2.5} fill={crater} />
      <circle cx={1520} cy={430} r={3} fill={crater} />
    </g>
  );
}

/* ------------------------------- fairy lights ------------------------------ */

export const FAIRY_ARCH = (() => {
  const r = ARCH_R + 46;
  const pts: [number, number][] = [];
  for (let a = 180; a <= 360; a += 9) {
    const rad = (a * Math.PI) / 180;
    // a gentle droop between the "hooks"
    const sag = Math.abs(Math.sin(((a - 180) / 36) * Math.PI)) * 8;
    pts.push([ARCH_CX + Math.cos(rad) * (r - sag), ARCH_CY + Math.sin(rad) * (r - sag)]);
  }
  pts.unshift([ARCH_CX - r, ARCH_CY + 120]);
  pts.push([ARCH_CX + r, ARCH_CY + 120]);
  return pts;
})();

export const FAIRY_GARLAND = (() => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const x = 10 + t * 340;
    const y = 178 + Math.sin(t * Math.PI) * 38 - t * 10;
    pts.push([x, y]);
  }
  return pts;
})();

const toPath = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const BULB_COLORS = ["#ffd98a", "#ffc4a8", "#fff1c2", "#ffd0e0", "#d8f0ff"];

export function FairyLights({ s, on, still }: P & { on: boolean; still: boolean }) {
  const wire = s("#4f5a46");
  const bulbs = (pts: [number, number][], key: string) =>
    pts.map(([x, y], i) => (
      <g key={`${key}${i}`}>
        <rect x={x - 1.5} y={y - 4} width={3} height={4} fill={wire} />
        <ellipse
          cx={x}
          cy={y + 4}
          rx={4.2}
          ry={5.6}
          fill={on ? BULB_COLORS[i % BULB_COLORS.length] : s("#cfc6b8")}
          className={on && !still && i % 3 === 0 ? "cz-twinkle-soft" : undefined}
          style={on && !still && i % 3 === 0 ? { animationDelay: `${(i * 0.37) % 3}s` } : undefined}
        />
        {on && <circle cx={x - 1} cy={y + 2.5} r={1.6} fill="#fffdf5" />}
      </g>
    ));
  return (
    <g>
      <path d={toPath(FAIRY_ARCH)} stroke={wire} strokeWidth="1.6" fill="none" />
      <path d={toPath(FAIRY_GARLAND)} stroke={wire} strokeWidth="1.6" fill="none" />
      {bulbs(FAIRY_ARCH, "a")}
      {bulbs(FAIRY_GARLAND, "g")}
    </g>
  );
}

/* --------------------------------- curtains -------------------------------- */

export function Curtains({ s, room, drawn }: P & { room: RoomLook; drawn: boolean }) {
  const c = s(fabricColor(room.curtains));
  const dark = darken(c, 0.16);
  const light = lighten(c, 0.2);
  const rodY = 64;
  const left = GLASS.x - 60;
  const right = GLASS.x + GLASS.w + 60;
  const half = (right - left) / 2;
  const panel = (fromX: number, dir: 1 | -1) => {
    // A full-width curtain panel with soft folds; it is squashed sideways to "open" it.
    const w = half;
    const folds = 7;
    let d = `M${fromX},${rodY}`;
    for (let i = 1; i <= folds; i++) d += ` Q${fromX + dir * (w / folds) * (i - 0.5)},${rodY + 6} ${fromX + dir * (w / folds) * i},${rodY}`;
    d += ` L${fromX + dir * w},614`;
    for (let i = folds - 1; i >= 0; i--) d += ` Q${fromX + dir * (w / folds) * (i + 0.5)},${622} ${fromX + dir * (w / folds) * i},614`;
    return d + " Z";
  };
  const foldLines = (fromX: number, dir: 1 | -1) => {
    const out: string[] = [];
    for (let i = 1; i < 7; i++) out.push(`M${fromX + dir * (half / 7) * i},${rodY + 4} L${fromX + dir * (half / 7) * i},612`);
    return out.join(" ");
  };
  const style = (origin: number) => ({
    transformOrigin: `${origin}px ${rodY}px`,
    transform: drawn ? "scaleX(1)" : "scaleX(0.2)",
    transition: "transform 1.4s cubic-bezier(.45,.05,.25,1), opacity 1.4s ease",
    opacity: drawn ? 0.6 : 0.96,
  });
  return (
    <g>
      <g style={style(left)}>
        <path d={panel(left, 1)} fill={c} />
        <path d={foldLines(left, 1)} stroke={dark} strokeWidth="5" opacity="0.35" />
        <path d={foldLines(left + 10, 1)} stroke={light} strokeWidth="3" opacity="0.3" />
      </g>
      <g style={style(right)}>
        <path d={panel(right, -1)} fill={c} />
        <path d={foldLines(right, -1)} stroke={dark} strokeWidth="5" opacity="0.35" />
        <path d={foldLines(right - 10, -1)} stroke={light} strokeWidth="3" opacity="0.3" />
      </g>
      {!drawn && (
        <g fill={s(mix(c, "#c9a15c", 0.6))}>
          <path d={`M${left - 2},404 C${left + 26},398 ${left + 52},398 ${left + 80},404 L${left + 80},416 C${left + 52},410 ${left + 26},410 ${left - 2},416 Z`} />
          <path d={`M${right + 2},404 C${right - 26},398 ${right - 52},398 ${right - 80},404 L${right - 80},416 C${right - 52},410 ${right - 26},410 ${right + 2},416 Z`} />
          <circle cx={left + 82} cy={410} r={5} />
          <circle cx={right - 82} cy={410} r={5} />
        </g>
      )}
      {/* rod */}
      <rect x={left - 26} y={rodY - 7} width={right - left + 52} height={8} rx={4} fill={s("#a77b4f")} />
      <circle cx={left - 30} cy={rodY - 3} r={10} fill={s("#a77b4f")} />
      <circle cx={right + 30} cy={rodY - 3} r={10} fill={s("#a77b4f")} />
      {[left - 10, left + 30, right - 30, right + 10].map((x) => (
        <rect key={x} x={x - 2} y={rodY - 12} width={4} height={12} fill={s("#8a6440")} />
      ))}
    </g>
  );
}
