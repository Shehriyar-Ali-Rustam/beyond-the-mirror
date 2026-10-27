import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { GAMES, gameBySlug } from "@/lib/games";
import { GameView } from "@/components/play/play-views";

export function generateStaticParams() {
  return GAMES.map((g) => ({ game: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/play/[game]">): Promise<Metadata> {
  const g = gameBySlug((await params).game);
  return { title: g?.title ?? "Reset Zone", description: g?.description };
}

export default async function PublicGame({ params }: PageProps<"/play/[game]">) {
  const game = gameBySlug((await params).game);
  if (!game) notFound();
  // The Doodle Wall needs an account, so signed-in people get their own version.
  if (game.slug === "doodle") {
    const viewer = await getViewer();
    if (viewer && viewer.status === "active") redirect(`/${viewer.role}/play/doodle`);
  }
  return (
    <div className="px-5 py-10 sm:px-8 sm:py-14">
      <GameView slug={game.slug} base="/play" role={null} />
    </div>
  );
}
