import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Inbox" };

export default function InboxIndex() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <EmptyState
        illustration="conversation"
        title="Pick a conversation"
        description="Choose a request on the left to read it, reply, update its status, or keep private notes."
      />
    </div>
  );
}
