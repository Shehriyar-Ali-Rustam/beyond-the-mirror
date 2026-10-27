import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { VoicesRoute } from "@/components/voices/voices-route";

export const metadata: Metadata = { title: "Voice notes" };

export default async function StudentVoices() {
  const viewer = await requireRole("student");
  return <VoicesRoute viewer={viewer} />;
}
