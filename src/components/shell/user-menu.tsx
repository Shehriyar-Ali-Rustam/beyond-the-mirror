"use client";

import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { signOut } from "@/actions/auth";
import { Avatar } from "@/components/ui/avatar";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import type { Role } from "@/lib/types";
import { ROLE_LABEL } from "./nav-config";
import { ThemeToggle } from "./theme-toggle";

export function UserMenu({ name, username, hue, role }: { name: string; username: string; hue: number; role: Role }) {
  return (
    <Dropdown>
      <DropdownTrigger
        className="flex items-center gap-2.5 rounded-xl p-1 pr-2 text-left transition hover:bg-surface-2 data-[state=open]:bg-surface-2"
        aria-label="Account menu"
      >
        <Avatar name={name} hue={hue} size="sm" />
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-36 truncate text-sm font-medium leading-tight text-ink">{name}</span>
          <span className="block text-xs leading-tight text-ink-3">{ROLE_LABEL[role]}</span>
        </span>
      </DropdownTrigger>
      <DropdownContent className="w-64">
        <div className="px-3 pb-2 pt-1.5">
          <p className="truncate text-sm font-medium text-ink">{name}</p>
          <p className="truncate text-xs text-ink-3">@{username}</p>
        </div>
        <DropdownSeparator />
        <DropdownItem asChild>
          <Link href={`/${role}/settings`}>
            <Settings /> Settings
          </Link>
        </DropdownItem>
        <div className="flex items-center justify-between px-3 py-2 text-sm text-ink">
          Theme <ThemeToggle />
        </div>
        <DropdownSeparator />
        <DropdownItem onSelect={() => void signOut()} className="text-danger [&_svg]:!text-danger">
          <LogOut /> Log out
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
