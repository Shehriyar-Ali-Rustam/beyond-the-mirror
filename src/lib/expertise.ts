export const EXPERTISE_AREAS = [
  "academic",
  "family",
  "friendships",
  "bullying",
  "anxiety",
  "low_mood",
  "self_esteem",
  "grief",
  "career",
  "anger",
] as const;
export type ExpertiseArea = (typeof EXPERTISE_AREAS)[number];

export const EXPERTISE: Record<ExpertiseArea, { label: string; tone: string }> = {
  academic: { label: "Academic & exam stress", tone: "bg-sun-soft text-[#8a5a00]" },
  family: { label: "Family issues", tone: "bg-mint-soft text-[#1f7a5f]" },
  friendships: { label: "Friendships & relationships", tone: "bg-rose-soft text-[#b23a6a]" },
  bullying: { label: "Bullying (in person & online)", tone: "bg-coral-soft text-[#b4452f]" },
  anxiety: { label: "Anxiety & overthinking", tone: "bg-sky-soft text-[#246aa6]" },
  low_mood: { label: "Low mood & emotional exhaustion", tone: "bg-grape-soft text-grape" },
  self_esteem: { label: "Self-esteem & confidence", tone: "bg-lilac-soft text-lilac" },
  grief: { label: "Grief & loss", tone: "bg-surface-2 text-ink-2" },
  career: { label: "Career & future planning", tone: "bg-primary-soft text-primary-soft-ink" },
  anger: { label: "Anger & behaviour", tone: "bg-coral-soft text-[#b4452f]" },
};

export const expertiseLabel = (id: string) => EXPERTISE[id as ExpertiseArea]?.label ?? id;
