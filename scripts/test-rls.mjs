// Security regression tests for Row Level Security & RPC authorization.
// Run against a LOCAL, freshly seeded database:  npm run db:reset && npm run seed && npm run test:rls
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const password = process.env.SEED_PASSWORD || "Mirror-demo-2026";
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!/127\.0\.0\.1|localhost/.test(url ?? "")) {
  console.error("Refusing to run: test:rls is for a local database only.");
  process.exit(1);
}

const client = () => createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
async function as(email) {
  const c = client();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return { c, id: data.user.id };
}

let passed = 0, failed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}

const zara = await as("student@demo.school");
const omar = await as("omar@demo.school");
const amira = await as("counselor@demo.school");
const daniel = await as("daniel@demo.school");
const admin = await as("admin@demo.school");
const anon = client();

const { data: omarConvs } = await omar.c.from("conversations").select("id").eq("student_id", omar.id);
const omarConv = omarConvs[0].id;
const { data: zaraConvs } = await zara.c.from("conversations").select("id").eq("student_id", zara.id);
const zaraConv = zaraConvs[0].id;

console.log("\nAnonymous");
await test("cannot read profiles", async () => {
  const { data } = await anon.from("profiles").select("id");
  assert.equal((data ?? []).length, 0);
});
await test("cannot read conversations or messages", async () => {
  const a = await anon.from("conversations").select("id");
  const b = await anon.from("messages").select("id");
  assert.equal((a.data ?? []).length + (b.data ?? []).length, 0);
});
await test("cannot call RPCs", async () => {
  const { error } = await anon.rpc("admin_stats");
  assert.ok(error);
});

console.log("\nStudents");
await test("see only their own conversations", async () => {
  const { data } = await zara.c.from("conversations").select("student_id");
  assert.ok(data.length > 0 && data.every((r) => r.student_id === zara.id));
});
await test("cannot read another student's messages", async () => {
  const { data } = await zara.c.from("messages").select("id").eq("conversation_id", omarConv);
  assert.equal(data.length, 0);
});
await test("cannot post into another student's conversation", async () => {
  const { error } = await zara.c.from("messages").insert({ conversation_id: omarConv, sender_id: zara.id, body: "hi" });
  assert.ok(error);
});
await test("cannot impersonate a sender", async () => {
  const { error } = await zara.c.from("messages").insert({ conversation_id: zaraConv, sender_id: omar.id, body: "spoof" });
  assert.ok(error);
});
await test("cannot see other students' profiles", async () => {
  const { data } = await zara.c.from("profiles").select("id").eq("id", omar.id);
  assert.equal(data.length, 0);
});
await test("cannot promote themselves", async () => {
  const { error } = await zara.c.from("profiles").update({ role: "admin" }).eq("id", zara.id);
  assert.ok(error, "role column must not be updatable");
  const { data } = await zara.c.from("profiles").select("role").eq("id", zara.id).single();
  assert.equal(data.role, "student");
});
await test("cannot reassign their counselor", async () => {
  const { error } = await zara.c.from("profiles").update({ counselor_id: daniel.id }).eq("id", zara.id);
  assert.ok(error);
});
await test("cannot insert conversations directly (must use RPC)", async () => {
  const { error } = await zara.c.from("conversations").insert({ student_id: zara.id, subject: "x".repeat(5) });
  assert.ok(error);
});
await test("cannot change urgency/category (trigger keeps counselor's values)", async () => {
  const before = (await zara.c.from("conversations").select("urgency").eq("id", zaraConv).single()).data.urgency;
  await zara.c.from("conversations").update({ urgency: "low" }).eq("id", zaraConv);
  const after = (await zara.c.from("conversations").select("urgency").eq("id", zaraConv).single()).data.urgency;
  assert.equal(after, before);
});
await test("cannot read case notes", async () => {
  const { data } = await zara.c.from("case_notes").select("id");
  assert.equal(data.length, 0);
});
await test("cannot call admin or counselor RPCs", async () => {
  assert.ok((await zara.c.rpc("admin_stats")).error);
  assert.ok((await zara.c.rpc("counselor_stats")).error);
  assert.ok((await zara.c.rpc("admin_update_user", { p_user: zara.id, p_role: "admin", p_status: "active" })).error);
});
await test("cannot create availability slots", async () => {
  const s = new Date(Date.now() + 86400000).toISOString();
  const e = new Date(Date.now() + 86400000 + 1800000).toISOString();
  const { error } = await zara.c.from("availability_slots").insert({ counselor_id: zara.id, starts_at: s, ends_at: e });
  assert.ok(error);
});
await test("cannot publish announcements", async () => {
  const { error } = await zara.c.from("announcements").insert({ author_id: zara.id, title: "Hacked", body: "x", audience: "everyone" });
  assert.ok(error);
});
await test("can start a conversation via RPC and it notifies the counselor", async () => {
  const { data: id, error } = await omar.c.rpc("start_conversation", { p_subject: "Test request", p_category: "other", p_urgency: "urgent", p_body: "Testing the full flow end to end." });
  assert.ifError(error);
  const { data: msgs } = await omar.c.from("messages").select("id").eq("conversation_id", id);
  assert.equal(msgs.length, 1);
  const { data: notes } = await amira.c.from("notifications").select("kind").eq("href", `/counselor/inbox/${id}`);
  assert.ok(notes.some((n) => n.kind === "urgent") && notes.some((n) => n.kind === "message"));
});

console.log("\nCounselors");
await test("see only conversations assigned to them", async () => {
  const { data } = await daniel.c.from("conversations").select("counselor_id");
  assert.ok(data.length > 0 && data.every((r) => r.counselor_id === daniel.id));
});
await test("cannot read another counselor's student messages", async () => {
  const { data } = await daniel.c.from("messages").select("id").eq("conversation_id", zaraConv);
  assert.equal(data.length, 0);
});
await test("cannot write notes about students who aren't theirs", async () => {
  const { error } = await daniel.c.from("case_notes").insert({ student_id: zara.id, author_id: daniel.id, body: "nope" });
  assert.ok(error);
});
await test("private notes are visible only to their author", async () => {
  const { data: note, error } = await amira.c.from("case_notes").insert({ student_id: zara.id, author_id: amira.id, body: "Follow up after mocks" }).select().single();
  assert.ifError(error);
  assert.equal((await daniel.c.from("case_notes").select("id").eq("id", note.id)).data.length, 0);
  assert.equal((await admin.c.from("case_notes").select("id").eq("id", note.id)).data.length, 0);
  assert.equal((await zara.c.from("case_notes").select("id").eq("id", note.id)).data.length, 0);
});
await test("reply moves request to in progress and notifies the student", async () => {
  const { data: conv } = await amira.c.from("conversations").select("id, status").eq("student_id", omar.id).eq("status", "pending").limit(1).single();
  const { error } = await amira.c.from("messages").insert({ conversation_id: conv.id, sender_id: amira.id, body: "I'm here — let's talk." });
  assert.ifError(error);
  const { data: after } = await omar.c.from("conversations").select("status, first_response_at").eq("id", conv.id).single();
  assert.equal(after.status, "in_progress");
  assert.ok(after.first_response_at);
  const { data: n } = await omar.c.from("notifications").select("id").eq("href", `/student/messages/${conv.id}`);
  assert.ok(n.length > 0);
});
await test("cannot change their own role", async () => {
  const { error } = await amira.c.from("profiles").update({ role: "admin" }).eq("id", amira.id);
  assert.ok(error);
});
await test("can read their stats", async () => {
  const { data, error } = await amira.c.rpc("counselor_stats");
  assert.ifError(error);
  assert.ok(typeof data.students === "number");
});

console.log("\nBookings");
await test("open slots hide booked times; double booking is refused", async () => {
  const { data: slots } = await omar.c.rpc("open_slots");
  assert.ok(slots.length > 0);
  const slot = slots[0];
  assert.ifError((await omar.c.rpc("book_appointment", { p_slot: slot.id, p_reason: "test" })).error);
  const { data: after } = await zara.c.rpc("open_slots");
  assert.ok(!after.some((s) => s.id === slot.id), "booked slot must disappear");
  assert.ok((await zara.c.rpc("book_appointment", { p_slot: slot.id, p_reason: "" })).error);
});
await test("students can't book another counselor's slots", async () => {
  const { data: danielSlot } = await daniel.c
    .from("availability_slots")
    .insert({ counselor_id: daniel.id, starts_at: new Date(Date.now() + 2 * 86400000).toISOString(), ends_at: new Date(Date.now() + 2 * 86400000 + 1800000).toISOString() })
    .select()
    .single();
  assert.ok((await zara.c.rpc("book_appointment", { p_slot: danielSlot.id, p_reason: "" })).error);
});
await test("students can't read other students' appointments", async () => {
  const { data } = await zara.c.from("appointments").select("student_id");
  assert.ok(data.every((a) => a.student_id === zara.id));
});
await test("only the counselor can mark a session complete", async () => {
  const { data: appt } = await omar.c.from("appointments").select("id").eq("student_id", omar.id).eq("status", "confirmed").limit(1).single();
  assert.ok((await omar.c.rpc("update_appointment", { p_appointment: appt.id, p_status: "completed", p_reason: "" })).error);
  assert.ifError((await amira.c.rpc("update_appointment", { p_appointment: appt.id, p_status: "completed", p_reason: "" })).error);
});

console.log("\nAdmins");
await test("cannot read conversations or messages", async () => {
  const a = await admin.c.from("conversations").select("id");
  const b = await admin.c.from("messages").select("id");
  assert.equal(a.data.length + b.data.length, 0);
});
await test("cannot read feedback text", async () => {
  const { data } = await admin.c.from("feedback").select("id");
  assert.equal(data.length, 0);
});
await test("can read all profiles and aggregate stats", async () => {
  const { data } = await admin.c.from("profiles").select("id");
  assert.ok(data.length >= 7);
  const { data: stats, error } = await admin.c.rpc("admin_stats");
  assert.ifError(error);
  assert.ok(stats.students >= 4 && !JSON.stringify(stats).includes("mock exams"));
});
await test("cannot change their own role", async () => {
  assert.ok((await admin.c.rpc("admin_update_user", { p_user: admin.id, p_role: "student", p_status: null })).error);
});
await test("can assign a counselor and open requests follow", async () => {
  assert.ifError((await admin.c.rpc("admin_assign_counselor", { p_student: omar.id, p_counselor: daniel.id, p_move_open: true })).error);
  const { data } = await daniel.c.from("conversations").select("id").eq("student_id", omar.id).neq("status", "resolved");
  assert.ok(data.length > 0);
  assert.ifError((await admin.c.rpc("admin_assign_counselor", { p_student: omar.id, p_counselor: amira.id, p_move_open: true })).error);
});

console.log("\nPending counselor sign-ups");
await test("start pending with no access until approved", async () => {
  const c = client();
  const email = `pending-${Date.now()}@demo.school`;
  const { data, error } = await c.auth.signUp({ email, password, options: { data: { full_name: "Pending Person", role_request: "counselor" } } });
  assert.ifError(error);
  const { data: me } = await c.from("profiles").select("role, status").eq("id", data.user.id).single();
  assert.equal(me.status, "pending");
  assert.ok((await c.rpc("counselor_stats")).error);
  assert.equal((await c.from("conversations").select("id")).data.length, 0);
  if (secret) await createClient(url, secret).auth.admin.deleteUser(data.user.id);
});
await test("cannot self-assign admin through sign-up metadata", async () => {
  const c = client();
  const { data } = await c.auth.signUp({ email: `sneaky-${Date.now()}@demo.school`, password, options: { data: { full_name: "Sneaky", role_request: "admin", role: "admin" } } });
  const { data: me } = await c.from("profiles").select("role, status").eq("id", data.user.id).single();
  assert.equal(me.role, "student");
  if (secret) await createClient(url, secret).auth.admin.deleteUser(data.user.id);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
