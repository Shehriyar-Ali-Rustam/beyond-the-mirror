import { Feather, GraduationCap, HeartHandshake, MessageSquareQuote, Palette, Scale, Wind, type LucideIcon } from "lucide-react";

export type ToolSlug = "feelings" | "untangle" | "reset" | "exams" | "say-it" | "situations" | "letters";

export const TOOLS: {
  slug: ToolSlug;
  title: string;
  tagline: string;
  description: string;
  minutes: string;
  icon: LucideIcon;
  hue: number;
}[] = [
  {
    slug: "feelings",
    title: "Name the feeling",
    tagline: "When you can't tell what's wrong",
    description: "Pick the words that fit right now and see what might be underneath — plus one small thing that could help.",
    minutes: "2 min",
    icon: Palette,
    hue: 280,
  },
  {
    slug: "untangle",
    title: "Untangle a thought",
    tagline: "For overthinking and what-ifs",
    description: "Write the thought down, separate what you know from what you fear, and find one next step.",
    minutes: "5 min",
    icon: Scale,
    hue: 200,
  },
  {
    slug: "reset",
    title: "Bad-day reset",
    tagline: "When everything feels like too much",
    description: "Slow breathing, a grounding exercise, and a short list of gentle next steps.",
    minutes: "3 min",
    icon: Wind,
    hue: 160,
  },
  {
    slug: "exams",
    title: "Exam stress kit",
    tagline: "Results, revision, and pressure",
    description: "A calm-down routine, a realistic revision plan builder, and words for talking to family about marks.",
    minutes: "5–10 min",
    icon: GraduationCap,
    hue: 30,
  },
  {
    slug: "say-it",
    title: "What should I say?",
    tagline: "Scripts for hard conversations",
    description: "Saying no, apologising, asking for help, fixing an argument — ready-to-adapt messages.",
    minutes: "2 min",
    icon: MessageSquareQuote,
    hue: 240,
  },
  {
    slug: "situations",
    title: "Friends, family & bullying",
    tagline: "Practical steps for tricky situations",
    description: "Choose what's happening and get clear, safe suggestions — including how to document bullying.",
    minutes: "3 min",
    icon: HeartHandshake,
    hue: 345,
  },
  {
    slug: "letters",
    title: "Letters you won't send",
    tagline: "Say it all, privately",
    description: "Write to someone without sending it. Stays on this device only — never uploaded, never shared.",
    minutes: "Any time",
    icon: Feather,
    hue: 100,
  },
];

export const toolBySlug = (slug: string) => TOOLS.find((t) => t.slug === slug);

export const CHECK_INS: { label: string; tool: ToolSlug }[] = [
  { label: "I don't know what I'm feeling", tool: "feelings" },
  { label: "I can't stop overthinking", tool: "untangle" },
  { label: "Today is just too much", tool: "reset" },
  { label: "Exams are getting to me", tool: "exams" },
  { label: "Something's off with friends or family", tool: "situations" },
  { label: "I need to say something hard", tool: "say-it" },
];
