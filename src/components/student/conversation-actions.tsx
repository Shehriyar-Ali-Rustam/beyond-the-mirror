"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CheckCheck, RotateCcw } from "lucide-react";
import { updateConversation } from "@/actions/messages";
import { Button } from "@/components/ui/button";
import type { RequestStatus } from "@/lib/types";

export function StudentConversationActions({ conversationId, status }: { conversationId: string; status: RequestStatus }) {
  const [pending, start] = useTransition();
  const resolved = status === "resolved";
  const run = () =>
    start(async () => {
      const res = await updateConversation({ conversationId, status: resolved ? "pending" : "resolved" });
      if (!res.ok) toast.error(res.error);
      else toast.success(resolved ? "Conversation reopened" : "Marked as resolved. Glad things are sorted!");
    });

  return (
    <div>
      <Button variant={resolved ? "secondary" : "soft"} size="sm" className="w-full" onClick={run} loading={pending}>
        {resolved ? <RotateCcw /> : <CheckCheck />}
        {resolved ? "Reopen conversation" : "This is sorted, mark resolved"}
      </Button>
      <p className="mt-2 text-center text-xs text-ink-3">
        {resolved ? "Reopening lets your counselor know you still need help." : "You can always reopen it later."}
      </p>
    </div>
  );
}
