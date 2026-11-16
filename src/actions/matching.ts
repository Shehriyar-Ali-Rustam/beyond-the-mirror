"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { assertRole } from "@/lib/auth";
import { friendlyError } from "@/lib/utils";
import { analyseIntake, CONCERNS, type Risk } from "@/lib/matching";
import type { ActionResult, Category, Presence } from "@/lib/types";

export type MatchResult = {
  counselor: {
    id: string;
    full_name: string;
    title: string | null;
    avatar_hue: number;
    presence: Presence;
    expertise: string[];
    experience_years: number | null;
    qualifications: string | null;
  };
  matched: string[];
  keptCurrent: boolean;
  risk: Risk;
  urgent: boolean;
  category: Category;
};

const schema = z.object({
  concern: z.enum(CONCERNS.map((c) => c.id) as [string, ...string[]]),
  details: z.array(z.string().max(24)).max(8),
  note: z.string().trim().max(1000),
});

/**
 * Reads what the student shared (nothing is stored except the topic), then
 * lets the database pick the best verified counselor for it.
 */
export async function findCounselor(input: { concern: string; details: string[]; note: string }): Promise<ActionResult<MatchResult>> {
  await assertRole("student");
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please choose what's going on first." };
  const intake = analyseIntake({ concern: parsed.data.concern as never, details: parsed.data.details, note: parsed.data.note });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_counselor", {
    p_concern: intake.concern.id,
    p_weights: intake.weights,
    p_urgent: intake.urgent,
  });
  if (error) return { ok: false, error: friendlyError(error) };
  const row = data?.[0];
  if (!row) return { ok: false, error: "No verified counselor is available yet. Please try again a little later." };

  revalidatePath("/student", "layout");
  return {
    ok: true,
    data: {
      counselor: {
        id: row.counselor_id,
        full_name: row.full_name,
        title: row.title,
        avatar_hue: row.avatar_hue,
        presence: row.presence,
        expertise: row.expertise ?? [],
        experience_years: row.experience_years,
        qualifications: row.qualifications,
      },
      matched: row.matched ?? [],
      keptCurrent: row.kept_current,
      risk: intake.risk,
      urgent: intake.urgent,
      category: intake.category,
    },
  };
}
