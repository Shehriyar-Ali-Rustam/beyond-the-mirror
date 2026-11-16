import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/visual/page-hero";
import { GratitudeWall } from "@/components/wellbeing/gratitude";

export const metadata: Metadata = { title: "Gratitude Wall" };

export default async function StaffGratitude({ searchParams }: PageProps<"/admin/gratitude">) {
  const viewer = await requireRole("admin");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.rpc("gratitude_feed", { p_limit: 50 });
  return (
    <div className="mx-auto max-w-6xl">
      <PageHero
        illustration="showing-support"
        tone="rose"
        title="Gratitude Wall"
        description="Students share appreciation, small wins and kindness here. Posts with personal details, links or hurtful language are held for you to review, and reported posts appear under Needs review."
      />
      <GratitudeWall initial={data ?? []} role={viewer.role} initialFilter={typeof sp.filter === "string" ? sp.filter : undefined} />
    </div>
  );
}
