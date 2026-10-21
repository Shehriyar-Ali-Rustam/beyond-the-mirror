"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { updateConversation } from "@/actions/messages";
import { CATEGORIES, CATEGORY_ORDER, STATUSES, URGENCIES } from "@/lib/constants";
import type { Category, RequestStatus, Urgency } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<RequestStatus, string> = {
  pending: "bg-warn-soft text-warn",
  in_progress: "bg-info-soft text-info",
  resolved: "bg-ok-soft text-ok",
};

const selectCls =
  "h-8 cursor-pointer appearance-none rounded-lg border border-line bg-surface pl-2.5 pr-7 text-[13px] text-ink-2 transition hover:border-line-strong focus:border-primary focus:outline-none bg-[length:12px] bg-[right_8px_center] bg-no-repeat";
const chevron = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23808894' stroke-width='2'%3E%3Cpath d='M5 7.5 10 12.5 15 7.5'/%3E%3C/svg%3E\")",
};

export function ConversationControls({
  conversationId,
  status,
  urgency,
  category,
}: {
  conversationId: string;
  status: RequestStatus;
  urgency: Urgency;
  category: Category;
}) {
  const [state, setState] = useOptimistic({ status, urgency, category });
  const [pending, start] = useTransition();

  const change = (patch: Partial<typeof state>) =>
    start(async () => {
      setState({ ...state, ...patch });
      const res = await updateConversation({ conversationId, ...patch });
      if (!res.ok) toast.error(res.error);
      else if (patch.status) toast.success(`Marked ${STATUSES[patch.status].label.toLowerCase()}`);
    });

  return (
    <div className={cn("flex flex-wrap items-center gap-2", pending && "opacity-80")}>
      <div role="radiogroup" aria-label="Status" className="inline-flex rounded-xl bg-surface-2 p-0.5">
        {(Object.keys(STATUSES) as RequestStatus[]).map((s) => (
          <button
            key={s}
            role="radio"
            aria-checked={state.status === s}
            onClick={() => state.status !== s && change({ status: s })}
            className={cn(
              "rounded-[10px] px-2.5 py-1 text-[13px] font-medium transition",
              state.status === s ? STATUS_STYLE[s] + " shadow-sm" : "text-ink-3 hover:text-ink",
            )}
          >
            {STATUSES[s].label}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor="urgency">
        Urgency
      </label>
      <select id="urgency" value={state.urgency} onChange={(e) => change({ urgency: e.target.value as Urgency })} className={cn(selectCls, state.urgency === "urgent" && "border-danger/40 text-danger", state.urgency === "high" && "text-clay")} style={chevron}>
        {(Object.keys(URGENCIES) as Urgency[]).map((u) => (
          <option key={u} value={u}>
            {URGENCIES[u].label} urgency
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="category">
        Topic
      </label>
      <select id="category" value={state.category} onChange={(e) => change({ category: e.target.value as Category })} className={selectCls} style={chevron}>
        {CATEGORY_ORDER.map((c) => (
          <option key={c} value={c}>
            {CATEGORIES[c].label}
          </option>
        ))}
      </select>
    </div>
  );
}
