import {
  BookOpen,
  Briefcase,
  CloudRain,
  GraduationCap,
  HeartHandshake,
  Home,
  ShieldAlert,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import type { AppointmentMode, Audience, Category, Presence, RequestStatus, Urgency } from "./types";

export const APP_NAME = "Beyond the Mirror";

export const CATEGORIES: Record<Category, { label: string; hint: string; icon: LucideIcon; tone: string }> = {
  academic: { label: "Studies", hint: "Subjects, grades, workload", icon: BookOpen, tone: "bg-sky-soft text-sky" },
  exams: { label: "Exams & results", hint: "Exam stress, marks, pressure", icon: GraduationCap, tone: "bg-sun-soft text-[#a26a00]" },
  career: { label: "Future & careers", hint: "Subjects, university, jobs", icon: Briefcase, tone: "bg-primary-soft text-primary" },
  wellbeing: { label: "How I'm feeling", hint: "Stress, sleep, mood, worries", icon: CloudRain, tone: "bg-grape-soft text-grape" },
  friendship: { label: "Friendships", hint: "Falling out, feeling left out", icon: HeartHandshake, tone: "bg-rose-soft text-rose" },
  family: { label: "Home & family", hint: "Tension, changes, pressure", icon: Home, tone: "bg-mint-soft text-[#1f8a6b]" },
  bullying: { label: "Bullying", hint: "In person or online", icon: ShieldAlert, tone: "bg-coral-soft text-coral" },
  other: { label: "Something else", hint: "Anything at all", icon: MessageCircle, tone: "bg-surface-2 text-ink-2" },
};

export const CATEGORY_ORDER: Category[] = [
  "wellbeing", "exams", "academic", "friendship", "family", "bullying", "career", "other",
];

export const STATUSES: Record<RequestStatus, { label: string; studentLabel: string; tone: string }> = {
  pending: { label: "Pending", studentLabel: "Sent, waiting for reply", tone: "pending" },
  in_progress: { label: "In progress", studentLabel: "Counselor is on it", tone: "progress" },
  resolved: { label: "Resolved", studentLabel: "Resolved", tone: "resolved" },
};

export const URGENCIES: Record<Urgency, { label: string; studentLabel: string; hint: string }> = {
  low: { label: "Low", studentLabel: "Whenever you can", hint: "No rush, a question or idea" },
  normal: { label: "Normal", studentLabel: "This week", hint: "It's on my mind" },
  high: { label: "High", studentLabel: "Soon, please", hint: "It's affecting my days" },
  urgent: { label: "Urgent", studentLabel: "Today", hint: "I need help as soon as possible" },
};

export const PRESENCE: Record<Presence, { label: string; dot: string }> = {
  available: { label: "Available", dot: "bg-[var(--ok)]" },
  busy: { label: "In a session", dot: "bg-[var(--warn)]" },
  away: { label: "Away", dot: "bg-[var(--ink-3)]" },
};

export const MODES: Record<AppointmentMode, string> = {
  in_person: "In person",
  online: "Online call",
  phone: "Phone call",
};

export const AUDIENCES: Record<Audience, string> = {
  everyone: "Everyone",
  all_students: "All students",
  my_students: "My students",
  counselors: "Staff only",
};

export const CRISIS = {
  name: process.env.NEXT_PUBLIC_CRISIS_LINE_NAME || "Emergency services",
  number: process.env.NEXT_PUBLIC_CRISIS_LINE_NUMBER || "",
};
