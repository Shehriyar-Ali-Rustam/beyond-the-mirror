import { ARCH_CX, ARCH_CY, ARCH_R, GLASS, archPath } from "./geometry";
import { darken, lighten, mix, type Shade } from "./palette";
import { seeded } from "./rng";
import { fabricColor, floorColor, type RoomLook } from "./state";

/* -----------------------------------------------------------------------------
   The big pieces of furniture that are always in the room.
----------------------------------------------------------------------------- */

const TRIM = "#f3ebdf";
const GLASS_BOTTOM = GLASS.y + GLASS.h;

export function WindowFrame({ s }: { s: Shade }) {
  const trim = s(TRIM);
  const edge = s(darken(TRIM, 0.18));
  const diag = ARCH_R * Math.SQRT1_2;
  return (
    <g>
      <path fillRule="evenodd" d={`${archPath(26)} ${archPath(0)}`} fill={trim} />
      <path d={archPath(26)} fill="none" stroke={edge} strokeWidth="2" opacity="0.6" />
      <path d={archPath(0)} fill="none" stroke="#000" strokeOpacity="0.16" strokeWidth="4" />
      <g stroke={trim} strokeLinecap="butt" fill="none">
        <path d={`M${ARCH_CX},${GLASS.y} L${ARCH_CX},${GLASS_BOTTOM}`} strokeWidth="13" />
        <path d={`M${GLASS.x},${ARCH_CY} L${GLASS.x + GLASS.w},${ARCH_CY}`} strokeWidth="12" />
        <path d={`M${ARCH_CX},${ARCH_CY} L${ARCH_CX - diag},${ARCH_CY - diag} M${ARCH_CX},${ARCH_CY} L${ARCH_CX + diag},${ARCH_CY - diag}`} strokeWidth="9" />
        <path d={`M${ARCH_CX - 70},${ARCH_CY} A70,70 0 0 1 ${ARCH_CX + 70},${ARCH_CY}`} strokeWidth="9" />
      </g>
      <g stroke="#000" strokeOpacity="0.1" strokeWidth="2" fill="none">
        <path d={`M${ARCH_CX + 7},${GLASS.y + 4} L${ARCH_CX + 7},${GLASS_BOTTOM}`} />
        <path d={`M${GLASS.x},${ARCH_CY + 7} L${GLASS.x + GLASS.w},${ARCH_CY + 7}`} />
      </g>
      {/* latch */}
      <rect x={ARCH_CX - 4} y={500} width={8} height={26} rx={4} fill={s("#c9a15c")} />
      {/* sill */}
      <rect x={GLASS.x - 40} y={GLASS_BOTTOM - 6} width={GLASS.w + 80} height={22} rx={4} fill={trim} />
      <rect x={GLASS.x - 40} y={GLASS_BOTTOM - 6} width={GLASS.w + 80} height={4} rx={2} fill="#fff" opacity="0.5" />
      <rect x={GLASS.x - 40} y={GLASS_BOTTOM + 14} width={GLASS.w + 80} height={4} fill="#000" opacity="0.12" />
    </g>
  );
}

export function WindowSeat({ s, room }: { s: Shade; room: RoomLook }) {
  const trim = s(TRIM);
  const hole = s("#4a3b3a");
  const cushion = s(mix(fabricColor(room.bedding), "#f4ecdf", 0.55));
  const cushionDark = darken(cushion, 0.14);
  const pillowA = s(fabricColor(room.curtains));
  const basket = s("#c99a62");
  const weave = darken(basket, 0.22);
  return (
    <g>
      {/* bench with cubbies */}
      <rect x={448} y={650} width={704} height={142} fill={trim} />
      <rect x={448} y={650} width={704} height={10} fill="#000" opacity="0.1" />
      {[470, 702, 934].map((x) => (
        <g key={x}>
          <rect x={x} y={676} width={196} height={98} rx={8} fill={hole} opacity="0.55" />
          <rect x={x} y={676} width={196} height={18} rx={8} fill="#000" opacity="0.18" />
        </g>
      ))}
      {/* a woven basket */}
      <path d="M484,774 L494,712 L650,712 L660,774 Z" fill={basket} />
      {[724, 738, 752, 766].map((y) => (
        <path key={y} d={`M${490 + (y - 712) * 0.16},${y} L${654 - (y - 712) * 0.16},${y}`} stroke={weave} strokeWidth="2.2" strokeDasharray="6 4" />
      ))}
      <rect x={488} y={706} width={168} height={10} rx={5} fill={lighten(basket, 0.12)} />
      {/* folded blankets */}
      {[
        { y: 746, c: fabricColor(room.bedding) },
        { y: 722, c: "#efe4d2" },
        { y: 700, c: fabricColor(room.rug) },
      ].map((b, i) => (
        <g key={i}>
          <rect x={724} y={b.y} width={152} height={26} rx={11} fill={s(b.c)} />
          <path d={`M732,${b.y + 13} H868`} stroke={s(darken(b.c, 0.14))} strokeWidth="2" opacity="0.5" />
        </g>
      ))}
      {/* standing books */}
      {[
        { x: 950, w: 18, h: 74, c: "#6f8fb3" },
        { x: 970, w: 14, h: 66, c: "#e0b04f" },
        { x: 986, w: 20, h: 80, c: "#c96f5a" },
        { x: 1008, w: 16, h: 70, c: "#8fae8b" },
      ].map((b) => (
        <rect key={b.x} x={b.x} y={774 - b.h} width={b.w} height={b.h} rx={2} fill={s(b.c)} />
      ))}
      <path d="M1036,774 L1050,704 L1070,708 L1056,774 Z" fill={s("#b48ad0")} />
      <path d="M1076,774 L1082,736 L1118,736 L1124,774 Z" fill={basket} />
      <rect x={1078} y={732} width={44} height={7} rx={3} fill={lighten(basket, 0.12)} />
      <rect x={448} y={786} width={704} height={8} fill="#000" opacity="0.18" />
      {/* cushion */}
      <rect x={440} y={618} width={720} height={40} rx={18} fill={cushion} />
      <rect x={440} y={640} width={720} height={18} rx={9} fill={cushionDark} opacity="0.55" />
      <path d="M458,622 H1142" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="5 5" />
      {/* a squishy pillow leaning on the frame */}
      <g transform="rotate(-9 512 600)">
        <rect x={468} y={552} width={92} height={80} rx={26} fill={pillowA} />
        <path d="M478,566 C500,576 528,576 550,566" stroke={darken(pillowA, 0.15)} strokeWidth="2" fill="none" opacity="0.6" />
        <circle cx={514} cy={592} r={4} fill={darken(pillowA, 0.2)} />
        <path d="M468,560 l-8,-6 M560,560 l8,-6 M468,624 l-8,6 M560,624 l8,6" stroke={pillowA} strokeWidth="5" strokeLinecap="round" />
      </g>
    </g>
  );
}

export function Bed({ s, room }: { s: Shade; room: RoomLook }) {
  const wood = s(darken(floorColor(room.floor), 0.12));
  const woodDark = darken(wood, 0.2);
  const sheet = s("#f6f1e8");
  const duvet = s(fabricColor(room.bedding));
  const duvetDark = darken(duvet, 0.16);
  const duvetLight = lighten(duvet, 0.2);
  const throwC = s(fabricColor(room.beanBag));
  const pat = room.beddingPattern;
  const duvetPath = "M160,626 C200,616 250,622 290,618 C322,615 348,620 364,630 C368,662 368,704 364,750 C340,758 312,750 284,758 C254,766 222,754 194,762 C176,766 160,760 150,754 C146,716 148,668 160,626 Z";
  return (
    <g>
      {/* headboard with a soft arch, a quiet echo of the window */}
      <path d="M0,792 L0,500 C0,470 22,452 48,452 C74,452 96,470 96,500 L96,792 Z" fill={wood} />
      <path d="M12,640 L12,506 C12,482 28,468 48,468 C68,468 84,482 84,506 L84,640 Z" fill={lighten(wood, 0.14)} />
      <path d="M30,630 V500 M48,630 V486 M66,630 V500" stroke={woodDark} strokeWidth="2" opacity="0.35" />
      {/* frame and legs */}
      <rect x={60} y={710} width={312} height={44} rx={6} fill={wood} />
      <rect x={60} y={710} width={312} height={5} fill="#fff" opacity="0.18" />
      <rect x={72} y={752} width={16} height={40} rx={3} fill={woodDark} />
      <rect x={346} y={752} width={16} height={40} rx={3} fill={woodDark} />
      {/* mattress */}
      <rect x={70} y={632} width={300} height={86} rx={14} fill={sheet} />
      <rect x={70} y={696} width={300} height={22} rx={10} fill="#000" opacity="0.06" />
      {/* pillows */}
      <path d="M92,600 C88,572 112,562 142,564 C178,566 194,576 196,600 C198,628 176,636 142,634 C108,634 94,626 92,600 Z" fill={s("#fbf7f0")} />
      <path d="M104,610 C112,600 130,598 150,600" stroke={s("#e6ddd0")} strokeWidth="2" fill="none" />
      <path d="M104,626 C100,604 122,594 150,596 C182,598 198,606 200,626 C202,648 180,656 150,654 C120,654 106,646 104,626 Z" fill={duvetLight} />
      {/* duvet with quilting */}
      <path d={duvetPath} fill={duvet} />
      {pat !== "plain" && <path d={duvetPath} fill={`url(#cz-bed-${pat})`} />}
      {pat === "plain" && <path d="M200,640 L196,752 M244,632 L244,756 M290,628 L290,754 M334,628 L338,750 M156,680 C220,672 300,676 366,684 M154,720 C220,712 300,716 366,724" stroke={duvetDark} strokeWidth="1.6" strokeDasharray="5 5" fill="none" opacity="0.45" />}
      <path d="M160,626 C200,616 250,622 290,618 C322,615 348,620 364,630 C364,640 362,646 358,650 C332,642 306,640 274,644 C232,648 196,642 158,650 Z" fill={duvetLight} opacity="0.5" />
      {/* folded-back top edge */}
      <path d="M150,640 C164,630 182,628 200,634 C204,670 202,712 194,756 C178,760 162,758 150,754 C146,716 146,676 150,640 Z" fill={duvetLight} />
      <path d="M200,634 C204,670 202,712 194,756" stroke={duvetDark} strokeWidth="2" fill="none" opacity="0.45" />
      {/* knitted throw folded at the foot */}
      <path d="M286,612 C300,606 340,606 368,614 L370,654 C346,646 306,646 284,652 Z" fill={throwC} />
      <path d="M296,622 C316,618 344,618 366,624 M294,636 C316,632 344,632 368,638" stroke={darken(throwC, 0.18)} strokeWidth="2" strokeDasharray="3 3" fill="none" />
      <path d="M368,614 C376,640 376,680 370,712 L358,712 C362,680 362,646 356,622 Z" fill={darken(throwC, 0.08)} />
    </g>
  );
}

export function BedPatterns({ s, room }: { s: Shade; room: RoomLook }) {
  const ink = s(darken(fabricColor(room.bedding), 0.22));
  const light = s(lighten(fabricColor(room.bedding), 0.4));
  return (
    <>
      <pattern id="cz-bed-check" width="28" height="28" patternUnits="userSpaceOnUse">
        <rect width="14" height="28" fill={ink} opacity="0.22" />
        <rect width="28" height="14" fill={ink} opacity="0.22" />
      </pattern>
      <pattern id="cz-bed-stripes" width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(90)">
        <rect width="24" height="7" fill={light} opacity="0.6" />
      </pattern>
      <pattern id="cz-bed-dots" width="26" height="26" patternUnits="userSpaceOnUse">
        <circle cx="7" cy="7" r="3" fill={light} opacity="0.8" />
        <circle cx="20" cy="20" r="3" fill={light} opacity="0.8" />
      </pattern>
    </>
  );
}

export function Nightstand({ s, room }: { s: Shade; room: RoomLook }) {
  const wood = s(mix(floorColor(room.floor), "#d8b48c", 0.4));
  const dark = darken(wood, 0.18);
  return (
    <g>
      <rect x={364} y={640} width={100} height={12} rx={4} fill={lighten(wood, 0.08)} />
      <rect x={370} y={652} width={88} height={110} fill={wood} />
      <rect x={378} y={664} width={72} height={36} rx={4} fill={dark} opacity="0.35" />
      <circle cx={414} cy={682} r={4} fill={s("#c9a15c")} />
      <rect x={378} y={710} width={72} height={40} rx={4} fill={dark} opacity="0.2" />
      <rect x={374} y={760} width={10} height={32} fill={dark} />
      <rect x={444} y={760} width={10} height={32} fill={dark} />
    </g>
  );
}

const BOOK_COLORS = ["#c96f5a", "#e0b04f", "#6f8fb3", "#8fae8b", "#b48ad0", "#e8a3b3", "#5d6f8e", "#d48b4e", "#7aa7a0", "#f0dcc0"];

type ShelfBook = { x: number; w: number; h: number; c: string; lean?: number };
function shelfBooks(seed: number, from: number, to: number, skip?: [number, number]): ShelfBook[] {
  const r = seeded(seed);
  const out: ShelfBook[] = [];
  let x = from;
  while (x < to) {
    const w = 11 + r() * 9;
    if (skip && x + w > skip[0] && x < skip[1]) {
      x = skip[1];
      continue;
    }
    out.push({ x, w, h: 46 + r() * 30, c: BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)] });
    x += w + 1;
    if (r() < 0.12) x += 14;
  }
  return out;
}
const SHELF_TOP = shelfBooks(3, 1316, 1500);
const SHELF_LOW = shelfBooks(8, 1316, 1490);

export function Bookshelf({ s, room }: { s: Shade; room: RoomLook }) {
  const wood = s(mix(floorColor(room.floor), "#d8b48c", 0.3));
  const books = (list: ShelfBook[], base: number) =>
    list.map((b, i) => (
      <g key={i}>
        <rect x={b.x} y={base - b.h} width={b.w} height={b.h} rx={2} fill={s(b.c)} />
        <rect x={b.x + 2} y={base - b.h + 8} width={b.w - 4} height={3} fill="#fff" opacity="0.35" />
        <rect x={b.x + 2} y={base - 14} width={b.w - 4} height={2} fill="#000" opacity="0.15" />
      </g>
    ));
  return (
    <g>
      {books(SHELF_TOP, 330)}
      {books(SHELF_LOW, 452)}
      {/* a leaning book and a little plant */}
      <rect x={1506} y={262} width={14} height={66} rx={2} fill={s("#c96f5a")} transform="rotate(14 1513 330)" />
      <path d="M1538,330 L1534,306 L1566,306 L1562,330 Z" fill={s("#d9846a")} />
      <path d="M1550,306 C1540,290 1530,286 1524,288 C1532,296 1540,302 1550,306 Z M1550,306 C1556,288 1566,282 1574,284 C1568,294 1560,302 1550,306 Z M1550,306 C1550,290 1552,280 1556,274 C1558,286 1556,298 1550,306 Z" fill={s("#6f9c6a")} />
      {[330, 452].map((y) => (
        <g key={y}>
          <rect x={1300} y={y} width={282} height={12} rx={3} fill={wood} />
          <rect x={1300} y={y + 12} width={282} height={4} fill="#000" opacity="0.14" />
          <path d={`M1320,${y + 12} l0,18 l18,-18 Z M1562,${y + 12} l0,18 l-18,-18 Z`} fill={darken(wood, 0.2)} />
        </g>
      ))}
    </g>
  );
}

export function Desk({ s, room, laptopOn }: { s: Shade; room: RoomLook; laptopOn: boolean }) {
  const wood = s(mix(floorColor(room.floor), "#e2c39c", 0.35));
  const dark = darken(wood, 0.2);
  const metal = s("#c9ccd3");
  return (
    <g>
      {/* desk */}
      <rect x={1296} y={588} width={330} height={16} rx={4} fill={lighten(wood, 0.06)} />
      <rect x={1306} y={604} width={310} height={30} fill={wood} />
      <rect x={1430} y={610} width={96} height={18} rx={4} fill={dark} opacity="0.3" />
      <rect x={1472} y={617} width={14} height={4} rx={2} fill={s("#c9a15c")} />
      <rect x={1310} y={634} width={14} height={158} fill={dark} />
      <rect x={1594} y={634} width={14} height={158} fill={dark} />
      {/* laptop */}
      <g>
        <rect x={1342} y={500} width={116} height={82} rx={7} fill={s("#3a3d47")} />
        <rect x={1349} y={507} width={102} height={68} rx={3} fill={laptopOn ? "url(#cz-screen)" : s("#1f222b")} />
        {laptopOn ? (
          <g>
            <circle cx={1426} cy={526} r={9} fill="#fff6dc" opacity="0.95" />
            <path d="M1349,560 C1370,548 1390,552 1408,560 C1424,552 1440,550 1451,556 L1451,575 L1349,575 Z" fill="#7a6aa8" opacity="0.85" />
            <path d="M1349,566 C1372,558 1396,562 1420,568 C1432,564 1444,562 1451,564 L1451,575 L1349,575 Z" fill="#5a4b86" />
            <rect x={1360} y={514} width={30} height={4} rx={2} fill="#fff" opacity="0.7" />
            <rect x={1360} y={521} width={20} height={3} rx={1.5} fill="#fff" opacity="0.5" />
          </g>
        ) : (
          <path d="M1360,507 L1388,507 L1352,560 L1349,560 L1349,520 Z" fill="#fff" opacity="0.06" />
        )}
        <path d="M1334,582 L1466,582 L1472,590 L1328,590 Z" fill={metal} />
        <rect x={1386} y={583} width={28} height={3} rx={1.5} fill={darken(metal, 0.2)} />
      </g>
      {/* pen pot, cactus and notebooks */}
      <rect x={1484} y={556} width={26} height={32} rx={5} fill={s("#e8a3b3")} />
      <path d="M1490,556 l-4,-20 M1497,556 l1,-24 M1504,556 l6,-18" stroke={s("#4b5a74")} strokeWidth="3" strokeLinecap="round" />
      <circle cx={1486} cy={535} r={2} fill={s("#e0b04f")} />
      <path d="M1522,588 L1526,566 L1550,566 L1554,588 Z" fill={s("#c96f5a")} />
      <path d="M1538,566 C1530,566 1530,540 1538,536 C1546,540 1546,566 1538,566 Z" fill={s("#7fae7a")} />
      <path d="M1531,552 C1524,552 1524,544 1528,542 M1545,548 C1552,548 1552,540 1548,538" stroke={s("#7fae7a")} strokeWidth="5" strokeLinecap="round" fill="none" />
      <rect x={1564} y={576} width={58} height={12} rx={2} fill={s("#6f8fb3")} />
      <rect x={1568} y={566} width={52} height={10} rx={2} fill={s("#e0b04f")} />
    </g>
  );
}
