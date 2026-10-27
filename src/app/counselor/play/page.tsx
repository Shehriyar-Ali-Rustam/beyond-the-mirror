import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { PlayHub } from "@/components/play/play-views";

export const metadata: Metadata = { title: "Reset Zone" };

export default async function CounselorPlay() {
  await requireRole("counselor");
  return <PlayHub base="/counselor/play" role="counselor" />;
}
