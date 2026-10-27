export type VoiceCategory = "lonely" | "exam" | "giving_up" | "overwhelmed" | "hope" | "self_worth";
export type VoiceLanguage = "en" | "ur";

export const VOICE_CATEGORIES: {
  id: VoiceCategory;
  title: string;
  urdu: string;
  emoji: string;
  tone: string;
  color: string;
  /** Darker shade with enough contrast for white icons and text. */
  deep: string;
  prompt: string;
}[] = [
  {
    id: "lonely",
    title: "When you feel lonely",
    urdu: "جب تنہائی محسوس ہو",
    emoji: "🫂",
    tone: "bg-sky-soft text-sky",
    color: "#4b9fe1",
    deep: "#2f7cc0",
    prompt: "What would you say to someone sitting alone right now, feeling like nobody gets them?",
  },
  {
    id: "exam",
    title: "Before an exam",
    urdu: "امتحان سے پہلے",
    emoji: "📚",
    tone: "bg-sun-soft text-[#a26a00]",
    color: "#f2b437",
    deep: "#a26a00",
    prompt: "What helps you on the morning of an exam? What do you wish someone had told you?",
  },
  {
    id: "giving_up",
    title: "When you feel like giving up on your day",
    urdu: "جب دن سے ہار ماننے کو دل چاہے",
    emoji: "🌅",
    tone: "bg-coral-soft text-coral",
    color: "#ef7d67",
    deep: "#cc4f38",
    prompt: "A rough day is happening. What small thing could turn it around, even a little?",
  },
  {
    id: "overwhelmed",
    title: "When you feel overwhelmed",
    urdu: "جب سب کچھ بہت زیادہ لگے",
    emoji: "🌊",
    tone: "bg-grape-soft text-grape",
    color: "#8b68d6",
    deep: "#7552c4",
    prompt: "Everything feels like too much. What would help someone slow down and take one step?",
  },
  {
    id: "hope",
    title: "When you need some hope",
    urdu: "جب امید کی ضرورت ہو",
    emoji: "🌱",
    tone: "bg-mint-soft text-[#1f8a6b]",
    color: "#34b892",
    deep: "#1f8a6b",
    prompt: "Share a time things got better when you didn't expect them to.",
  },
  {
    id: "self_worth",
    title: "When you doubt yourself",
    urdu: "جب خود پر شک ہو",
    emoji: "💛",
    tone: "bg-rose-soft text-rose",
    color: "#e86a9a",
    deep: "#c94a7c",
    prompt: "Remind someone why they matter, even on days they can't see it.",
  },
];

export const VOICE_LANGUAGES: { id: VoiceLanguage; label: string; native: string }[] = [
  { id: "en", label: "English", native: "English" },
  { id: "ur", label: "Urdu", native: "اردو" },
];

export const voiceCategory = (id: string) => VOICE_CATEGORIES.find((c) => c.id === id) ?? VOICE_CATEGORIES[0];

export const VOICE_MIN_SECONDS = 20;
export const VOICE_MAX_SECONDS = 60;

export const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
