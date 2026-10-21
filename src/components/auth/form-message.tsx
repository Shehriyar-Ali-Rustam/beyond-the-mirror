import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ActionResult } from "@/lib/types";

export function FormMessage({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  if (state.ok && !state.message) return null;
  const ok = state.ok;
  return (
    <div
      role={ok ? "status" : "alert"}
      className={`flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm ${
        ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"
      }`}
    >
      {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
      <span>{ok ? state.message : state.error}</span>
    </div>
  );
}
