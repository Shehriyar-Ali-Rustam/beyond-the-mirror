import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Lock, Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { MatchFlow } from "@/components/student/match-flow";

export const metadata: Metadata = { title: "Find your counselor" };

export default async function MatchPage() {
  const viewer = await requireRole("student");
  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/student" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" /> Home
      </Link>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <MatchFlow hasCounselor={!!viewer.counselor_id} />
        <aside className="space-y-4">
          {[
            { icon: Sparkles, title: "Matched to you", body: "Your answers are compared with each counselor's areas of expertise, experience and availability." },
            { icon: BadgeCheck, title: "Verified counselors only", body: "Every counselor's qualifications are checked by your school before they can be matched with anyone." },
            { icon: Lock, title: "Private", body: "No outside AI service is used. Only the kind of support you need is recorded, never what you wrote." },
          ].map((c) => (
            <div key={c.title} className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
              <p className="flex items-center gap-2 font-medium text-ink">
                <c.icon className="size-4 text-primary" /> {c.title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{c.body}</p>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
