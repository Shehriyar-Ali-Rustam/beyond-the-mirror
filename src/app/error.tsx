"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="flex min-h-[60dvh] items-center justify-center px-5">
      <EmptyState
        illustration="feeling-blue"
        title="Something went wrong on our side"
        description="Your messages are safe. Try again in a moment. If it keeps happening, let your school know."
        action={
          <Button onClick={reset}>
            <RotateCcw /> Try again
          </Button>
        }
      />
    </div>
  );
}
