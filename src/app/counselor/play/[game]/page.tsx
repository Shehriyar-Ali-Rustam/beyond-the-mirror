import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { gameBySlug } from "@/lib/games";
import { GameView } from "@/components/play/play-views";

export async function generateMetadata({ params }: PageProps<"/counselor/play/[game]">): Promise<Metadata> {
  return { title: gameBySlug((await params).game)?.title ?? "Reset Zone" };
}

export default async function CounselorGame({ params }: PageProps<"/counselor/play/[game]">) {
  await requireRole("counselor");
  const game = gameBySlug((await params).game);
  if (!game) notFound();
  return <GameView slug={game.slug} base="/counselor/play" role="counselor" />;
}
