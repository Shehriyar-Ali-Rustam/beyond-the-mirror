"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserRound } from "lucide-react";
import { revealIdentity } from "@/actions/messages";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export function RevealIdentityButton({ conversationId }: { conversationId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const confirm = () =>
    start(async () => {
      const res = await revealIdentity(conversationId);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Your counselor can now see your name");
      setOpen(false);
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <UserRound /> Share my name
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Share your name with your counselor?"
        description="They'll see your name on this conversation, including the messages you've already sent. You can't make it anonymous again afterwards."
      >
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Stay anonymous
          </Button>
          <Button onClick={confirm} loading={pending}>
            Share my name
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
