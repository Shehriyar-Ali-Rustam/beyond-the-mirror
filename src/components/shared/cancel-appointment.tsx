"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateAppointment } from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";

export function CancelAppointmentButton({ appointmentId, who }: { appointmentId: string; who: "student" | "counselor" }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  const confirm = () =>
    start(async () => {
      const res = await updateAppointment({ appointmentId, status: "cancelled", reason });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Session cancelled");
      setOpen(false);
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Cancel
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Cancel this session?"
        description={
          who === "student"
            ? "Your counselor will be notified and the time will open up for someone else."
            : "The student will be notified. Consider suggesting another time in the message."
        }
      >
        <label htmlFor="cancel-reason" className="text-sm font-medium text-ink">
          Reason <span className="font-normal text-ink-3">(optional)</span>
        </label>
        <Textarea
          id="cancel-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
          rows={3}
          className="mt-1.5 min-h-20"
          placeholder={who === "student" ? "e.g. I have a test that period" : "e.g. I'm away for training, please book Thursday instead"}
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Keep it
          </Button>
          <Button variant="danger" onClick={confirm} loading={pending}>
            Cancel session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
