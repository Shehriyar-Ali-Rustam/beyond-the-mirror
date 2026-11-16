import { BEHAVIOURS, FEELINGS, STRESS_SOURCES, type Behaviour, type Feeling, type StressSource } from "@/lib/wellbeing";

/**
 * Pattern spotting for the personal toolkit. Runs on the student's own records,
 * in their browser, and produces plain-language observations, never diagnoses.
 */

export type BehaviourLog = {
  id: string;
  logged_on: string;
  behaviour: Behaviour;
  label: string | null;
  hours: number | null;
  before_context: string | null;
  feeling: Feeling | null;
  after_effect: string | null;
  impact: number | null;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayOf = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};
const top = <T,>(counts: Map<T, number>) => [...counts.entries()].sort((a, b) => b[1] - a[1]);
const bump = <T,>(m: Map<T, number>, k: T, by = 1) => m.set(k, (m.get(k) ?? 0) + by);
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

export function behaviourInsights(logs: BehaviourLog[]) {
  const notes: { tone: "neutral" | "warn" | "good"; text: string }[] = [];
  if (logs.length < 3) return { notes, questions: [] as string[] };

  const byBehaviour = new Map<Behaviour, number>();
  logs.forEach((l) => bump(byBehaviour, l.behaviour));
  const [mostCommon] = top(byBehaviour);
  if (mostCommon) notes.push({ tone: "neutral", text: `You log ${BEHAVIOURS[mostCommon[0]].label.toLowerCase()} most often (${mostCommon[1]} times).` });

  // Which behaviour tends to leave them feeling worse or better afterwards?
  const impact = new Map<Behaviour, number[]>();
  logs.forEach((l) => l.impact != null && impact.set(l.behaviour, [...(impact.get(l.behaviour) ?? []), l.impact]));
  const effects = [...impact.entries()].filter(([, xs]) => xs.length >= 2).map(([b, xs]) => [b, avg(xs)!] as const);
  const worst = effects.filter(([, v]) => v <= -0.5).sort((a, b) => a[1] - b[1])[0];
  const best = effects.filter(([, v]) => v >= 0.5).sort((a, b) => b[1] - a[1])[0];
  if (worst) notes.push({ tone: "warn", text: `${BEHAVIOURS[worst[0]].label} usually leaves you feeling worse afterwards.` });
  if (best) notes.push({ tone: "good", text: `${BEHAVIOURS[best[0]].label} usually leaves you feeling better. Worth protecting time for.` });

  // What feeling comes before avoidance?
  const avoid = logs.filter((l) => l.behaviour === "avoidance");
  if (avoid.length >= 2) {
    const before = new Map<Feeling, number>();
    avoid.forEach((l) => l.feeling && bump(before, l.feeling));
    const [f] = top(before);
    if (f && f[1] >= 2) notes.push({ tone: "warn", text: `When you put tasks off, you were usually feeling ${FEELINGS[f[0]].label.toLowerCase()} beforehand.` });
    else notes.push({ tone: "warn", text: `You've logged putting tasks off ${avoid.length} times. Notice what tends to come just before it.` });
  }

  // A day of the week that keeps coming up with difficult feelings.
  const hardDays = new Map<number, number>();
  logs.forEach((l) => l.feeling && !FEELINGS[l.feeling].positive && bump(hardDays, dayOf(l.logged_on)));
  const [hard] = top(hardDays);
  if (hard && hard[1] >= 3) notes.push({ tone: "neutral", text: `${DAY_NAMES[hard[0]]}s show up most with difficult feelings.` });

  const sleep = avg(logs.filter((l) => l.behaviour === "sleep" && l.hours != null).map((l) => Number(l.hours)));
  if (sleep != null) notes.push({ tone: sleep < 7 ? "warn" : "good", text: `Average sleep logged: ${sleep} hours${sleep < 7 ? ", below the 8 to 10 hours most teenagers need" : ""}.` });
  const screen = avg(logs.filter((l) => l.behaviour === "screen_time" && l.hours != null).map((l) => Number(l.hours)));
  if (screen != null && screen >= 4) notes.push({ tone: "warn", text: `Screen time sessions average ${screen} hours.` });

  const questions = [
    worst ? `What do you usually hope ${BEHAVIOURS[worst[0]].label.toLowerCase()} will give you, and does it?` : null,
    avoid.length >= 2 ? "What is the smallest first step on the task you most often put off?" : null,
    best ? `What makes it hard to make time for ${BEHAVIOURS[best[0]].label.toLowerCase()}?` : null,
    "Which pattern here surprised you the most?",
    "If a friend showed you these patterns, what would you suggest to them?",
  ].filter(Boolean) as string[];
  return { notes, questions: questions.slice(0, 3) };
}

/** Counts per behaviour inside a date window (inclusive keys). */
export function behaviourReport(logs: BehaviourLog[], from: string, to: string) {
  const inRange = logs.filter((l) => l.logged_on >= from && l.logged_on <= to);
  const counts = new Map<Behaviour, number>();
  inRange.forEach((l) => bump(counts, l.behaviour));
  const impacts = inRange.filter((l) => l.impact != null).map((l) => l.impact!);
  return {
    total: inRange.length,
    counts: top(counts),
    better: impacts.filter((i) => i > 0).length,
    worse: impacts.filter((i) => i < 0).length,
    sleep: avg(inRange.filter((l) => l.behaviour === "sleep" && l.hours != null).map((l) => Number(l.hours))),
  };
}

// --------------------------------------------------------------------- stress
export type StressEntry = {
  id: string;
  entry_on: string;
  sources: StressSource[];
  other_source: string | null;
  intensity: number;
  frequency: string;
  impact_concentration: number;
  impact_sleep: number;
  impact_motivation: number;
  impact_relationships: number;
  impact_daily: number;
  triggers: string | null;
  helped: string | null;
};

export function stressInsights(entries: StressEntry[]) {
  const sources = new Map<StressSource, number>();
  entries.forEach((e) => e.sources.forEach((s) => bump(sources, s)));
  const ranked = top(sources);
  const recurring = ranked.filter(([, n]) => n >= 2).map(([s]) => s);
  const impacts = {
    Concentration: avg(entries.map((e) => e.impact_concentration)) ?? 0,
    Sleep: avg(entries.map((e) => e.impact_sleep)) ?? 0,
    Motivation: avg(entries.map((e) => e.impact_motivation)) ?? 0,
    Relationships: avg(entries.map((e) => e.impact_relationships)) ?? 0,
    "Daily activities": avg(entries.map((e) => e.impact_daily)) ?? 0,
  };
  const mostAffected = Object.entries(impacts).sort((a, b) => b[1] - a[1])[0];
  const recent = entries.slice(0, 5);
  const older = entries.slice(5, 10);
  const recentAvg = avg(recent.map((e) => e.intensity));
  const olderAvg = avg(older.map((e) => e.intensity));
  const trend = recentAvg != null && olderAvg != null ? (recentAvg > olderAvg + 0.4 ? "up" : recentAvg < olderAvg - 0.4 ? "down" : "steady") : null;
  const high = entries.filter((e) => e.intensity >= 4).length;
  const daily = entries.filter((e) => e.frequency === "daily" || e.frequency === "often").length;

  const summary: string[] = [];
  if (ranked[0]) summary.push(`Your most frequent source of stress is ${STRESS_SOURCES[ranked[0][0]].toLowerCase()} (${ranked[0][1]} of ${entries.length} entries).`);
  if (recurring.length > 1) summary.push(`Recurring together: ${recurring.slice(0, 3).map((s) => STRESS_SOURCES[s].toLowerCase()).join(", ")}.`);
  if (mostAffected && mostAffected[1] >= 1) summary.push(`Stress affects your ${mostAffected[0].toLowerCase()} the most.`);
  if (trend === "up") summary.push("Your recent entries are more intense than earlier ones.");
  if (trend === "down") summary.push("Your recent entries are less intense than earlier ones.");
  const suggestSupport = high >= 3 || (recentAvg ?? 0) >= 4 || daily >= 4;
  return { ranked, recurring, impacts, trend, recentAvg, summary, suggestSupport };
}
