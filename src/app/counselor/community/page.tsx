import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { CommunityPage } from "@/components/community/community-page";

export const metadata: Metadata = { title: "Community" };

export default async function CounselorCommunity() {
  const viewer = await requireRole("counselor");
  return <CommunityPage viewer={viewer} />;
}
