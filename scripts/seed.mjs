// Seeds demo accounts and sample data.
//   npm run seed            (reads .env.local)
// Requires SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY). Never ship that key to the browser.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.SEED_PASSWORD || "Mirror-demo-2026";
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const domain = process.env.AUTH_EMAIL_DOMAIN || "users.beyond-the-mirror.invalid";
const authEmail = (username) => `${username}@${domain}`;
const adminUsername = (process.env.ADMIN_USERNAME || "admin").toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;

const PEOPLE = [
  { username: adminUsername, name: process.env.ADMIN_DISPLAY_NAME || "School Administrator", role: "admin" },
  {
    username: "amira", name: "Amira Hassan", role: "counselor",
    profile: {
      title: "School Counselor", presence: "available", office_hours: "Weekdays, 8:00–15:30",
      bio: "I've been a school counselor for nine years. Nothing is too small to bring to me — exams, friendships, home, or just a week that feels heavy.",
      specialties: ["Exam stress", "Friendships", "Wellbeing", "Careers"],
    },
  },
  {
    username: "daniel", name: "Daniel Okafor", role: "counselor",
    profile: { title: "Student Wellbeing Lead", presence: "busy", office_hours: "Mon–Thu, 9:00–16:00", specialties: ["Bullying", "Family", "Transitions"] },
  },
  { username: "zara", name: "Zara Ahmed", role: "student", grade: "Grade 10", section: "10-B" },
  { username: "omar", name: "Omar Siddiqui", role: "student", grade: "Grade 11", section: "11-A" },
  { username: "lina", name: "Lina Park", role: "student", grade: "Grade 9", section: "9-C" },
  { username: "ethan", name: "Ethan Brooks", role: "student", grade: "Grade 12", section: "12-A" },
];

async function ensureUser(p) {
  const isAdmin = p.role === "admin";
  const token = isAdmin ? (await db.rpc("create_admin_provision_token")).data : undefined;
  const { data, error } = await db.auth.admin.createUser({
    email: authEmail(p.username),
    password: isAdmin ? adminPassword : password,
    email_confirm: true,
    user_metadata: { full_name: p.name, username: p.username, grade: p.grade ?? null, section: p.section ?? null, provision_token: token },
  });
  if (data?.user) return data.user.id;
  if (error && !/already/i.test(error.message)) throw error;
  const { data: existing } = await db.from("profiles").select("id").eq("username", p.username).single();
  return existing.id;
}

if (!adminPassword || adminPassword.length < 10) {
  console.error("Set ADMIN_PASSWORD (10+ characters) in .env.local before seeding.");
  process.exit(1);
}

const ago = (mins) => new Date(Date.now() - mins * 60_000).toISOString();

async function main() {
  const ids = {};
  for (const p of PEOPLE) {
    ids[p.username] = await ensureUser(p);
    await db.from("profiles").update({ role: p.role, status: "active", grade: p.grade ?? null, ...(p.profile ?? {}) }).eq("id", ids[p.username]);
  }
  const amira = ids.amira, daniel = ids.daniel;
  const [zara, omar, lina, ethan] = ["zara", "omar", "lina", "ethan"].map((u) => ids[u]);
  await db.from("profiles").update({ counselor_id: amira }).in("id", [zara, omar, lina]);
  await db.from("profiles").update({ counselor_id: daniel }).eq("id", ethan);

  const { count } = await db.from("conversations").select("id", { count: "exact", head: true });
  if (count) {
    console.log("Sample data already present — accounts refreshed only.");
    return printLogins();
  }

  const threads = [
    {
      student: zara, counselor: amira, subject: "Stressed about mock exams", category: "exams", urgency: "high", status: "in_progress",
      msgs: [
        [zara, 300, "Hi Ms Hassan. Mocks start in two weeks and every time I open my notes I just freeze. I've stopped sleeping properly and I feel like I'm already behind in everything."],
        [amira, 270, "Hi Zara, thank you for reaching out — that took courage. Freezing like that is really common when the pile feels huge. Can I ask which subjects feel the heaviest right now?"],
        [zara, 250, "Chemistry and maths mostly. My parents keep asking about predicted grades too."],
        [amira, 240, "That makes sense. Let's make this smaller: try the revision planner in your toolkit tonight with just those two subjects, and book a session with me on Tuesday so we can look at it together — and talk about how to handle the questions at home."],
      ],
    },
    {
      student: omar, counselor: amira, subject: "Left out at lunch", category: "friendship", urgency: "normal", status: "pending",
      msgs: [[omar, 45, "My friends have started sitting somewhere else at lunch and don't save me a seat. I don't know what I did wrong and it's making me not want to come in."]],
    },
    {
      student: lina, counselor: amira, subject: "Choosing subjects for next year", category: "career", urgency: "low", status: "resolved",
      msgs: [
        [lina, 4000, "I have to pick my subjects soon and I have no idea what I want to do later. Is it bad that I don't know?"],
        [amira, 3900, "Not at all, Lina — most people your age don't know yet, and that's fine. A good rule is to choose subjects you enjoy and do well in, and keep a couple of options open. Want to go through the list together?"],
        [lina, 3800, "Yes please! That helps a lot actually."],
      ],
    },
    {
      student: ethan, counselor: daniel, subject: "Things at home", category: "family", urgency: "urgent", status: "pending",
      msgs: [[ethan, 20, "There's been a lot of shouting at home this week and I can't focus on anything. I don't really know who else to tell."]],
    },
  ];

  for (const t of threads) {
    const first = t.msgs[0];
    const { data: conv, error } = await db.from("conversations").insert({
      student_id: t.student, counselor_id: t.counselor, subject: t.subject, category: t.category, urgency: t.urgency,
      created_at: ago(first[1]), last_message_at: ago(first[1]),
    }).select().single();
    if (error) throw error;
    for (const [sender, mins, body] of t.msgs) {
      const { error: e } = await db.from("messages").insert({ conversation_id: conv.id, sender_id: sender, body });
      if (e) throw e;
      // Backdate so the demo has a believable timeline.
      await db.from("messages").update({ created_at: ago(mins) }).eq("conversation_id", conv.id).eq("body", body);
    }
    const last = t.msgs[t.msgs.length - 1];
    const firstReply = t.msgs.find(([s]) => s === t.counselor);
    await db.from("conversations").update({
      status: t.status, last_message_at: ago(last[1]),
      first_response_at: firstReply ? ago(firstReply[1]) : null,
      student_last_read_at: ago(last[0] === t.student ? last[1] : last[1] - 5),
      counselor_last_read_at: last[0] === t.counselor ? ago(last[1]) : null,
      resolved_at: t.status === "resolved" ? ago(3700) : null,
    }).eq("id", conv.id);
  }
  await db.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // Open availability for the next two weeks (10:00 and 14:00 local-ish, weekdays).
  const slots = [];
  for (let d = 1; d <= 14; d++) {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() + d);
    if ([0, 6].includes(day.getUTCDay())) continue;
    for (const [h, mode] of [[5, "in_person"], [9, "online"]]) {
      const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h, 0));
      slots.push({ counselor_id: amira, starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 30 * 60_000).toISOString(), mode, location: mode === "in_person" ? "Counseling room, Block B" : null });
    }
  }
  const { data: inserted, error: slotError } = await db.from("availability_slots").insert(slots).select();
  if (slotError) throw slotError;
  if (inserted?.length) {
    await db.from("appointments").insert({ slot_id: inserted[1].id, student_id: zara, counselor_id: amira, reason: "Go through my revision plan and talk about exam pressure at home." });
  }

  await db.from("announcements").insert([
    { author_id: amira, title: "Exam-week drop-in hours", body: "During mocks I'll be in the counseling room every lunchtime — no appointment needed. Come by even if you just need ten quiet minutes.", audience: "all_students", pinned: true },
    { author_id: ids[adminUsername], title: "Welcome to Beyond the Mirror", body: "You can now message your counselor privately, book sessions, and use the self-help toolkit any time.", audience: "everyone", pinned: false },
  ]).then(({ error }) => { if (error) throw error; });

  console.log("Seeded sample conversations, slots, a booking and announcements.");
  printLogins();
}

function printLogins() {
  console.log(`\nDemo logins — usernames (password: ${password}; admin uses ADMIN_PASSWORD)`);
  for (const p of PEOPLE) console.log(`  ${p.role.padEnd(10)} ${p.username}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
