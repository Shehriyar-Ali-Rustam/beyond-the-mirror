import { DatabaseZap } from "lucide-react";
import type { DbStatus } from "@/lib/db-status";

const OWNER_HELP: Record<Exclude<DbStatus, "ready">, string> = {
  unconfigured: "Connect a Supabase database to this project (Vercel → Storage → Supabase), then redeploy.",
  "no-service-key":
    "The database is connected, but the server key is missing. Add SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) in Vercel → Settings → Environment Variables, then redeploy.",
  "missing-tables":
    "The database is connected, but its tables couldn't be created automatically. Check the deployment's function logs for “[migrate]”, or run the files in supabase/migrations in Supabase's SQL Editor.",
};

/** Shown on auth pages until the database is ready to use. */
export function SetupNotice({ status }: { status: Exclude<DbStatus, "ready"> }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-warn-soft text-warn">
        <DatabaseZap className="size-5" />
      </span>
      <p className="mt-4 font-display text-xl text-ink">We&apos;re almost ready</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">
        Accounts aren&apos;t available yet because this site&apos;s database isn&apos;t set up. The self-help toolkit works
        in the meantime, no account needed.
      </p>
      <p className="mt-4 rounded-2xl bg-surface-2 px-4 py-3 text-xs leading-relaxed text-ink-3">
        <span className="font-medium text-ink-2">Site owner:</span> {OWNER_HELP[status]}
      </p>
    </div>
  );
}
