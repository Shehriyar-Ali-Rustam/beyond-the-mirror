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

export type NavItem = { href: string; label: string; icon: LucideIcon; badgeKey?: "unread" | "pending"; exact?: boolean };

export const NAV: Record<Role, { main: NavItem[]; secondary: NavItem[] }> = {
  student: {
    main: [
      { href: "/student", label: "Home", icon: Home, exact: true },
      { href: "/student/messages", label: "Messages", icon: MessagesSquare, badgeKey: "unread" },
      { href: "/student/appointments", label: "Sessions", icon: CalendarDays },
      { href: "/student/community", label: "Community", icon: UsersRound },
      { href: "/student/toolkit", label: "Toolkit", icon: Sparkles },
      { href: "/student/resources", label: "Resources", icon: Compass },
    ],
    secondary: [{ href: "/student/settings", label: "Settings", icon: Settings }],
  },
  counselor: {
    main: [
      { href: "/counselor", label: "Overview", icon: Gauge, exact: true },
      { href: "/counselor/inbox", label: "Inbox", icon: Inbox, badgeKey: "unread" },
      { href: "/counselor/schedule", label: "Schedule", icon: CalendarDays },
      { href: "/counselor/students", label: "Students", icon: Users },
      { href: "/counselor/community", label: "Community", icon: UsersRound },
      { href: "/counselor/announcements", label: "Announcements", icon: Megaphone },
    ],
    secondary: [{ href: "/counselor/settings", label: "Profile & settings", icon: Settings }],
  },
  admin: {
    main: [
      { href: "/admin", label: "Overview", icon: Gauge, exact: true },
      { href: "/admin/users", label: "People", icon: UserCog, badgeKey: "pending" },
      { href: "/admin/assignments", label: "Assignments", icon: Users },
      { href: "/admin/community", label: "Community", icon: UsersRound },
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
    ],
    secondary: [{ href: "/admin/settings", label: "Settings", icon: Settings }],
  },
};

export const ROLE_LABEL: Record<Role, string> = {
  student: "Student",
  counselor: "Counselor",
  admin: "Administrator",
};
