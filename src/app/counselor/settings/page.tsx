import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StaffSettingsPage } from "@/components/settings/staff-settings-page";

export const metadata: Metadata = { title: "Settings" };

export default async function CounselorSettings() {
  const viewer = await requireRole("counselor");
  const supabase = await createClient();
  const { data: credentials } = await supabase
    .from("counselor_credentials")
    .select("qualifications, experience_years, email, phone, expertise, verified_at")
    .eq("counselor_id", viewer.id)
    .maybeSingle();
  return <StaffSettingsPage viewer={viewer} credentials={credentials} />;
}
