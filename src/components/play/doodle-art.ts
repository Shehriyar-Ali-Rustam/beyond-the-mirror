/** Ready-made doodles, drawn stroke by stroke on a 200 × 200 canvas. */

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

export type ReadyDoodle = { id: string; word: string; alts?: string[]; color: string; paths: string[] };

export const READY_DOODLES: ReadyDoodle[] = [
  {
    id: "sun",
    word: "sun",
    alts: ["sunshine", "sunny"],
    color: "#e09a00",
    paths: [circle(100, 100, 34), "M100 22v24", "M100 154v24", "M22 100h24", "M154 100h24", "M45 45l17 17", "M138 138l17 17", "M155 45l-17 17", "M62 138l-17 17"],
  },
  {
    id: "house",
    word: "house",
    alts: ["home"],
    color: "#cc4f38",
    paths: ["M38 102L100 45l62 57", "M55 92v73h90V92", "M88 165v-40h24v40", "M120 108h20v20h-20z", "M132 72V50h14v36"],
  },
  {
    id: "fish",
    word: "fish",
    alts: ["goldfish"],
    color: "#2f7cc0",
    paths: ["M38 100c30-42 90-42 112 0c-22 42-82 42-112 0z", "M150 100l30-26v52z", circle(70, 93, 4), "M95 76q10-16 22-3", "M100 112q10 8 20 0"],
  },
  {
    id: "tree",
    word: "tree",
    color: "#1f8a6b",
    paths: ["M100 30c-40 0-60 40-45 65c-20 15 0 40 25 30c10 15 35 15 45 0c25 10 43-15 23-30c14-25-8-65-48-65z", "M90 180v-56h20v56", "M100 140l-18-14", "M60 182h80"],
  },
  {
    id: "umbrella",
    word: "umbrella",
    alts: ["brolly"],
    color: "#7552c4",
    paths: ["M28 100Q100 18 172 100", "M28 100q18-15 36 0q18-15 36 0q18-15 36 0q18-15 36 0", "M100 100v60q0 15-14 15t-14-13", "M100 46V34"],
  },
  {
    id: "star",
    word: "star",
    color: "#e09a00",
    paths: ["M100 25l20 53l57 2l-45 34l16 56l-48-32l-48 32l16-56l-45-34l57-2z"],
  },
  {
    id: "heart",
    word: "heart",
    alts: ["love"],
    color: "#c94a7c",
    paths: ["M100 170C40 125 25 90 45 62c20-24 50-14 55 10c5-24 35-34 55-10c20 28 5 63-55 108z"],
  },
  {
    id: "rain",
    word: "rain",
    alts: ["cloud", "rain cloud", "raining", "rainy", "storm", "cloud and rain"],
    color: "#2f7cc0",
    paths: ["M58 122a24 24 0 0 1 8-46a32 32 0 0 1 60-10a26 26 0 0 1 30 40a17 17 0 0 1-8 16z", "M72 140l-7 16", "M100 140l-7 16", "M128 140l-7 16", "M86 160l-5 12", "M114 160l-5 12"],
  },
  {
    id: "flower",
    word: "flower",
    alts: ["daisy", "sunflower"],
    color: "#c94a7c",
    paths: [circle(100, 82, 12), circle(100, 52, 17), circle(129, 73, 17), circle(118, 108, 17), circle(82, 108, 17), circle(71, 73, 17), "M100 125v55", "M100 158q25-18 37-6q-15 16-37 10"],
  },
  {
    id: "boat",
    word: "boat",
    alts: ["ship", "sailboat", "sail boat"],
    color: "#36507a",
    paths: ["M28 128h144l-22 32H50z", "M100 128V38", "M104 44l48 76h-48z", "M96 56l-36 64h36", "M18 174q15-8 30 0t30 0t30 0t30 0t30 0t14 0"],
  },
  {
    id: "icecream",
    word: "ice cream",
    alts: ["icecream", "ice cream cone", "cone"],
    color: "#c94a7c",
    paths: ["M68 96l32 80l32-80", "M76 112l48-10", "M84 134l36-8", "M62 98c-8-28 12-50 38-50s46 22 38 50z", circle(100, 42, 7), "M103 35q6-10 14-12"],
  },
  {
    id: "rocket",
    word: "rocket",
    alts: ["spaceship", "space ship", "rocket ship"],
    color: "#cc4f38",
    paths: ["M100 22c26 26 31 72 22 118H78c-9-46-4-92 22-118z", circle(100, 72, 11), "M78 112l-22 38l24-10", "M122 112l22 38l-24-10", "M88 142q12 44 24 0"],
  },
  {
    id: "apple",
    word: "apple",
    color: "#cc4f38",
    paths: ["M100 66c-20-16-56-10-56 34c0 46 32 76 56 60c24 16 56-14 56-60c0-44-36-50-56-34z", "M100 66q0-22 10-32", "M104 50q18-16 32-4q-16 14-32 4z"],
  },
  {
    id: "moon",
    word: "moon",
    alts: ["crescent", "crescent moon", "night"],
    color: "#7552c4",
    paths: ["M128 34a70 70 0 1 0 40 92a56 56 0 1 1-40-92z", "M48 46l4 10l10 4l-10 4l-4 10l-4-10l-10-4l10-4z", "M150 40l3 7l7 3l-7 3l-3 7l-3-7l-7-3l7-3z"],
  },
  {
    id: "cat",
    word: "cat",
    alts: ["kitten", "kitty"],
    color: "#a26a00",
    paths: ["M55 78l5-42l26 24q14-5 28 0l26-24l5 42c16 32 0 82-45 82s-61-50-45-82z", circle(80, 96, 6), circle(120, 96, 6), "M94 114h12l-6 7z", "M100 121q-8 11-15 5", "M100 121q8 11 15 5", "M40 110h36", "M42 126l34-7", "M160 110h-36", "M158 126l-34-7"],
  },
  {
    id: "glasses",
    word: "glasses",
    alts: ["spectacles", "sunglasses", "specs"],
    color: "#36507a",
    paths: [circle(58, 104, 28), circle(142, 104, 28), "M86 104q14-12 28 0", "M30 98L14 82", "M170 98l16-16"],
  },
];

export const DRAW_PROMPTS = [
  "pizza", "rainbow", "snowman", "guitar", "robot", "cupcake", "dinosaur", "spaceship", "octopus", "volcano", "kite",
  "castle", "penguin", "bicycle", "cactus", "lighthouse", "dragon", "mushroom", "balloon", "turtle", "camera",
  "headphones", "mango", "cricket bat", "rickshaw", "teapot", "butterfly", "giraffe", "pencil", "clock", "football",
];
