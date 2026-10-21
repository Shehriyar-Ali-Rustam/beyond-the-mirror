"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, X } from "lucide-react";
import { deleteSlot, updateAppointment } from "@/actions/appointments";
import { Button } from "@/components/ui/button";

export function DeleteSlotButton({ slotId }: { slotId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() =>
        start(async () => {
          const res = await deleteSlot(slotId);
          if (!res.ok) toast.error(res.error);
        })
      }
      disabled={pending}
      className="rounded-lg p-1 text-ink-3 transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
      aria-label="Remove this time"
    >
      <X className="size-3.5" />
    </button>
  );
}

export function CompleteAppointmentButton({ appointmentId }: { appointmentId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="soft"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await updateAppointment({ appointmentId, status: "completed" });
          if (!res.ok) toast.error(res.error);
          else toast.success("Marked complete");
        })
      }
    >
      <CheckCircle2 /> Completed
    </Button>
  );
}
