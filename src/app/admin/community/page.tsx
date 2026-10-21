import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { CommunityPage } from "@/components/community/community-page";

export const metadata: Metadata = { title: "Community" };

export default async function AdminCommunity() {
  const viewer = await requireRole("admin");
  return <CommunityPage viewer={viewer} />;
}
