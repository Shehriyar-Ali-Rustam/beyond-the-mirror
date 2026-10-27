export type MoodId = "sunny" | "calm" | "hopeful" | "dreamy" | "low" | "fiery" | "restless" | "tender" | "heavy";
export type Ambient = "sparkles" | "bubbles" | "leaves" | "stars" | "rain" | "embers" | "swirl" | "hearts" | "deep";

export type Mood = {
  id: MoodId;
  name: string;
  feeling: string;
  /** Solid swatch colour. */
  color: string;
  /** Three soft colours used for the site background when this mood is on. */
  wash: [string, string, string];
  /** Particle colour for the ambient animation. */
  particle: string;
  ambient: Ambient;
  /** Voice note category that tends to help. */
  voice: "lonely" | "exam" | "giving_up" | "overwhelmed" | "hope" | "self_worth";
  game: "smash" | "wheel" | "mystery" | "doodle" | "emoji";
  tool: "reset" | "untangle" | "letters" | "say-it" | "check-in" | "feelings" | "exams";
  suggestCounselor: boolean;
  messages: string[];
};

export const MOODS: Mood[] = [
  {
    id: "sunny",
    name: "Sunny yellow",
    feeling: "Happy, bright, full of energy",
    color: "#f5b82e",
    wash: ["#fff6d6", "#ffe9c4", "#fff1e6"],
    particle: "#f5b82e",
    ambient: "sparkles",
    voice: "hope",
    game: "wheel",
    tool: "letters",
    suggestCounselor: false,
    messages: [
      "Notice what made today feel good, so you can find your way back to it on harder days.",
      "Your good mood is contagious. Maybe share a little of it with someone who needs it?",
      "Bright days count too. Let yourself enjoy this one without waiting for the catch.",
      "Write down one thing that went well today. Future you will love reading it.",
    ],
  },
  {
    id: "calm",
    name: "Calm blue",
    feeling: "Peaceful, okay, steady",
    color: "#4b9fe1",
    wash: ["#e6f2fd", "#eef0fc", "#e9f8f6"],
    particle: "#8cc4ef",
    ambient: "bubbles",
    voice: "hope",
    game: "emoji",
    tool: "letters",
    suggestCounselor: false,
    messages: [
      "Calm is a skill, and right now you're practising it. Nice.",
      "Steady days are a good time to plan something kind for yourself this week.",
      "Take a slow breath and enjoy the quiet. You don't have to fill it.",
      "You're allowed to simply be okay. That's enough for today.",
    ],
  },
  {
    id: "hopeful",
    name: "Fresh green",
    feeling: "Hopeful, growing, getting there",
    color: "#34b892",
    wash: ["#e2f6ee", "#f0f9e8", "#e6f4fb"],
    particle: "#5fcfa9",
    ambient: "leaves",
    voice: "self_worth",
    game: "mystery",
    tool: "check-in",
    suggestCounselor: false,
    messages: [
      "Growth is quiet and slow, and it's still growth. Keep going.",
      "You've handled hard things before. That's proof, not just hope.",
      "Small steps count. Today's small step might be the one that matters.",
      "Something good is building, even if you can't see all of it yet.",
    ],
  },
  {
    id: "dreamy",
    name: "Soft lavender",
    feeling: "Tired, dreamy, a bit far away",
    color: "#9b85dd",
    wash: ["#efeafc", "#f6eefb", "#e9effc"],
    particle: "#b9a8ec",
    ambient: "stars",
    voice: "giving_up",
    game: "doodle",
    tool: "reset",
    suggestCounselor: false,
    messages: [
      "Tired is information, not failure. Rest is part of doing well.",
      "Could you lower the bar for today and still call it a win?",
      "A glass of water, some fresh air, ten slow breaths. Start there.",
      "It's okay to drift a little. Come back gently when you're ready.",
    ],
  },
  {
    id: "low",
    name: "Rainy grey",
    feeling: "Low, sad, or numb",
    color: "#8a96a3",
    wash: ["#eef1f4", "#e8ecf2", "#f1f0f6"],
    particle: "#9fb3c8",
    ambient: "rain",
    voice: "lonely",
    game: "mystery",
    tool: "reset",
    suggestCounselor: true,
    messages: [
      "You don't have to feel better right away. Feeling it is already brave.",
      "Rainy days pass, even when they feel like they won't. This one will too.",
      "Be as kind to yourself today as you'd be to a friend who felt like this.",
      "You're not too much, and you're not alone. Someone here wants to listen.",
    ],
  },
  {
    id: "fiery",
    name: "Fiery red",
    feeling: "Angry, frustrated, fed up",
    color: "#ef6a55",
    wash: ["#fde7e2", "#fff0e6", "#fbe9ef"],
    particle: "#f58b6f",
    ambient: "embers",
    voice: "overwhelmed",
    game: "smash",
    tool: "say-it",
    suggestCounselor: false,
    messages: [
      "Anger usually means something matters to you. That's worth listening to.",
      "Move your body first, decide what to say second.",
      "It's okay to be furious. It's also okay to wait before you reply.",
      "Let some of it out somewhere safe. Smash a few stress blobs, then breathe.",
    ],
  },
  {
    id: "restless",
    name: "Restless orange",
    feeling: "Anxious, worried, can't switch off",
    color: "#f39a3d",
    wash: ["#fff0dd", "#fde8e1", "#fff6e3"],
    particle: "#f7b46c",
    ambient: "swirl",
    voice: "exam",
    game: "emoji",
    tool: "untangle",
    suggestCounselor: true,
    messages: [
      "Your brain is trying to protect you. Thank it, then slow your breathing.",
      "Write the worry down. It's smaller on paper than in your head.",
      "You only need to handle the next ten minutes, not the whole week.",
      "Anxious thoughts are loud, not always right. Check what you actually know.",
    ],
  },
  {
    id: "tender",
    name: "Tender pink",
    feeling: "Sensitive, hurt, needing care",
    color: "#e86a9a",
    wash: ["#fde8f0", "#fbeef6", "#fff0ea"],
    particle: "#f29abd",
    ambient: "hearts",
    voice: "self_worth",
    game: "mystery",
    tool: "letters",
    suggestCounselor: false,
    messages: [
      "Being sensitive means you feel things deeply. That's a strength, too.",
      "You deserve the same gentleness you give to everyone else.",
      "If someone hurt you, it says more about the moment than about your worth.",
      "Wrap yourself in something soft today. You're allowed to be cared for.",
    ],
  },
  {
    id: "heavy",
    name: "Deep navy",
    feeling: "Overwhelmed, everything is too much",
    color: "#36507a",
    wash: ["#e7ecf6", "#ece9f6", "#e5f0f3"],
    particle: "#7d93bd",
    ambient: "deep",
    voice: "overwhelmed",
    game: "smash",
    tool: "reset",
    suggestCounselor: true,
    messages: [
      "When everything is too much, do one small thing. Just one.",
      "You don't have to carry all of it alone. Telling someone is a strong move.",
      "Breathe in for four, out for six. Do it three times before anything else.",
      "Today can be a survival day. That's allowed, and it still counts.",
    ],
  },
];

export const moodById = (id: string | null | undefined) => MOODS.find((m) => m.id === id) ?? null;

/**
 * Runs before the page paints so a saved mood colour shows straight away,
 * without a flash of the default background.
 */
export const MOOD_BOOT_SCRIPT = `try{var m=${JSON.stringify(
  Object.fromEntries(MOODS.map((m) => [m.id, [...m.wash, m.color]])),
)}[localStorage.getItem("btm:mood")];if(m){var r=document.documentElement;r.dataset.mood=localStorage.getItem("btm:mood");["--mood-1","--mood-2","--mood-3","--mood-color"].forEach(function(k,i){r.style.setProperty(k,m[i])})}}catch(e){}`;
