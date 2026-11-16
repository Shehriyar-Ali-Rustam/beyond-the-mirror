import { BookHeart, ClipboardList, Footprints, GraduationCap, HandHeart, Scale, type LucideIcon } from "lucide-react";

export type WellbeingSlug = "tracker" | "decisions" | "stress" | "gratitude" | "academics" | "reflections";

/** The personal toolkit: six connected tools that save to the student's private account. */
export const WELLBEING_TOOLS: {
  slug: WellbeingSlug;
  title: string;
  short: string;
  purpose: string;
  icon: LucideIcon;
  tone: string;
  accent: string;
}[] = [
  {
    slug: "reflections",
    title: "Daily Reflection Cards",
    short: "Reflection",
    purpose: "One thoughtful question a day to build self-awareness, with a private journal of your answers.",
    icon: BookHeart,
    tone: "bg-lilac-soft text-lilac",
    accent: "#7569cc",
  },
  {
    slug: "tracker",
    title: "Behaviour Pattern Tracker",
    short: "Patterns",
    purpose: "Log everyday habits and what surrounds them, then see which patterns repeat and set small goals.",
    icon: Footprints,
    tone: "bg-mint-soft text-[#1f8a6b]",
    accent: "#1f8a6b",
  },
  {
    slug: "stress",
    title: "Stress Pattern Analysis",
    short: "Stress",
    purpose: "Record what causes pressure and how it affects you, and see your recurring stressors over time.",
    icon: ClipboardList,
    tone: "bg-coral-soft text-[#b4452f]",
    accent: "#cc4f38",
  },
  {
    slug: "academics",
    title: "Academic Pressure Manager",
    short: "Academics",
    purpose: "Organise deadlines, break big tasks down, plan a realistic week and check in on academic pressure.",
    icon: GraduationCap,
    tone: "bg-sun-soft text-[#8a5a00]",
    accent: "#a26a00",
  },
  {
    slug: "decisions",
    title: "Decision-Making Assistant",
    short: "Decisions",
    purpose: "Work through a difficult choice step by step: options, pros and cons, outcomes and what matters most.",
    icon: Scale,
    tone: "bg-sky-soft text-[#246aa6]",
    accent: "#2f7cc0",
  },
  {
    slug: "gratitude",
    title: "Gratitude Wall",
    short: "Gratitude",
    purpose: "A moderated community wall for sharing appreciation, small wins and kindness, anonymously if you like.",
    icon: HandHeart,
    tone: "bg-rose-soft text-[#b23a6a]",
    accent: "#c94a7c",
  },
];

export const wellbeingTool = (slug: string) => WELLBEING_TOOLS.find((t) => t.slug === slug);

// ---------------------------------------------------------------- behaviour
export const BEHAVIOURS = {
  sleep: { label: "Sleep", emoji: "🌙", hours: true },
  study: { label: "Study", emoji: "📖", hours: true },
  social: { label: "Social time", emoji: "🧑‍🤝‍🧑", hours: true },
  screen_time: { label: "Screen time", emoji: "📱", hours: true },
  avoidance: { label: "Avoiding a task", emoji: "⏳", hours: false },
  breaks: { label: "Taking a break", emoji: "☕", hours: true },
  exercise: { label: "Exercise or movement", emoji: "🏃", hours: true },
  eating: { label: "Meals", emoji: "🍽️", hours: false },
  other: { label: "Something else", emoji: "✳️", hours: false },
} as const;
export type Behaviour = keyof typeof BEHAVIOURS;

export const FEELINGS = {
  calm: { label: "Calm", positive: true },
  happy: { label: "Happy", positive: true },
  motivated: { label: "Motivated", positive: true },
  tired: { label: "Tired", positive: false },
  bored: { label: "Bored", positive: false },
  stressed: { label: "Stressed", positive: false },
  anxious: { label: "Anxious", positive: false },
  low: { label: "Low", positive: false },
  frustrated: { label: "Frustrated", positive: false },
  overwhelmed: { label: "Overwhelmed", positive: false },
} as const;
export type Feeling = keyof typeof FEELINGS;

export const IMPACTS: { value: number; label: string }[] = [
  { value: -2, label: "Much worse" },
  { value: -1, label: "A bit worse" },
  { value: 0, label: "No change" },
  { value: 1, label: "A bit better" },
  { value: 2, label: "Much better" },
];

// ---------------------------------------------------------------- stress
export const STRESS_SOURCES = {
  academic: "Academic pressure",
  family: "Family expectations",
  friendships: "Friendships",
  social: "Social situations",
  responsibilities: "Personal responsibilities",
  future: "Uncertainty about the future",
  health: "Health or sleep",
  other: "Something else",
} as const;
export type StressSource = keyof typeof STRESS_SOURCES;

export const STRESS_FREQUENCY = {
  once: "Just this once",
  sometimes: "Sometimes",
  often: "Often",
  daily: "Almost every day",
} as const;

export const STRESS_IMPACTS = [
  { key: "impact_concentration", label: "Concentration" },
  { key: "impact_sleep", label: "Sleep" },
  { key: "impact_motivation", label: "Motivation" },
  { key: "impact_relationships", label: "Relationships" },
  { key: "impact_daily", label: "Daily activities" },
] as const;
export const IMPACT_LEVELS = ["Not at all", "A little", "Quite a bit", "A lot"];

/** Practical approaches for each kind of stress, with links into the toolkit. */
export const COPING: Record<StressSource, { title: string; tips: string[]; link?: { href: string; label: string } }> = {
  academic: {
    title: "Academic pressure",
    tips: ["Break the largest task into steps you can finish in under an hour.", "Plan the week with rest built in, rather than revising in long unplanned blocks.", "Ask a teacher which topics matter most, instead of trying to cover everything equally."],
    link: { href: "/student/toolkit/academics", label: "Open the Academic Pressure Manager" },
  },
  family: {
    title: "Family expectations",
    tips: ["Separate what is expected of you from what you expect of yourself; write both down.", "Choose a calm moment to share how the pressure affects you, using specific examples.", "A counselor can help you plan that conversation or join it."],
    link: { href: "/student/toolkit/say-it", label: "Scripts for hard conversations" },
  },
  friendships: {
    title: "Friendships",
    tips: ["Notice whether the stress comes from one person or a whole group; the response differs.", "Talk privately rather than in group chats, where tone is easily misread.", "Spend time with people outside the situation to keep perspective."],
    link: { href: "/student/toolkit/situations", label: "Friends, family and bullying guide" },
  },
  social: {
    title: "Social situations",
    tips: ["Prepare one or two things to say before situations you find difficult.", "Give yourself permission to leave early or take a short break outside.", "Gradual exposure works better than avoiding situations altogether."],
  },
  responsibilities: {
    title: "Personal responsibilities",
    tips: ["List everything you are carrying, then mark what only you can do.", "Ask for help with one item this week.", "Protect a short daily period that is only for rest."],
  },
  future: {
    title: "Uncertainty about the future",
    tips: ["Focus on the next decision you actually need to make, not every future decision.", "Gather information: talk to someone already on the path you are considering.", "Uncertainty is normal at this stage; plans are allowed to change."],
    link: { href: "/student/toolkit/decisions", label: "Use the Decision-Making Assistant" },
  },
  health: {
    title: "Health or sleep",
    tips: ["Keep a consistent wake-up time, even at weekends.", "Reduce screens for the hour before sleep.", "If physical symptoms continue, speak to a doctor or a trusted adult."],
    link: { href: "/student/toolkit/reset", label: "Bad-day reset and breathing" },
  },
  other: {
    title: "Other sources",
    tips: ["Name the source as specifically as you can; vague stress is harder to act on.", "Ask yourself what is within your control in this situation.", "Talking it through with a counselor often makes the next step clearer."],
  },
};

// ---------------------------------------------------------------- academics
export const TASK_KINDS = {
  assignment: "Assignment",
  project: "Project",
  exam: "Exam",
  presentation: "Presentation",
  reading: "Reading",
  other: "Other",
} as const;

export const ACADEMIC_PRESSURES = {
  exam_anxiety: "Exam anxiety",
  workload: "Workload",
  fear_of_failure: "Fear of failure",
  expectations: "Expectations from others",
  time: "Not enough time",
  understanding: "Difficulty understanding material",
  motivation: "Low motivation",
  other: "Something else",
} as const;

// ---------------------------------------------------------------- decisions
export const DECISION_AREAS = {
  education: "Education",
  friendships: "Friendships",
  family: "Family expectations",
  responsibilities: "Personal responsibilities",
  future: "Future plans",
  other: "Something else",
} as const;

export const PRIORITY_SUGGESTIONS = ["My wellbeing", "My responsibilities", "Safety", "My values", "Future goals", "Relationships", "Time available", "Cost"];

// ---------------------------------------------------------------- gratitude
export const GRATITUDE_CATEGORIES = {
  people: { label: "People I appreciate", emoji: "🤝", tone: "bg-rose-soft text-[#b23a6a]" },
  small_moments: { label: "Small moments", emoji: "☀️", tone: "bg-sun-soft text-[#8a5a00]" },
  achievements: { label: "Personal achievements", emoji: "🏅", tone: "bg-mint-soft text-[#1f7a5f]" },
  kindness: { label: "Acts of kindness", emoji: "💛", tone: "bg-coral-soft text-[#b4452f]" },
  learned: { label: "Things I have learned", emoji: "📘", tone: "bg-sky-soft text-[#246aa6]" },
  happy: { label: "Moments that made me happy", emoji: "🌈", tone: "bg-lilac-soft text-lilac" },
} as const;
export type GratitudeCategory = keyof typeof GRATITUDE_CATEGORIES;

export const GRATITUDE_REACTIONS = {
  appreciate: { label: "Appreciate", emoji: "💜" },
  relate: { label: "I relate", emoji: "🤝" },
  inspiring: { label: "Inspiring", emoji: "🌱" },
} as const;
export type GratitudeReaction = keyof typeof GRATITUDE_REACTIONS;

// ---------------------------------------------------------------- reflections
export type ReflectionCategory = "emotional" | "self" | "relationships" | "academic" | "growth" | "challenges" | "gratitude";

export const REFLECTION_CATEGORIES: Record<ReflectionCategory | "weekly", string> = {
  emotional: "Emotional awareness",
  self: "Self-understanding",
  relationships: "Relationships",
  academic: "Academic experiences",
  growth: "Personal growth",
  challenges: "Challenges and difficulties",
  gratitude: "Gratitude and appreciation",
  weekly: "Weekly reflection",
};

export const REFLECTION_QUESTIONS: { id: string; category: ReflectionCategory; q: string; followups: string[] }[] = [
  { id: "energy", category: "emotional", q: "What has been taking most of your energy lately?", followups: ["Is that energy being spent on something you chose, or something that was put on you?", "What would give you a little of that energy back?"] },
  { id: "understood_wish", category: "self", q: "Is there something you wish people understood about you?", followups: ["Who would you most like to understand it?", "What makes it difficult to tell them?"] },
  { id: "handled_differently", category: "growth", q: "What is one situation you handled differently than you would have in the past?", followups: ["What changed in you that made that possible?", "How did it feel afterwards?"] },
  { id: "felt_understood", category: "relationships", q: "When was the last time you genuinely felt understood?", followups: ["What did that person do that helped?", "Could you do the same for someone else?"] },
  { id: "balance", category: "challenges", q: "What is something you are currently struggling to balance?", followups: ["If you had to let one part go for a week, which would it be?", "Who could help you carry part of it?"] },
  { id: "routine_change", category: "self", q: "What is one thing you would like to change about your daily routine?", followups: ["What is the smallest version of that change you could try tomorrow?", "What usually gets in the way?"] },
  { id: "rest", category: "emotional", q: "Have you been giving yourself enough time to rest?", followups: ["What does real rest look like for you?", "What would you need to let go of to rest more?"] },
  { id: "emotion_name", category: "emotional", q: "Which emotion have you felt most often this week, and when did it show up?", followups: ["What was usually happening just before it?", "How did you respond to it?"] },
  { id: "hidden_feeling", category: "emotional", q: "Is there a feeling you have been avoiding or keeping to yourself?", followups: ["What do you think would happen if you let yourself feel it?", "Is there someone safe you could share it with?"] },
  { id: "strength", category: "self", q: "What is a strength of yours that others might not notice?", followups: ["When did that strength help you recently?", "How could you use it more deliberately?"] },
  { id: "values", category: "self", q: "What matters most to you right now, and does your time reflect it?", followups: ["Where is there a gap between the two?", "What is one way to close that gap this week?"] },
  { id: "self_talk", category: "self", q: "How do you speak to yourself when something goes wrong?", followups: ["Would you speak to a friend that way?", "What would a fairer response sound like?"] },
  { id: "support_person", category: "relationships", q: "Who do you turn to when things are difficult, and why them?", followups: ["Do they know how much they help you?", "Is there anyone you wish you could turn to?"] },
  { id: "boundary", category: "relationships", q: "Is there a relationship where you find it hard to say no?", followups: ["What are you worried would happen if you did?", "What is one small boundary you could set?"] },
  { id: "conflict", category: "relationships", q: "Is there a disagreement you have not resolved?", followups: ["What do you think the other person needs?", "What would a fair resolution look like for both of you?"] },
  { id: "learning_moment", category: "academic", q: "What did you learn recently that genuinely interested you?", followups: ["What made it interesting?", "How could you explore it further?"] },
  { id: "study_feeling", category: "academic", q: "How do you feel when you sit down to study, and why?", followups: ["When does studying feel easiest?", "What could you change about the conditions?"] },
  { id: "mistake", category: "academic", q: "What is a mistake you made in your work that taught you something?", followups: ["How did you react at the time?", "What would you tell someone who made the same mistake?"] },
  { id: "expectations", category: "academic", q: "Whose expectations about your studies do you feel most strongly?", followups: ["Do those expectations match your own?", "What would you choose if no one else's opinion counted?"] },
  { id: "proud", category: "growth", q: "What is something you are quietly proud of this month?", followups: ["What did it take to get there?", "Did you let yourself acknowledge it?"] },
  { id: "fear_growth", category: "growth", q: "What is something you would like to try but have been putting off?", followups: ["What is the risk if it does not go well?", "What is the cost of never trying?"] },
  { id: "habit_win", category: "growth", q: "Which small habit has had the biggest effect on how you feel?", followups: ["How could you make it easier to keep?", "Is there another habit you would like to build next?"] },
  { id: "hard_week", category: "challenges", q: "What has been the hardest part of this week?", followups: ["What helped, even a little?", "What would you do differently if it happened again?"] },
  { id: "worry_control", category: "challenges", q: "What are you worrying about that is outside your control?", followups: ["Which part of it, if any, is within your control?", "What would help you put the rest down for now?"] },
  { id: "asking_help", category: "challenges", q: "When did you last ask for help, and how did it feel?", followups: ["What makes asking for help easier or harder for you?", "Is there something you need help with right now?"] },
  { id: "thank_someone", category: "gratitude", q: "Who has made a difference to you recently, even in a small way?", followups: ["What exactly did they do?", "Have you been able to thank them?"] },
  { id: "ordinary_good", category: "gratitude", q: "What ordinary part of your day would you miss if it were gone?", followups: ["Why does it matter to you?", "How could you notice it more often?"] },
  { id: "better_than_expected", category: "gratitude", q: "What turned out better than you expected recently?", followups: ["What did you expect, and why?", "What does that tell you about your expectations?"] },
];

/** The same card for the whole day, different on each day, and different between students. */
export function dailyQuestion(dateKey: string, seed: string, offset = 0) {
  let h = 0;
  for (const ch of dateKey + seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return REFLECTION_QUESTIONS[(h + offset) % REFLECTION_QUESTIONS.length];
}

// ---------------------------------------------------------------- dates
export const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const fromKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Monday of the week containing `d`. */
export const weekStart = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
export const shortDay = (k: string) => fromKey(k).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
