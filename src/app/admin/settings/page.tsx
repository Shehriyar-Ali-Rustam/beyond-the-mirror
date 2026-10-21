import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { StaffSettingsPage } from "@/components/settings/staff-settings-page";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettings() {
  const viewer = await requireRole("admin");
  return <StaffSettingsPage viewer={viewer} />;
}
