import * as React from "react";
import { cn } from "@/lib/utils";
import { Illustration, type IllustrationName } from "@/components/visual/illustration";

/** Empty states use the arch silhouette with an icon "reflected" inside. */
export function EmptyState({
  icon,
  illustration,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: React.ReactNode;
  /** Shows a colourful illustration instead of the icon. */
  illustration?: IllustrationName;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "px-4 py-8" : "px-6 py-14", className)}>
      {illustration ? (
        <Illustration name={illustration} className={cn("mb-5 animate-fade-up", compact ? "w-32" : "w-44")} />
      ) : (
        <div className="relative mb-5">
          <div className="arch flex h-20 w-16 items-center justify-center border border-line-strong bg-surface-2 text-primary [&_svg]:size-6">
            {icon}
          </div>
          <div className="glass-sheen arch pointer-events-none absolute inset-0 opacity-70" />
        </div>
      )}
      <h3 className="font-display text-lg text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-2">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
