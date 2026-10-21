import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { AnnouncementsPage } from "@/components/staff/announcements-page";

export const metadata: Metadata = { title: "Announcements" };

export default async function CounselorAnnouncements() {
  const viewer = await requireRole("counselor");
  return <AnnouncementsPage viewer={viewer} />;
}
