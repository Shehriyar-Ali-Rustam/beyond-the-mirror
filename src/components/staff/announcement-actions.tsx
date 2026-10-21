"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Pin, PinOff, Trash2 } from "lucide-react";
import { deleteAnnouncement, togglePin } from "@/actions/announcements";

export function AnnouncementActions({ id, pinned }: { id: string; pinned: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex shrink-0 gap-0.5">
      <button
        disabled={pending}
        onClick={() => start(async () => { const r = await togglePin(id, !pinned); if (!r.ok) toast.error(r.error); })}
        className="rounded-lg p-1.5 text-ink-3 transition hover:bg-surface-2 hover:text-ink"
        aria-label={pinned ? "Unpin" : "Pin"}
        title={pinned ? "Unpin" : "Pin"}
      >
        {pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
      </button>
      <button
        disabled={pending}
        onClick={() => {
          if (!confirm("Delete this announcement?")) return;
          start(async () => { const r = await deleteAnnouncement(id); if (!r.ok) toast.error(r.error); else toast.success("Deleted"); });
        }}
        className="rounded-lg p-1.5 text-ink-3 transition hover:bg-danger-soft hover:text-danger"
        aria-label="Delete"
        title="Delete"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
