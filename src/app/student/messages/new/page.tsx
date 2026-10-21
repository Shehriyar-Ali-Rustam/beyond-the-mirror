import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getCounselor } from "@/lib/queries";
import { categorySchema } from "@/lib/validation";
import { NewRequestForm } from "@/components/student/new-request-form";
import { Avatar } from "@/components/ui/avatar";
import { PresenceDot } from "@/components/shared/counselor-card";
import { PRESENCE } from "@/lib/constants";

export const metadata: Metadata = { title: "New message" };

export default async function NewRequestPage({ searchParams }: PageProps<"/student/messages/new">) {
  const viewer = await requireRole("student");
  const counselor = await getCounselor(viewer.counselor_id);
  const sp = await searchParams;
  const category = categorySchema.safeParse(sp.category);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/student/messages" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" /> Messages
      </Link>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="animate-fade-up">
          <h1 className="font-display text-[2rem] leading-tight text-ink">Start a conversation</h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-2">
            Say as much or as little as you like. Your counselor can always ask follow-up questions.
          </p>
          <div className="mt-8">
            <NewRequestForm
              initialCategory={category.success ? category.data : undefined}
              whatsapp={counselor?.whatsapp ?? null}
            />
          </div>
        </div>

        <aside className="space-y-4 lg:pt-24">
          <div className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-3">Who reads this</p>
            {counselor ? (
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={counselor.full_name} hue={counselor.avatar_hue} />
                <div>
                  <p className="font-medium text-ink">{counselor.full_name}</p>
                  <p className="flex items-center gap-1.5 text-xs text-ink-2">
                    <PresenceDot presence={counselor.presence} className="scale-75" /> {PRESENCE[counselor.presence].label}
                    {counselor.office_hours ? ` · ${counselor.office_hours}` : ""}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-ink-2">
                You&apos;ll be connected to an available counselor as soon as you send this.
              </p>
            )}
          </div>
          <div className="rounded-3xl border border-line bg-surface p-5 text-sm shadow-sm">
            <p className="flex items-center gap-2 font-medium text-ink">
              <ShieldCheck className="size-4 text-primary" /> How privacy works
            </p>
            <ul className="mt-3 space-y-2.5 leading-relaxed text-ink-2">
              <li className="flex gap-2">
                <Eye className="mt-0.5 size-3.5 shrink-0 text-ok" /> Only your counselor can read this conversation.
              </li>
              <li className="flex gap-2">
                <EyeOff className="mt-0.5 size-3.5 shrink-0 text-ink-3" /> School admins, teachers and other students
                cannot.
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-clay" />
                If you or someone else might be at serious risk, your counselor may need to involve others to keep you
                safe. They&apos;ll talk to you about it first whenever they can.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
