"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { adminAssignCounselor } from "@/actions/admin";
import { Select } from "@/components/ui/input";

export function AssignSelect({
  studentId,
  current,
  counselors,
}: {
  studentId: string;
  current: string | null;
  counselors: { id: string; name: string; load: number }[];
}) {
  const [value, setValue] = useOptimistic(current ?? "");
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2 sm:w-72">
      {pending && <Loader2 className="size-4 animate-spin text-ink-3" />}
      <Select
        aria-label="Assigned counselor"
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value || null;
          start(async () => {
            setValue(next ?? "");
            const res = await adminAssignCounselor({ studentId, counselorId: next });
            if (!res.ok) toast.error(res.error);
            else toast.success(next ? "Counselor assigned" : "Assignment removed");
          });
        }}
        className={`h-10 text-sm ${!value ? "border-warn/50 text-warn" : ""}`}
      >
        <option value="">Unassigned</option>
        {counselors.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.load} {c.load === 1 ? "student" : "students"})
          </option>
        ))}
      </Select>
    </div>
  );
}
