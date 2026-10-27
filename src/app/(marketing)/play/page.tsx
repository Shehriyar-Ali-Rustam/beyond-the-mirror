import type { Metadata } from "next";
import { PlayHub } from "@/components/play/play-views";

export const metadata: Metadata = {
  title: "The Little Reset Zone",
  description: "Five quick, mood-boosting games for a study break: Smash the Stress, Spin the Fun Wheel, Mystery Box, Doodle & Guess and Guess the Emoji.",
};

export default function PublicPlay() {
  return (
    <div className="px-5 py-10 sm:px-8 sm:py-14">
      <PlayHub base="/play" role={null} />
    </div>
  );
}
