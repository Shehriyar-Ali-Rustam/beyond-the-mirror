import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { CommunityPage } from "@/components/community/community-page";

export const metadata: Metadata = { title: "Community" };

export default async function StudentCommunity() {
  const viewer = await requireRole("student");
  return <CommunityPage viewer={viewer} />;
}
