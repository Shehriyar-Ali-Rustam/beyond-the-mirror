import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type Profile = Tables["profiles"]["Row"];
export type Conversation = Tables["conversations"]["Row"];
export type Message = Tables["messages"]["Row"];
export type CaseNote = Tables["case_notes"]["Row"];
export type Slot = Tables["availability_slots"]["Row"];
export type Appointment = Tables["appointments"]["Row"];
export type Feedback = Tables["feedback"]["Row"];
export type Notification = Tables["notifications"]["Row"];
export type Announcement = Tables["announcements"]["Row"];

export type Role = Enums["user_role"];
export type AccountStatus = Enums["account_status"];
export type Category = Enums["request_category"];
export type Urgency = Enums["request_urgency"];
export type RequestStatus = Enums["request_status"];
export type Presence = Enums["counselor_presence"];
export type AppointmentMode = Enums["appointment_mode"];
export type AppointmentStatus = Enums["appointment_status"];
export type Audience = Enums["announcement_audience"];

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };
