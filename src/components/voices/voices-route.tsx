import { getMyVoiceNotes, getReviewQueue, getVoiceLibrary } from "@/lib/voices";
import { firstName } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { VoicesPage } from "./voices-page";

export async function VoicesRoute({ viewer }: { viewer: Profile }) {
  const staff = viewer.role === "counselor" || viewer.role === "admin";
  const [library, mine, queue] = await Promise.all([getVoiceLibrary(), getMyVoiceNotes(), staff ? getReviewQueue() : null]);
  return <VoicesPage role={viewer.role} firstName={firstName(viewer.full_name)} library={library} mine={mine} queue={queue} />;
}
