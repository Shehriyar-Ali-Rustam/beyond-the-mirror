import { EXPERTISE_AREAS, type ExpertiseArea } from "@/lib/expertise";
import type { Category } from "@/lib/types";

/**
 * Smart counselor matching, without any outside AI service.
 *
 * A student's answers and (optionally) a few words in their own language are
 * turned into weights over the counselors' areas of expertise. The database
 * then scores every verified counselor against those weights (see
 * `private.rank_counselors`) and picks the best fit.
 */

type Weights = Partial<Record<ExpertiseArea, number>>;

export type ConcernId = "exams" | "family" | "friendship" | "overthinking" | "tired" | "low" | "other";

export const CONCERNS: {
  id: ConcernId;
  label: string;
  emoji: string;
  category: Category;
  weights: Weights;
  intro?: { title: string; body: string };
  question: string;
  details: { id: string; label: string; weights: Weights; risk?: "safety" | "bullying" }[];
}[] = [
  {
    id: "exams",
    label: "I'm stressed about exams",
    emoji: "📚",
    category: "exams",
    weights: { academic: 1, anxiety: 0.25 },
    question: "What's making it hardest?",
    details: [
      { id: "too_much", label: "There's too much to revise", weights: { academic: 0.4 } },
      { id: "fail", label: "I'm scared of failing", weights: { anxiety: 0.4, self_esteem: 0.2 } },
      { id: "pressure", label: "Pressure from family or teachers", weights: { family: 0.5 } },
      { id: "focus", label: "I can't focus or remember things", weights: { academic: 0.3, anxiety: 0.2 } },
      { id: "panic", label: "I panic before or during exams", weights: { anxiety: 0.6 } },
    ],
  },
  {
    id: "family",
    label: "I'm facing family issues",
    emoji: "🏠",
    category: "family",
    weights: { family: 1 },
    question: "What's happening at home?",
    details: [
      { id: "arguments", label: "Arguments or tension at home", weights: { family: 0.3, anger: 0.2 } },
      { id: "misunderstood", label: "I feel misunderstood", weights: { family: 0.2, self_esteem: 0.2 } },
      { id: "expectations", label: "Too much pressure or expectations", weights: { family: 0.3, academic: 0.2 } },
      { id: "changes", label: "Big changes, like separation, moving or a loss", weights: { grief: 0.6 } },
      { id: "unsafe", label: "I don't feel safe at home", weights: { family: 0.5 }, risk: "safety" },
    ],
  },
  {
    id: "friendship",
    label: "I'm having friendship problems",
    emoji: "💬",
    category: "friendship",
    weights: { friendships: 1 },
    question: "What's going on?",
    details: [
      { id: "fell_out", label: "I fell out with a friend", weights: { friendships: 0.3 } },
      { id: "left_out", label: "I feel left out or lonely", weights: { friendships: 0.3, low_mood: 0.2 } },
      { id: "bullied", label: "Someone is bullying or teasing me", weights: { bullying: 1 }, risk: "bullying" },
      { id: "online", label: "Problems online or on social media", weights: { bullying: 0.5, friendships: 0.2 } },
      { id: "relationship", label: "Relationship worries", weights: { friendships: 0.4 } },
    ],
  },
  {
    id: "overthinking",
    label: "I'm overthinking a lot",
    emoji: "🌧️",
    category: "wellbeing",
    weights: { anxiety: 1 },
    question: "What does it look like for you?",
    details: [
      { id: "future", label: "Worrying about the future", weights: { anxiety: 0.2, career: 0.5 } },
      { id: "replaying", label: "Replaying conversations again and again", weights: { anxiety: 0.3, self_esteem: 0.2 } },
      { id: "sleep", label: "My thoughts keep me awake", weights: { anxiety: 0.3, low_mood: 0.2 } },
      { id: "panic", label: "Racing heart or panicky feelings", weights: { anxiety: 0.5 } },
      { id: "judged", label: "Worrying what people think of me", weights: { self_esteem: 0.6 } },
    ],
  },
  {
    id: "tired",
    label: "I'm feeling emotionally tired",
    emoji: "💗",
    category: "wellbeing",
    weights: { low_mood: 1, anxiety: 0.2 },
    question: "What feels closest?",
    details: [
      { id: "drained", label: "I feel drained all the time", weights: { low_mood: 0.3 } },
      { id: "motivation", label: "I have no motivation", weights: { low_mood: 0.3, academic: 0.2 } },
      { id: "too_much", label: "Everything feels like too much", weights: { anxiety: 0.3, low_mood: 0.2 } },
      { id: "sleep", label: "I'm struggling to sleep", weights: { low_mood: 0.2, anxiety: 0.2 } },
      { id: "no_joy", label: "I don't enjoy things like I used to", weights: { low_mood: 0.5 } },
    ],
  },
  {
    id: "low",
    label: "I don't know why I feel low",
    emoji: "🤍",
    category: "wellbeing",
    weights: { low_mood: 1 },
    intro: {
      title: "It's okay not to know why.",
      body: "Sometimes feelings are difficult to understand. Let's take a moment to explore them without judging yourself.",
    },
    question: "Can you tell us a little more?",
    details: [
      { id: "sad", label: "I just feel sad", weights: { low_mood: 0.3 } },
      { id: "empty", label: "I feel empty or disconnected", weights: { low_mood: 0.4 } },
      { id: "tired", label: "I feel tired even when I rest", weights: { low_mood: 0.3 } },
      { id: "confused", label: "I feel confused about my emotions", weights: { anxiety: 0.2, self_esteem: 0.2 } },
      { id: "unsure", label: "I can't really explain it", weights: { low_mood: 0.1 } },
    ],
  },
  {
    id: "other",
    label: "Something else",
    emoji: "✨",
    category: "other",
    weights: {},
    question: "Which is closest?",
    details: [
      { id: "anger", label: "Anger or frustration", weights: { anger: 1 } },
      { id: "grief", label: "Grief or losing someone", weights: { grief: 1 } },
      { id: "confidence", label: "Confidence or how I see myself", weights: { self_esteem: 1 } },
      { id: "future", label: "My future, careers or subject choices", weights: { career: 1 } },
      { id: "own_words", label: "I'd rather explain in my own words", weights: {} },
    ],
  },
];

// Words people actually use, in English and Roman Urdu. Matched on word starts.
const LEXICON: Record<ExpertiseArea, string[]> = {
  academic: ["exam", "test", "paper", "revis", "study", "studies", "studying", "homework", "assignment", "mark", "grade", "result", "board", "matric", "fsc", "o level", "a level", "entry test", "mdcat", "ecat", "teacher", "class", "school work", "imtihan", "parhai", "padhai", "fail", "syllabus", "quiz", "subject"],
  family: ["family", "parent", "mum ", "mom ", "moms ", "mother", "dad ", "dads ", "father", "ammi", "abbu", "abu ", "ami ", "brother", "sister", "bhai", "behen", "home ", "ghar ", "divorce", "separat", "relative", "rishtedar", "stepmother", "stepfather", "step mom", "step dad", "uncle", "aunt", "khala", "chacha", "walid"],
  friendships: ["friend", "dost", "dosti", "left out", "ignor", "group", "relationship", "boyfriend", "girlfriend", "crush", "breakup", "break up", "fell out", "trust"],
  bullying: ["bully", "bullied", "bullying", "teas", "mocking me", "mocked", "mock me", "laugh at me", "laughing at me", "threat", "harass", "cyberbull", "rumour", "rumor", "name calling", "call me names", "hit me", "beat me", "push me", "tang ", "blackmail"],
  anxiety: ["anxi", "worry", "worri", "overthink", "over think", "panic", "nervous", "scared", "fear", "afraid", "racing", "can't stop thinking", "cant stop thinking", "ghabra", "pareshan", "tension", "darr", "dar lagta", "stress"],
  low_mood: ["sad", "low ", "down ", "empty", "numb", "hopeless", "cry", "tired", "exhaust", "drained", "no energy", "unmotivat", "motivation", "depress", "udaas", "udas", "akela", "lonely", "alone", "dil nahi", "pointless"],
  self_esteem: ["confiden", "insecur", "ugly", "not good enough", "worthless", "useless", "hate myself", "compar", "body", "weight", "appearance", "shy", "embarrass", "failure", "loser"],
  grief: ["died", "death", "passed away", "pass away", "loss", "lost my", "funeral", "grief", "griev", "miss him", "miss her", "inteqal", "intiqal", "wafat", "faut"],
  career: ["career", "future", "university", "uni ", "college", "subject choice", "choose subjects", "job", "medical", "engineering", "field", "admission", "scholarship", "profession"],
  anger: ["angry", "anger", "rage", "mad at", "frustrat", "temper", "fight", "fighting", "ghussa", "gussa", "irritat", "annoyed", "shout", "yell"],
};

const NEGATIONS = new Set(["not", "no", "never", "dont", "don't", "isnt", "isn't", "nahi", "nahin", "without"]);

const SELF_HARM = /(kill (my ?self|me)|suicid|want to die|wanna die|end (it all|my life)|self[ -]?harm|hurt(ing)? my ?self|cut(ting)? my ?self|no reason to live|better off without me|marna chahta|marna chahti|khudkushi)/i;
const UNSAFE = /(not safe at home|hits? me|beats? me|abus|touch(es|ed)? me|hurting me|threaten(s|ed)? (to )?(hurt|kill)|scared to go home|dar lagta hai ghar)/i;

export type Risk = "self_harm" | "safety" | "bullying" | null;

/**
 * Turns free text into weights. A term ending in a space must be a whole word;
 * others match the start of a word ("revis" finds revise and revision). Terms
 * shortly after "not", "never" and similar are ignored.
 */
export function analyseText(text: string): { weights: Weights; risk: Risk } {
  const clean = ` ${text.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ")} `;
  const weights: Weights = {};
  for (const area of EXPERTISE_AREAS) {
    let hits = 0;
    for (const term of LEXICON[area]) {
      let from = 0;
      for (;;) {
        const at = clean.indexOf(` ${term}`, from);
        if (at < 0) break;
        from = at + term.length;
        // Words before this one, to check for a nearby negation.
        const before = clean.slice(0, at).trim().split(" ").slice(-3);
        if (!before.some((w) => NEGATIONS.has(w))) hits++;
      }
    }
    if (hits) weights[area] = Math.min(1, 0.35 * hits);
  }
  const risk: Risk = SELF_HARM.test(text) ? "self_harm" : UNSAFE.test(text) ? "safety" : null;
  return { weights, risk };
}

const add = (into: Weights, from: Weights, factor = 1) => {
  for (const [k, v] of Object.entries(from) as [ExpertiseArea, number][]) into[k] = (into[k] ?? 0) + v * factor;
};

export function analyseIntake(input: { concern: ConcernId; details: string[]; note: string }) {
  const concern = CONCERNS.find((c) => c.id === input.concern) ?? CONCERNS[CONCERNS.length - 1];
  const weights: Weights = {};
  add(weights, concern.weights);
  let risk: Risk = null;
  for (const d of concern.details) {
    if (!input.details.includes(d.id)) continue;
    add(weights, d.weights);
    if (d.risk === "safety") risk = "safety";
    else if (d.risk === "bullying" && !risk) risk = "bullying";
  }
  const text = analyseText(input.note);
  add(weights, text.weights, 0.8);
  if (text.risk) risk = text.risk;

  // Scale so the strongest concern is 1 and drop faint signals.
  const max = Math.max(0, ...Object.values(weights));
  const scaled: Weights = {};
  if (max > 0) {
    for (const [k, v] of Object.entries(weights) as [ExpertiseArea, number][]) {
      const n = Math.round((v / max) * 100) / 100;
      if (n >= 0.15) scaled[k] = n;
    }
  }
  const urgent = risk === "self_harm" || risk === "safety";
  const category: Category = risk === "bullying" ? "bullying" : concern.category;
  return { concern, weights: scaled, risk, urgent, category };
}
