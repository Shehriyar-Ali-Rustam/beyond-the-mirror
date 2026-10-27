import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { VoicesRoute } from "@/components/voices/voices-route";

export const metadata: Metadata = { title: "Voice notes" };

export default async function CounselorVoices() {
  const viewer = await requireRole("counselor");
  return <VoicesRoute viewer={viewer} />;
}
