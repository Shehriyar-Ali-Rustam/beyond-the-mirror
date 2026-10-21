import { LifeBuoy } from "lucide-react";
import { CRISIS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SafetyNote({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex gap-3 rounded-2xl border border-danger/20 bg-danger-soft/60 p-4 text-sm", className)}>
      <LifeBuoy className="mt-0.5 size-4 shrink-0 text-danger" />
      <div className="leading-relaxed text-ink-2">
        <p className="font-medium text-ink">If you&apos;re in danger or might hurt yourself, don&apos;t wait for a reply.</p>
        {!compact && (
          <p className="mt-1">
            Messages here aren&apos;t monitored around the clock. Tell a trusted adult nearby, or contact{" "}
            {CRISIS.number ? (
              <a href={`tel:${CRISIS.number}`} className="font-semibold text-danger underline-offset-2 hover:underline">
                {CRISIS.name} ({CRISIS.number})
              </a>
            ) : (
              <span className="font-semibold text-ink">your local emergency services</span>
            )}{" "}
            right now.
          </p>
        )}
      </div>
    </div>
  );
}
