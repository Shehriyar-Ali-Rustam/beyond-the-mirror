"use client";

import type { Doodle } from "@/lib/doodles";
import type { GameSlug } from "@/lib/games";
import type { Role } from "@/lib/types";
import { SmashGame } from "./smash";
import { WheelGame } from "./wheel";
import { MysteryGame } from "./mystery";
import { EmojiGame } from "./emoji-game";
import { DoodleGame } from "./doodle-game";

export function GameRenderer({ slug, role, wall }: { slug: GameSlug; role: Role | null; wall: Doodle[] | null }) {
  switch (slug) {
    case "smash":
      return <SmashGame />;
    case "wheel":
      return <WheelGame />;
    case "mystery":
      return <MysteryGame />;
    case "emoji":
      return <EmojiGame />;
    case "doodle":
      return <DoodleGame role={role} wall={wall} />;
  }
}
