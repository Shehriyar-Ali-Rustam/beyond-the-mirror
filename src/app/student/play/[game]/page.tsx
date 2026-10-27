import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { gameBySlug } from "@/lib/games";
import { GameView } from "@/components/play/play-views";

export async function generateMetadata({ params }: PageProps<"/student/play/[game]">): Promise<Metadata> {
  return { title: gameBySlug((await params).game)?.title ?? "Reset Zone" };
}

export default async function StudentGame({ params }: PageProps<"/student/play/[game]">) {
  await requireRole("student");
  const game = gameBySlug((await params).game);
  if (!game) notFound();
  return <GameView slug={game.slug} base="/student/play" role="student" />;
}
