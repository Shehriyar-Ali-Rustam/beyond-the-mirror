"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Stores the browser's timezone in a cookie so the server renders local times. */
export function TimezoneSync({ serverTz }: { serverTz: string }) {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz !== serverTz) {
      document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [serverTz, router]);
  return null;
}
