import { HeartHandshake, ImageOff, LifeBuoy, ShieldCheck, Sparkles, VenetianMask } from "lucide-react";
import { getFeed } from "@/lib/community";
import type { Profile } from "@/lib/types";
import { FloatingShapes } from "@/components/illustrations/scenes";
import { ArchPhoto } from "@/components/visual/arch-photo";
import { Composer } from "./composer";
import { Feed } from "./feed";

const GUIDELINES = [
  { icon: HeartHandshake, text: "Be kind. Everyone here is figuring things out.", tone: "bg-rose-soft text-rose" },
  { icon: VenetianMask, text: "Don't name or describe other people, and keep your own details private.", tone: "bg-lilac-soft text-lilac" },
  { icon: ImageOff, text: "Only share photos you took. No faces of others, no screenshots of chats.", tone: "bg-sky-soft text-sky" },
  { icon: LifeBuoy, text: "This isn't for emergencies. If someone is in danger, tell a trusted adult now.", tone: "bg-coral-soft text-coral" },
];

export async function CommunityPage({ viewer }: { viewer: Profile }) {
  const posts = await getFeed();
  const canPost = viewer.role === "student" || viewer.role === "counselor";

  return (
    <div className="mx-auto max-w-6xl">
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-sun-soft via-rose-soft to-sky-soft p-6 sm:p-8">
        <FloatingShapes className="absolute -right-6 -top-6 size-72 opacity-60" />
        <div className="relative grid items-center gap-4 sm:grid-cols-[1fr_auto]">
          <div className="max-w-xl animate-fade-up">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-surface/80 px-3 py-1 text-xs font-semibold text-coral backdrop-blur">
              <Sparkles className="size-3.5" /> Community board
            </p>
            <h1 className="mt-3 font-display text-[2rem] leading-tight text-ink sm:text-[2.4rem]">Ask, share, and lift each other up</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
              Post a question and get suggestions from other students and counselors, or share something good. Add a photo if it
              helps tell the story.
            </p>
          </div>
          <div className="relative hidden h-48 w-56 sm:block">
            <ArchPhoto name="friendsBench" tone="sun" sizes="140px" className="absolute left-0 top-0 h-44 w-32 -rotate-3" />
            <ArchPhoto name="heartHands" tone="rose" sizes="110px" className="absolute bottom-0 right-0 h-32 w-24 rotate-6" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          {canPost && <Composer name={viewer.full_name} hue={viewer.avatar_hue} role={viewer.role as "student" | "counselor"} />}
          <Feed initialPosts={posts} viewer={{ role: viewer.role }} />
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
            <p className="flex items-center gap-2 font-medium text-ink">
              <ShieldCheck className="size-4 text-primary" /> Community guidelines
            </p>
            <ul className="mt-4 space-y-3">
              {GUIDELINES.map((g) => (
                <li key={g.text} className="flex gap-3 text-sm leading-relaxed text-ink-2">
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${g.tone}`}>
                    <g.icon className="size-4" />
                  </span>
                  {g.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-line bg-surface p-5 text-sm leading-relaxed text-ink-2 shadow-sm">
            <p className="font-medium text-ink">Moderated by your counselors</p>
            <p className="mt-1">
              Anything can be reported from its menu. Counselors review reports, and posts reported by several people are hidden
              until they do.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
