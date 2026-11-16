import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WellbeingShell } from "@/components/wellbeing/shell";
import { GratitudeWall } from "@/components/wellbeing/gratitude";

export const metadata: Metadata = { title: "Gratitude Wall" };

export default async function GratitudePage() {
  const viewer = await requireRole("student");
  const supabase = await createClient();
  const { data } = await supabase.rpc("gratitude_feed", { p_limit: 20 });
  return (
    <WellbeingShell slug="gratitude" privacy="Shared with students and counselors at your school. Post anonymously if you prefer.">
      <GratitudeWall initial={data ?? []} role={viewer.role} />
    </WellbeingShell>
  );
}
