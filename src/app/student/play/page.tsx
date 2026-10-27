import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { PlayHub } from "@/components/play/play-views";

export const metadata: Metadata = { title: "Reset Zone" };

export default async function StudentPlay() {
  await requireRole("student");
  return <PlayHub base="/student/play" role="student" />;
}
