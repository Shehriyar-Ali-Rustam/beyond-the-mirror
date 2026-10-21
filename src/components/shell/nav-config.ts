import {
  CalendarDays,
  UsersRound,
  Compass,
  Gauge,
  Home,
  Inbox,
  Megaphone,
  MessagesSquare,
  Settings,
  Sparkles,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/types";

export type NavItem = { href: string; label: string; icon: LucideIcon; tone: string; badgeKey?: "unread" | "pending"; exact?: boolean };

export const NAV: Record<Role, { main: NavItem[]; secondary: NavItem[] }> = {
  student: {
    main: [
      { href: "/student", label: "Home", tone: "bg-primary-soft text-primary", icon: Home, exact: true },
      { href: "/student/messages", label: "Messages", tone: "bg-sky-soft text-sky", icon: MessagesSquare, badgeKey: "unread" },
      { href: "/student/appointments", label: "Sessions", tone: "bg-sun-soft text-[#a26a00]", icon: CalendarDays },
      { href: "/student/community", label: "Community", tone: "bg-coral-soft text-coral", icon: UsersRound },
      { href: "/student/toolkit", label: "Toolkit", tone: "bg-grape-soft text-grape", icon: Sparkles },
      { href: "/student/resources", label: "Resources", tone: "bg-mint-soft text-[#1f8a6b]", icon: Compass },
    ],
    secondary: [{ href: "/student/settings", label: "Settings", tone: "bg-surface-2 text-ink-2", icon: Settings }],
  },
  counselor: {
    main: [
      { href: "/counselor", label: "Overview", tone: "bg-primary-soft text-primary", icon: Gauge, exact: true },
      { href: "/counselor/inbox", label: "Inbox", tone: "bg-sky-soft text-sky", icon: Inbox, badgeKey: "unread" },
      { href: "/counselor/schedule", label: "Schedule", tone: "bg-sun-soft text-[#a26a00]", icon: CalendarDays },
      { href: "/counselor/students", label: "Students", tone: "bg-mint-soft text-[#1f8a6b]", icon: Users },
      { href: "/counselor/community", label: "Community", tone: "bg-coral-soft text-coral", icon: UsersRound },
      { href: "/counselor/announcements", label: "Announcements", tone: "bg-rose-soft text-rose", icon: Megaphone },
    ],
    secondary: [{ href: "/counselor/settings", label: "Profile & settings", tone: "bg-surface-2 text-ink-2", icon: Settings }],
  },
  admin: {
    main: [
      { href: "/admin", label: "Overview", tone: "bg-primary-soft text-primary", icon: Gauge, exact: true },
      { href: "/admin/users", label: "People", tone: "bg-rose-soft text-rose", icon: UserCog, badgeKey: "pending" },
      { href: "/admin/assignments", label: "Assignments", tone: "bg-mint-soft text-[#1f8a6b]", icon: Users },
      { href: "/admin/community", label: "Community", tone: "bg-coral-soft text-coral", icon: UsersRound },
      { href: "/admin/announcements", label: "Announcements", tone: "bg-rose-soft text-rose", icon: Megaphone },
    ],
    secondary: [{ href: "/admin/settings", label: "Settings", tone: "bg-surface-2 text-ink-2", icon: Settings }],
  },
};

export const ROLE_LABEL: Record<Role, string> = {
  student: "Student",
  counselor: "Counselor",
  admin: "Administrator",
};
