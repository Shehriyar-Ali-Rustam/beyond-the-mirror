export type GameSlug = "smash" | "wheel" | "mystery" | "doodle" | "emoji";

export const GAMES: {
  slug: GameSlug;
  title: string;
  tagline: string;
  description: string;
  emoji: string;
  gradient: string;
  accent: string;
}[] = [
  {
    slug: "smash",
    title: "Smash the Stress",
    tagline: "Tap fast, feel lighter",
    description: "Stress monsters keep popping up. Tap them before they hide and rack up points in 30 seconds.",
    emoji: "💥",
    gradient: "from-coral-soft via-sun-soft to-rose-soft",
    accent: "#ef6a55",
  },
  {
    slug: "wheel",
    title: "Spin the Fun Wheel",
    tagline: "A tiny challenge, right now",
    description: "Spin for a quick, silly or kind challenge. Dance break? Compliment a friend? Let the wheel decide.",
    emoji: "🎡",
    gradient: "from-sky-soft via-mint-soft to-sun-soft",
    accent: "#2f7cc0",
  },
  {
    slug: "mystery",
    title: "Mystery Box",
    tagline: "What's inside?",
    description: "Open a box for a joke, a sticker for your collection, a kind message or a mini challenge.",
    emoji: "🎁",
    gradient: "from-rose-soft via-lilac-soft to-sky-soft",
    accent: "#c94a7c",
  },
  {
    slug: "doodle",
    title: "Doodle & Guess",
    tagline: "Draw it, guess it",
    description: "Guess what our ready-made doodles are, draw your own for others to guess, and try the Doodle Wall.",
    emoji: "🖍️",
    gradient: "from-lilac-soft via-grape-soft to-rose-soft",
    accent: "#7552c4",
  },
  {
    slug: "emoji",
    title: "Guess the Emoji",
    tagline: "Movies, foods, animals & phrases",
    description: "Work out what the emojis mean. Three levels, from easy warm-ups to proper head-scratchers.",
    emoji: "🤔",
    gradient: "from-sun-soft via-coral-soft to-mint-soft",
    accent: "#a26a00",
  },
];

export const gameBySlug = (slug: string) => GAMES.find((g) => g.slug === slug);
