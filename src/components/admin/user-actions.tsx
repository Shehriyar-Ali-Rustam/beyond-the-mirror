"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, GraduationCap, HeartHandshake, KeyRound, MoreHorizontal, PauseCircle, PlayCircle } from "lucide-react";
import { adminResetPassword, adminUpdateUser } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { Select } from "@/components/ui/input";
import { CopyButton } from "@/components/toolkit/shared";
import type { AccountStatus, Role } from "@/lib/types";

export function UserActions({ user }: { user: { id: string; full_name: string; username: string; role: Role; status: AccountStatus } }) {
  const [pending, start] = useTransition();
  const [temp, setTemp] = useState<string | null>(null);
  const run = (patch: { role?: Role; status?: AccountStatus }, done: string) =>
    start(async () => {
      const res = await adminUpdateUser({ userId: user.id, ...patch });
      if (!res.ok) toast.error(res.error);
      else toast.success(done);
    });
  const reset = () =>
    start(async () => {
      const res = await adminResetPassword(user.id);
      if (!res.ok) toast.error(res.error);
      else setTemp(res.data!.password);
    });

  if (user.status === "pending") {
    return (
      <div className="flex justify-end gap-2">
        <Button size="sm" loading={pending} onClick={() => run({ status: "active" }, `${user.full_name} approved`)}>
          <CheckCircle2 /> Approve
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run({ status: "suspended" }, "Request declined")}>
          Decline
        </Button>
      </div>
    );
  }

  if (user.role === "admin") return null;

  return (
    <>
      <Dropdown>
        <DropdownTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.full_name}`} loading={pending}>
            {!pending && <MoreHorizontal />}
          </Button>
        </DropdownTrigger>
        <DropdownContent>
          <DropdownItem onSelect={reset}>
            <KeyRound /> Reset password
          </DropdownItem>
          <DropdownSeparator />
          <DropdownLabel>Change role</DropdownLabel>
          <DropdownItem disabled={user.role === "student"} onSelect={() => run({ role: "student" }, "Role changed to student")}>
            <GraduationCap /> Student
          </DropdownItem>
          <DropdownItem disabled={user.role === "counselor"} onSelect={() => run({ role: "counselor" }, "Role changed to counselor")}>
            <HeartHandshake /> Counselor
          </DropdownItem>
          <DropdownSeparator />
          {user.status === "suspended" ? (
            <DropdownItem onSelect={() => run({ status: "active" }, "Access restored")}>
              <PlayCircle /> Restore access
            </DropdownItem>
          ) : (
            <DropdownItem
              className="text-danger [&_svg]:!text-danger"
              onSelect={() => {
                if (confirm(`Pause ${user.full_name}'s access? They won't be able to use the platform until restored.`)) run({ status: "suspended" }, "Access paused");
              }}
            >
              <PauseCircle /> Pause access
            </DropdownItem>
          )}
        </DropdownContent>
      </Dropdown>
      <Dialog open={temp !== null} onOpenChange={(o) => !o && setTemp(null)}>
        <DialogContent
          title={`Temporary password for ${user.full_name}`}
          description="Share it with them in person. It's shown only once. They can change it under Settings after logging in."
        >
          <div className="rounded-2xl bg-surface-2 p-4 text-center">
            <p className="text-xs text-ink-3">Username</p>
            <p className="font-medium text-ink">@{user.username}</p>
            <p className="mt-3 text-xs text-ink-3">Temporary password</p>
            <p className="font-mono text-xl tracking-wide text-ink">{temp}</p>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <CopyButton text={temp ?? ""} label="Copy password" />
            <Button onClick={() => setTemp(null)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RoleFilter({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <Select
      aria-label="Filter by role"
      value={value}
      onChange={(e) => {
        const next = new URLSearchParams(params);
        if (e.target.value) next.set("role", e.target.value);
        else next.delete("role");
        router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
      }}
      className="h-10 w-40 text-sm"
    >
      <option value="">All roles</option>
      <option value="student">Students</option>
      <option value="counselor">Counselors</option>
      <option value="admin">Admin</option>
    </Select>
  );
}
