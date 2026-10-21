import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { AnnouncementsPage } from "@/components/staff/announcements-page";

export const metadata: Metadata = { title: "Announcements" };

export default async function AdminAnnouncements() {
  const viewer = await requireRole("admin");
  return <AnnouncementsPage viewer={viewer} />;
}
