import { DatabaseZap } from "lucide-react";

/** Shown on auth pages while the deployment has no database configured. */
export function SetupNotice() {
  return (
    <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-warn-soft text-warn">
        <DatabaseZap className="size-5" />
      </span>
      <p className="mt-4 font-display text-xl text-ink">We&apos;re almost ready</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">
        Accounts aren&apos;t available yet because this site&apos;s database hasn&apos;t been connected. The self-help
        toolkit works in the meantime — no account needed.
      </p>
      <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-xs leading-relaxed text-ink-3">
        <span className="font-medium text-ink-2">Site owner:</span> connect Supabase to this project (Vercel → Storage)
        and set <code>ADMIN_PASSWORD</code>, then redeploy. See the README.
      </p>
    </div>
  );
}
