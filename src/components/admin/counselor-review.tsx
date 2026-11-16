"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { BadgeCheck, Briefcase, CheckCircle2, GraduationCap, Mail, Phone } from "lucide-react";
import { adminUpdateUser, adminVerifyCounselor } from "@/actions/admin";
import { expertiseLabel } from "@/lib/expertise";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type CounselorReviewRow = {
  counselor_id: string;
  full_name: string;
  username: string;
  status: string;
  has_details: boolean;
  verified: boolean;
  expertise: string[];
  experience_years: number | null;
  qualifications: string | null;
  email: string | null;
  phone: string | null;
};

function ReviewCard({ c }: { c: CounselorReviewRow }) {
  const [pending, start] = useTransition();
  const applying = c.status === "pending";
  const act = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, done: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(r.message ?? done);
      else toast.error(r.error ?? "Something went wrong.");
    });

  return (
    <li className="rounded-3xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar name={c.full_name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{c.full_name}</p>
          <p className="text-xs text-ink-3">@{c.username}</p>
        </div>
        <Badge tone={applying ? "pending" : "lilac"} dot>
          {applying ? "New application" : "Updated details"}
        </Badge>
      </div>
      {c.has_details ? (
        <dl className="mt-4 grid gap-2.5 text-sm sm:grid-cols-2">
          <div className="flex gap-2">
            <GraduationCap className="mt-0.5 size-4 shrink-0 text-ink-3" />
            <div>
              <dt className="text-xs text-ink-3">Qualifications</dt>
              <dd className="text-ink">{c.qualifications}</dd>
            </div>
          </div>
          <div className="flex gap-2">
            <Briefcase className="mt-0.5 size-4 shrink-0 text-ink-3" />
            <div>
              <dt className="text-xs text-ink-3">Experience</dt>
              <dd className="text-ink">
                {c.experience_years} {c.experience_years === 1 ? "year" : "years"}
              </dd>
            </div>
          </div>
          <div className="flex gap-2">
            <Mail className="mt-0.5 size-4 shrink-0 text-ink-3" />
            <div className="min-w-0">
              <dt className="text-xs text-ink-3">Email</dt>
              <dd className="truncate">
                <a href={`mailto:${c.email}`} className="text-primary hover:underline">
                  {c.email}
                </a>
              </dd>
            </div>
          </div>
          <div className="flex gap-2">
            <Phone className="mt-0.5 size-4 shrink-0 text-ink-3" />
            <div>
              <dt className="text-xs text-ink-3">Phone</dt>
              <dd>
                <a href={`tel:${c.phone}`} className="text-primary hover:underline">
                  {c.phone}
                </a>
              </dd>
            </div>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-ink-3">Areas of expertise</dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {c.expertise.map((e) => (
                <span key={e} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-ink-2">
                  {expertiseLabel(e)}
                </span>
              ))}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-4 rounded-2xl bg-warn-soft p-3 text-sm text-warn">This account has no professional details on file.</p>
      )}
      <p className="mt-4 text-xs text-ink-3">Check the qualifications and contact the counselor if anything is unclear before approving.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {applying ? (
          <>
            <Button size="sm" loading={pending} onClick={() => act(() => adminUpdateUser({ userId: c.counselor_id, status: "active" }), `${c.full_name} approved and verified`)}>
              <CheckCircle2 /> Approve and verify
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => act(() => adminUpdateUser({ userId: c.counselor_id, status: "suspended" }), "Application declined")}>
              Decline
            </Button>
          </>
        ) : (
          <Button size="sm" loading={pending} onClick={() => act(() => adminVerifyCounselor(c.counselor_id), "Verified")}>
            <BadgeCheck /> Verify details
          </Button>
        )}
      </div>
    </li>
  );
}

export function CounselorReview({ rows }: { rows: CounselorReviewRow[] }) {
  if (!rows.length) return null;
  return (
    <section className="mb-6" aria-labelledby="applications">
      <h2 id="applications" className="mb-3 font-display text-xl text-ink">
        Counselors to verify <span className="text-ink-3">({rows.length})</span>
      </h2>
      <ul className="grid gap-4 lg:grid-cols-2">
        {rows.map((c) => (
          <ReviewCard key={c.counselor_id} c={c} />
        ))}
      </ul>
    </section>
  );
}
