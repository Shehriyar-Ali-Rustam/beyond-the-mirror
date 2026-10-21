"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Re-checks the account every 10 seconds. The page redirects to the dashboard
 * on the server as soon as an admin approves the account.
 */
export function ApprovalWatcher() {
  const router = useRouter();
  const [pending, start] = useTransition();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(id);
  }, [router]);

  return (
    <Button variant="primary" loading={pending} onClick={() => start(() => router.refresh())}>
      {!pending && <RefreshCw />} Check again
    </Button>
  );
}
