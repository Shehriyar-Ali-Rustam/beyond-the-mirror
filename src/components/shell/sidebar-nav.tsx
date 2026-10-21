"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { NAV } from "./nav-config";

export function SidebarNav({
  role,
  badges,
  onNavigate,
  layoutId = "nav-pill",
}: {
  role: Role;
  badges: Partial<Record<"unread" | "pending", number>>;
  onNavigate?: () => void;
  layoutId?: string;
}) {
  const pathname = usePathname();
  const { main, secondary } = NAV[role];

  const renderItem = (item: (typeof main)[number]) => {
    const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
    const count = item.badgeKey ? badges[item.badgeKey] ?? 0 : 0;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            active ? "text-ink" : "text-ink-2 hover:text-ink",
          )}
        >
          {active && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 rounded-xl border border-line bg-surface shadow-sm"
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
            />
          )}
          <item.icon className={cn("relative size-[18px]", active ? "text-primary" : "text-ink-3")} />
          <span className="relative flex-1">{item.label}</span>
          {count > 0 && (
            <span className="relative min-w-5 rounded-full bg-clay px-1.5 text-center text-[11px] font-semibold leading-5 text-white dark:text-bg">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="Main" className="flex flex-1 flex-col">
      <ul className="space-y-1">{main.map(renderItem)}</ul>
      <ul className="mt-auto space-y-1 pt-6">{secondary.map(renderItem)}</ul>
    </nav>
  );
}
