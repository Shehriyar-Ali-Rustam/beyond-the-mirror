import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { MoodPortal } from "@/components/mood/mood-portal";

export const metadata: Metadata = {
  title: "The Mood Portal",
  description: "Pick a colour that matches your mood. The site changes with you and suggests a voice note, a game, breathing or a kind message.",
};

export default async function PublicMood() {
  const viewer = await getViewer();
  const active = viewer?.status === "active" ? viewer : null;
  if (active?.role === "student") redirect("/student/mood");
  return (
    <div className="px-5 py-10 sm:px-8 sm:py-14">
      <MoodPortal
        student={false}
        voicesHref={active ? `/${active.role}/voices` : null}
        playBase={active ? `/${active.role}/play` : "/play"}
        toolkitBase="/toolkit"
      />
    </div>
  );
}
