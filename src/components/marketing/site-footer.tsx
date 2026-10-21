import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { CRISIS } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-bg-deep/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-2">
            A private space for students to reach their school counselor — and for counselors to keep up with everyone who
            needs them.
          </p>
          <p className="mt-6 max-w-sm rounded-2xl bg-danger-soft/60 px-4 py-3 text-xs leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">Not an emergency service.</span> If you or someone else is in
            immediate danger, contact {CRISIS.number ? `${CRISIS.name} on ${CRISIS.number}` : "your local emergency services"} or a trusted adult now.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Platform</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-2">
            <li><Link href="/#how" className="hover:text-ink">How it works</Link></li>
            <li><Link href="/toolkit" className="hover:text-ink">Self-help toolkit</Link></li>
            <li><Link href="/#privacy" className="hover:text-ink">Privacy &amp; confidentiality</Link></li>
            <li><Link href="/#faq" className="hover:text-ink">Questions</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Accounts</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-2">
            <li><Link href="/register" className="hover:text-ink">Student sign-up</Link></li>
            <li><Link href="/register?role=counselor" className="hover:text-ink">Counselor sign-up</Link></li>
            <li><Link href="/login" className="hover:text-ink">Log in</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-5 py-5 text-xs text-ink-3 sm:px-8">
          © {new Date().getFullYear()} Beyond the Mirror · Built for school counseling teams.
        </p>
      </div>
    </footer>
  );
}
