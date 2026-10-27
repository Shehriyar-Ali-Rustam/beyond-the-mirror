import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { VoicesRoute } from "@/components/voices/voices-route";

export const metadata: Metadata = { title: "Voice notes" };

export default async function AdminVoices() {
  const viewer = await requireRole("admin");
  return <VoicesRoute viewer={viewer} />;
}
