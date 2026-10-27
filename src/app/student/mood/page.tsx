import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { MoodPortal } from "@/components/mood/mood-portal";

export const metadata: Metadata = { title: "Mood Portal" };

export default async function StudentMood() {
  await requireRole("student");
  return <MoodPortal student voicesHref="/student/voices" playBase="/student/play" toolkitBase="/student/toolkit" />;
}
