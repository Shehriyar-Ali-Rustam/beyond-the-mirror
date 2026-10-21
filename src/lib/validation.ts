import { z } from "zod";

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, min <= 1 ? `${label} is required.` : `${label} needs at least ${min} characters.`)
    .max(max, `${label} can be at most ${max} characters.`);

export const categorySchema = z.enum([
  "academic", "exams", "career", "wellbeing", "friendship", "family", "bullying", "other",
]);
export const urgencySchema = z.enum(["low", "normal", "high", "urgent"]);
export const statusSchema = z.enum(["pending", "in_progress", "resolved"]);
export const presenceSchema = z.enum(["available", "busy", "away"]);
export const roleSchema = z.enum(["student", "counselor", "admin"]);
export const accountStatusSchema = z.enum(["active", "pending", "suspended"]);
export const modeSchema = z.enum(["in_person", "online", "phone"]);
export const audienceSchema = z.enum(["everyone", "all_students", "my_students", "counselors"]);
export const uuid = z.uuid("Invalid id.");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9._]{2,23}$/, "Use 3–24 letters, numbers, dots or underscores (start with a letter or number).");

const optionalText = (max: number, label: string) =>
  z.string().trim().max(max, `${label} can be at most ${max} characters.`).optional().transform((v) => v || undefined);

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((v) => v || undefined)
  .pipe(z.email("Enter a valid email address, or leave it empty.").optional());

export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Enter your username."),
  password: z.string().min(1, "Enter your password."),
});

export const registerSchema = z.object({
  role: z.enum(["student", "counselor"]),
  fullName: trimmed(2, 80, "Name"),
  username: usernameSchema,
  password: passwordSchema,
  grade: optionalText(40, "Year / grade"),
  section: optionalText(40, "Class / section"),
  studentNumber: optionalText(40, "Student ID"),
  title: optionalText(80, "Title"),
  contactEmail: optionalEmail,
  agree: z.literal("on", { message: "Please confirm you've read how privacy works here." }),
});

export const newRequestSchema = z.object({
  subject: trimmed(3, 120, "Subject"),
  category: categorySchema,
  urgency: urgencySchema,
  body: trimmed(10, 4000, "Message"),
  identity: z.enum(["named", "anonymous"]).default("named"),
});

export const messageSchema = z.object({
  conversationId: uuid,
  body: trimmed(1, 4000, "Message"),
});

export const conversationUpdateSchema = z.object({
  conversationId: uuid,
  status: statusSchema.optional(),
  category: categorySchema.optional(),
  urgency: urgencySchema.optional(),
});

export const studentProfileSchema = z.object({
  fullName: trimmed(2, 80, "Name"),
  grade: optionalText(40, "Year / grade"),
  section: optionalText(40, "Class / section"),
  studentNumber: optionalText(40, "Student ID"),
  contactEmail: optionalEmail,
});

export const counselorProfileSchema = z.object({
  fullName: trimmed(2, 80, "Name"),
  contactEmail: optionalEmail,
  title: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(600, "Keep your bio under 600 characters.").optional(),
  officeHours: z.string().trim().max(120).optional(),
  specialties: z.array(z.string().trim().min(1).max(30)).max(8),
  whatsapp: z
    .string()
    .trim()
    .regex(/^(\+?[0-9 ]{7,20})?$/, "Use digits only, with an optional + country code.")
    .optional(),
});

export const slotSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    start: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time."),
    end: z.string().regex(/^\d{2}:\d{2}$/, "Pick an end time."),
    mode: modeSchema,
    location: z.string().trim().max(120).optional(),
    repeatWeeks: z.coerce.number().int().min(1).max(12),
    tzOffset: z.coerce.number().int().min(-840).max(840),
  })
  .refine((v) => v.end > v.start, { message: "End time must be after the start time.", path: ["end"] });

export const bookingSchema = z.object({
  slotId: uuid,
  reason: z.string().trim().max(500, "Keep it under 500 characters.").optional(),
});

export const feedbackSchema = z.object({
  appointmentId: uuid.optional(),
  conversationId: uuid.optional(),
  rating: z.coerce.number().int().min(1, "Choose a rating.").max(5),
  comment: z.string().trim().max(1000).optional(),
});

export const announcementSchema = z.object({
  title: trimmed(3, 120, "Title"),
  body: trimmed(1, 2000, "Message"),
  audience: audienceSchema,
  pinned: z.boolean(),
});

export const noteSchema = z.object({
  studentId: uuid,
  body: trimmed(1, 2000, "Note"),
});

export function fieldErrors(error: z.ZodError) {
  return z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
}

export function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Please check the form.";
}
