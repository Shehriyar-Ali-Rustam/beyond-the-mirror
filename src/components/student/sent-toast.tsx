"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

export function SentToast() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    // The request was created, so the saved draft is no longer needed.
    try {
      sessionStorage.removeItem("btm:draft");
    } catch {}
    toast.success("Sent to your counselor", {
      id: "sent",
      description: "You'll get a notification here as soon as they reply.",
    });
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);
  return null;
}
