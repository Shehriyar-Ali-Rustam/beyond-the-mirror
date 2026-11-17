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

const domain = process.env.AUTH_EMAIL_DOMAIN || "users.beyond-the-mirror.invalid";
const adminUsername = (process.env.ADMIN_USERNAME || "admin").toLowerCase();
const client = () => createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
async function as(username) {
  const c = client();
  const pw = username === adminUsername ? process.env.ADMIN_PASSWORD : password;
  const { data, error } = await c.auth.signInWithPassword({ email: `${username}@${domain}`, password: pw });
  if (error) throw new Error(`login ${username}: ${error.message}`);
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

// The admin is normally created on first login; create it the same way if missing.
if (!process.env.ADMIN_PASSWORD) {
  console.error("Set ADMIN_PASSWORD to the admin login password to run these tests.");
  process.exit(1);
}
{
  const svc = createClient(url, secret, { auth: { persistSession: false } });
  const { data: existing } = await svc.from("profiles").select("id").eq("username", adminUsername).maybeSingle();
  if (existing) {
    await svc.auth.admin.updateUserById(existing.id, { password: process.env.ADMIN_PASSWORD });
  } else {
    const { data: token } = await svc.rpc("create_admin_provision_token");
    await svc.auth.admin.createUser({
      email: `${adminUsername}@${domain}`,
      password: process.env.ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { username: adminUsername, full_name: "School Administrator", provision_token: token },
    });
  }
}

const zara = await as("zara");
const omar = await as("omar");
const lina = await as("lina");
const amira = await as("amira");
const daniel = await as("daniel");
const admin = await as(adminUsername);
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
await test("cannot impersonate a sender (the real sender is always recorded)", async () => {
  const { data, error } = await zara.c.from("messages").insert({ conversation_id: zaraConv, sender_id: omar.id, body: "spoof" }).select("sender_id").maybeSingle();
  assert.ok(error || data?.sender_id === zara.id);
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
  const { error } = await amira.c.from("messages").insert({ conversation_id: conv.id, sender_id: amira.id, body: "I'm here, let's talk." });
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
  assert.equal(admin.id, data.find((p) => p.id === admin.id)?.id);
});
await test("cannot change their own role", async () => {
  assert.ok((await admin.c.rpc("admin_update_user", { p_user: admin.id, p_role: "student", p_status: null })).error);
});
await test("cannot assign counselors by hand (matching is automatic)", async () => {
  assert.ok((await admin.c.rpc("admin_assign_counselor", { p_student: omar.id, p_counselor: daniel.id, p_move_open: true })).error);
});

const service = createClient(url, secret, { auth: { persistSession: false } });
async function provision(username, metadata, appMetadata) {
  const email = `${username}@${domain}`;
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username, ...metadata }, ...(appMetadata ? { app_metadata: appMetadata } : {}) });
  if (error) return { error };
  const c = client();
  await c.auth.signInWithPassword({ email, password });
  return { c, id: data.user.id };
}
console.log("\nAnonymous conversations");
let anonConv;
await test("student can open an anonymous request", async () => {
  const { data, error } = await zara.c.rpc("start_conversation", { p_subject: "Anonymous worry", p_category: "wellbeing", p_urgency: "normal", p_body: "I would rather not say who I am yet.", p_anonymous: true });
  assert.ifError(error);
  anonConv = data;
  const { data: mine } = await zara.c.from("conversations").select("id, is_anonymous").eq("id", anonConv).single();
  assert.equal(mine.is_anonymous, true);
});
await test("counselor sees the request but nothing that identifies the student", async () => {
  const { data: conv } = await amira.c.from("conversations").select("*").eq("id", anonConv).single();
  assert.equal(conv.student_id, null);
  assert.equal(conv.last_message_sender, null);
  const { data: msgs } = await amira.c.from("messages").select("sender_id, from_student").eq("conversation_id", anonConv);
  assert.ok(msgs.length === 1 && msgs[0].sender_id === null && msgs[0].from_student === true);
  const { data: notes } = await amira.c.from("notifications").select("body").eq("href", `/counselor/inbox/${anonConv}`);
  assert.ok(notes.length > 0 && notes.every((n) => !n.body.includes("Zara")));
});
await test("anonymous student can keep messaging; replies reach them", async () => {
  assert.ifError((await zara.c.from("messages").insert({ conversation_id: anonConv, body: "Still me." })).error);
  assert.ifError((await amira.c.from("messages").insert({ conversation_id: anonConv, sender_id: amira.id, body: "I'm here for you." })).error);
  const { data: n } = await zara.c.from("notifications").select("id").eq("href", `/student/messages/${anonConv}`);
  assert.ok(n.length > 0);
  const { data: msgs } = await amira.c.from("messages").select("sender_id").eq("conversation_id", anonConv).eq("from_student", true);
  assert.ok(msgs.every((m) => m.sender_id === null));
});
await test("counselor cannot forge a student message", async () => {
  await amira.c.from("messages").insert({ conversation_id: anonConv, sender_id: null, from_student: true, body: "forged" });
  const { data } = await zara.c.from("messages").select("from_student, body").eq("conversation_id", anonConv).eq("body", "forged");
  assert.ok(data.every((m) => m.from_student === false));
});
await test("other students cannot see an anonymous conversation", async () => {
  assert.equal((await omar.c.from("conversations").select("id").eq("id", anonConv)).data.length, 0);
  assert.equal((await omar.c.from("messages").select("id").eq("conversation_id", anonConv)).data.length, 0);
  assert.ok((await omar.c.rpc("reveal_identity", { p_conversation: anonConv })).error);
});
await test("is_conversation_owner reveals nothing about others", async () => {
  const { data } = await amira.c.rpc("is_conversation_owner", { cid: anonConv });
  assert.equal(data, false);
});
await test("student can choose to share their name later", async () => {
  assert.ifError((await zara.c.rpc("reveal_identity", { p_conversation: anonConv })).error);
  const { data: conv } = await amira.c.from("conversations").select("student_id, is_anonymous").eq("id", anonConv).single();
  assert.equal(conv.student_id, zara.id);
  assert.equal(conv.is_anonymous, false);
});
await test("counselors cannot read who left feedback", async () => {
  const { error } = await amira.c.from("feedback").select("student_id").limit(1);
  assert.ok(error, "student_id must not be selectable");
});

console.log("\nCommunity board");
let postId;
await test("student can post anonymously", async () => {
  const { data, error } = await zara.c.rpc("create_post", { p_kind: "advice", p_body: "How do you deal with exam nerves?", p_image_path: null, p_anonymous: true });
  assert.ifError(error);
  postId = data;
});
await test("other students don't see the author of an anonymous post", async () => {
  const { data } = await omar.c.rpc("community_feed", {});
  const p = data.find((x) => x.id === postId);
  assert.ok(p && p.author_name === null && p.author_hue === null && p.is_mine === false);
});
await test("the author and staff can see who posted", async () => {
  const mine = (await zara.c.rpc("community_feed", {})).data.find((x) => x.id === postId);
  assert.ok(mine.is_mine && mine.author_name);
  const staff = (await amira.c.rpc("community_feed", {})).data.find((x) => x.id === postId);
  assert.ok(staff.author_name);
});
await test("post tables are not readable or writable directly", async () => {
  assert.equal(((await omar.c.from("posts").select("id")).data ?? []).length, 0);
  assert.ok((await omar.c.from("posts").insert({ author_id: omar.id, body: "x" })).error);
  assert.ok((await omar.c.from("post_comments").select("author_id")).error || ((await omar.c.from("post_comments").select("author_id")).data ?? []).length === 0);
});
await test("anonymous replies hide the author from students", async () => {
  assert.ifError((await omar.c.rpc("add_comment", { p_post: postId, p_body: "Breathing exercises help me.", p_anonymous: true })).error);
  const { data } = await zara.c.rpc("community_comments", { p_post: postId });
  assert.ok(data.length === 1 && data[0].author_name === null);
});
await test("only the author or staff can delete a post", async () => {
  assert.ok((await omar.c.rpc("delete_post", { p_post: postId })).error);
});
await test("three reports hide a post from students", async () => {
  const extra = await provision(`reporter${Date.now() % 100000}`, { full_name: "Reporter" });
  await omar.c.rpc("report_content", { p_post: postId, p_comment: null, p_reason: "test" });
  await extra.c.rpc("report_content", { p_post: postId, p_comment: null, p_reason: "test" });
  await amira.c.rpc("report_content", { p_post: postId, p_comment: null, p_reason: "test" });
  const visible = (await omar.c.rpc("community_feed", {})).data.some((x) => x.id === postId);
  assert.equal(visible, false);
  const staffView = (await amira.c.rpc("community_feed", {})).data.find((x) => x.id === postId);
  assert.ok(staffView?.hidden === true && staffView.report_count >= 3);
  await service.auth.admin.deleteUser(extra.id);
});
await test("staff can remove a post", async () => {
  assert.ifError((await amira.c.rpc("delete_post", { p_post: postId })).error);
});
await test("anonymous visitors can't read the community", async () => {
  assert.ok((await anon.rpc("community_feed", {})).error);
});

console.log("\nVoice notes");
const fakePath = () => `voices/${crypto.randomUUID()}.webm`;
let voiceId;
await test("anyone signed in can submit a voice note; it starts pending", async () => {
  const { data, error } = await zara.c.rpc("submit_voice_note", { p_category: "exam", p_language: "en", p_title: "You've got this", p_speaker_name: "Zara", p_anonymous: true, p_audio_path: fakePath(), p_mime: "audio/webm", p_duration: 30 });
  assert.ifError(error);
  voiceId = data;
  const { data: mine } = await zara.c.rpc("my_voice_notes");
  assert.equal(mine.find((v) => v.id === voiceId).status, "pending");
});
await test("voice notes can be up to two minutes, and no longer", async () => {
  const args = { p_category: "hope", p_language: "en", p_title: "Length check", p_speaker_name: "", p_anonymous: true, p_mime: "audio/webm" };
  assert.ok((await omar.c.rpc("submit_voice_note", { ...args, p_audio_path: fakePath(), p_duration: 130 })).error, "over two minutes must be refused");
  const { data: id, error } = await omar.c.rpc("submit_voice_note", { ...args, p_audio_path: fakePath(), p_duration: 118 });
  assert.ifError(error);
  assert.ifError((await omar.c.rpc("delete_voice_note", { p_id: id })).error);
});
await test("pending voice notes are not in the library", async () => {
  const { data } = await omar.c.rpc("voice_library", {});
  assert.ok(!data.some((v) => v.id === voiceId));
});
await test("students can't review or see the review queue", async () => {
  assert.ok((await omar.c.rpc("voice_review_queue")).error);
  assert.ok((await omar.c.rpc("review_voice_note", { p_id: voiceId, p_approve: true, p_note: "" })).error);
});
await test("staff review: approved notes appear, anonymous speakers stay unnamed", async () => {
  const { data: queue } = await amira.c.rpc("voice_review_queue");
  assert.ok(queue.some((v) => v.id === voiceId && v.author_name));
  assert.ifError((await amira.c.rpc("review_voice_note", { p_id: voiceId, p_approve: true, p_note: "" })).error);
  const { data } = await omar.c.rpc("voice_library", { p_category: "exam" });
  const v = data.find((x) => x.id === voiceId);
  assert.ok(v && v.speaker === null && !("author_id" in v));
});
await test("voice note tables are not readable directly", async () => {
  assert.equal(((await omar.c.from("voice_notes").select("id")).data ?? []).length, 0);
  assert.ok((await omar.c.from("voice_notes").insert({ author_id: omar.id, title: "x", category: "exam", audio_path: fakePath(), mime_type: "audio/webm", duration_seconds: 30, status: "approved" })).error);
});
await test("only the author or staff can delete a voice note", async () => {
  assert.ok((await omar.c.rpc("delete_voice_note", { p_id: voiceId })).error);
  assert.ifError((await zara.c.rpc("delete_voice_note", { p_id: voiceId })).error);
});
await test("anonymous visitors can't list voice notes", async () => {
  assert.ok((await anon.rpc("voice_library", {})).error);
});

console.log("\nDoodle Wall");
let doodleId;
await test("a student can post a doodle; others don't receive the answer", async () => {
  const { data, error } = await zara.c.rpc("create_doodle", { p_word: "Umbrella", p_image_path: `doodles/${crypto.randomUUID()}.png` });
  assert.ifError(error);
  doodleId = data;
  const d = (await omar.c.rpc("doodle_wall", {})).data.find((x) => x.id === doodleId);
  assert.ok(d && d.answer === null && d.hint === "________" && d.author_name === null);
});
await test("wrong guesses don't reveal the answer until the third try", async () => {
  const r1 = (await omar.c.rpc("guess_doodle", { p_id: doodleId, p_guess: "rain" })).data;
  assert.ok(r1.correct === false && r1.answer === null);
  await omar.c.rpc("guess_doodle", { p_id: doodleId, p_guess: "cloud" });
  const r3 = (await omar.c.rpc("guess_doodle", { p_id: doodleId, p_guess: "storm" })).data;
  assert.equal(r3.answer, "umbrella");
  const late = (await omar.c.rpc("guess_doodle", { p_id: doodleId, p_guess: "umbrella" })).data;
  assert.equal(late.correct, false, "no points after the answer was revealed");
});
await test("correct guesses are recognised (case, spaces and plurals)", async () => {
  const r = (await lina.c.rpc("guess_doodle", { p_id: doodleId, p_guess: "  UMBRELLAS " })).data;
  assert.equal(r.correct, true);
});
await test("authors can't guess their own doodle", async () => {
  assert.ok((await zara.c.rpc("guess_doodle", { p_id: doodleId, p_guess: "umbrella" })).error);
});
await test("doodle tables are not readable directly", async () => {
  assert.equal(((await omar.c.from("doodles").select("word")).data ?? []).length, 0);
});
await test("three reports hide a doodle from students", async () => {
  const extra = await provision(`dreporter${Date.now() % 100000}`, { full_name: "Reporter" });
  await omar.c.rpc("report_doodle", { p_id: doodleId });
  await lina.c.rpc("report_doodle", { p_id: doodleId });
  await extra.c.rpc("report_doodle", { p_id: doodleId });
  assert.ok(!(await omar.c.rpc("doodle_wall", {})).data.some((x) => x.id === doodleId));
  assert.ok((await amira.c.rpc("doodle_wall", {})).data.some((x) => x.id === doodleId));
  await service.auth.admin.deleteUser(extra.id);
  assert.ifError((await amira.c.rpc("delete_doodle", { p_id: doodleId })).error);
});

console.log("\nPending counselor sign-ups");
const COUNSELOR_META = { role_request: "counselor", contact_email: "pending@example.com", phone: "+923001110000", qualifications: "MA Counselling", experience_years: "3", expertise: ["career"] };
await test("counselor sign-ups without professional details are refused", async () => {
  const { error } = await provision(`nodetails${Date.now() % 100000}`, { full_name: "No Details", role_request: "counselor" });
  assert.ok(error, "email, phone, qualifications, experience and expertise are required");
});
await test("start pending with no access until approved", async () => {
  const { c, id, error } = await provision(`pending${Date.now() % 100000}`, { full_name: "Pending Person", ...COUNSELOR_META });
  assert.ifError(error);
  const { data: me } = await c.from("profiles").select("role, status").eq("id", id).single();
  assert.equal(me.status, "pending");
  assert.ok((await c.rpc("counselor_stats")).error);
  assert.equal((await c.from("conversations").select("id")).data.length, 0);
  await service.auth.admin.deleteUser(id);
});
await test("user metadata cannot grant admin", async () => {
  const { c, id } = await provision(`sneaky${Date.now() % 100000}`, { full_name: "Sneaky", role_request: "admin", role: "admin", provision_token: "guess" });
  const { data: me } = await c.from("profiles").select("role").eq("id", id).single();
  assert.equal(me.role, "student");
  await service.auth.admin.deleteUser(id);
});
await test("reserved usernames are refused (even via the auth API)", async () => {
  const { error } = await provision("administrator", { full_name: "Fake admin" });
  assert.ok(error, "reserved username must be rejected by the database");
});
await test("users cannot mint admin provisioning tokens", async () => {
  assert.ok((await zara.c.rpc("create_admin_provision_token")).error);
  assert.ok((await anon.rpc("create_admin_provision_token")).error);
});
await test("login-attempt records are invisible to users", async () => {
  assert.equal(((await zara.c.from("auth_attempts").select("id")).data ?? []).length, 0);
  assert.equal(((await anon.from("auth_attempts").select("id")).data ?? []).length, 0);
  assert.ok((await zara.c.from("auth_attempts").insert({ kind: "signup", ip: "x" })).error);
});
await test("public sign-up endpoint is disabled", async () => {
  const { error } = await client().auth.signUp({ email: `drive-by${Date.now()}@${domain}`, password, options: { data: { username: `driveby${Date.now() % 10000}` } } });
  assert.ok(error);
});

console.log("\nCounselor credentials and matching");
await test("students can't see counselors' contact details", async () => {
  assert.equal(((await zara.c.from("counselor_credentials").select("email, phone")).data ?? []).length, 0);
  const { data } = await zara.c.rpc("counselor_summaries", { p_ids: [amira.id, daniel.id] });
  assert.ok(data.length === 2 && data.every((r) => !("email" in r) && !("phone" in r)));
});
await test("counselors see only their own details; admins see all", async () => {
  const own = (await amira.c.from("counselor_credentials").select("counselor_id")).data ?? [];
  assert.ok(own.length === 1 && own[0].counselor_id === amira.id);
  assert.ok(((await admin.c.from("counselor_credentials").select("counselor_id")).data ?? []).length >= 2);
});
await test("counselors can't verify themselves; changing expertise needs re-verification", async () => {
  assert.ok((await amira.c.from("counselor_credentials").update({ verified_at: new Date().toISOString() }).eq("counselor_id", amira.id)).error);
  const before = (await amira.c.from("counselor_credentials").select("expertise").eq("counselor_id", amira.id).single()).data.expertise;
  assert.ifError((await amira.c.from("counselor_credentials").update({ expertise: [...before.filter((e) => e !== "grief"), "grief"] }).eq("counselor_id", amira.id)).error);
  assert.equal((await admin.c.from("counselor_credentials").select("verified_at").eq("counselor_id", amira.id).single()).data.verified_at, null);
  assert.ok((await daniel.c.rpc("admin_verify_counselor", { p_counselor: amira.id })).error, "only admins verify");
  await amira.c.from("counselor_credentials").update({ expertise: before }).eq("counselor_id", amira.id);
  assert.ifError((await admin.c.rpc("admin_verify_counselor", { p_counselor: amira.id })).error);
});
await test("matching picks the verified specialist, and never an unverified counselor", async () => {
  const s = await provision(`matcher${Date.now() % 100000}`, { full_name: "Matcher" });
  const family = (await s.c.rpc("match_counselor", { p_concern: "family", p_weights: { family: 1 }, p_urgent: false })).data[0];
  assert.equal(family.counselor_id, daniel.id);
  await service.from("counselor_credentials").update({ verified_at: null }).eq("counselor_id", daniel.id);
  const again = (await s.c.rpc("match_counselor", { p_concern: "family", p_weights: { family: 1 }, p_urgent: false })).data[0];
  assert.notEqual(again.counselor_id, daniel.id);
  await admin.c.rpc("admin_verify_counselor", { p_counselor: daniel.id });
  await service.auth.admin.deleteUser(s.id);
});
await test("only students can be matched; match records and admin overview are private", async () => {
  assert.ok((await amira.c.rpc("match_counselor", { p_concern: "family", p_weights: {}, p_urgent: false })).error);
  assert.equal(((await zara.c.from("counselor_matches").select("id")).data ?? []).length, 0);
  assert.ok((await zara.c.rpc("admin_matching_overview")).error);
  assert.ok((await amira.c.rpc("admin_matching_overview")).error);
});

console.log("\nPersonal toolkit");
await test("records are private to their owner, even from counselors and admins", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const rows = {
    reflection_entries: { entry_on: today, question_id: "energy", category: "emotional", question: "What has been taking most of your energy lately?", answer: "Private", skipped: false },
    behaviour_logs: { behaviour: "study", label: "Private log" },
    stress_entries: { sources: ["academic"], intensity: 3, frequency: "often" },
    academic_tasks: { title: "Private task", due_on: today },
    decisions: { title: "Private decision" },
    game_saves: { game: "pet", data: { name: "Mochi" } },
  };
  for (const [table, row] of Object.entries(rows)) {
    const ins = await zara.c.from(table).insert(row);
    assert.ifError(ins.error);
    for (const other of [omar, amira, admin]) assert.equal(((await other.c.from(table).select("user_id")).data ?? []).filter((r) => r.user_id === zara.id).length, 0, `${table} leaked`);
    assert.equal(((await anon.from(table).select("user_id")).data ?? []).length, 0);
    await omar.c.from(table).delete().eq("user_id", zara.id);
    assert.ok(((await zara.c.from(table).select("user_id")).data ?? []).length > 0, `${table} deleted by someone else`);
    assert.ok((await zara.c.from(table).insert({ ...row, ...(table === "game_saves" ? { game: "cozy" } : {}), user_id: omar.id })).error, `${table} accepted a spoofed owner`);
    await zara.c.from(table).delete().eq("user_id", zara.id);
  }
});

console.log("\nGratitude Wall");
let gpost;
await test("anonymous posts hide the author from students but not from staff", async () => {
  assert.equal((await zara.c.rpc("create_gratitude_post", { p_category: "kindness", p_body: "Someone shared their notes with me today.", p_anonymous: true, p_allow_comments: true })).data, "published");
  const mine = (await zara.c.rpc("gratitude_feed", {})).data.find((p) => p.is_mine);
  gpost = mine.id;
  const seen = (await omar.c.rpc("gratitude_feed", {})).data.find((p) => p.id === gpost);
  assert.ok(seen && seen.author_name === null);
  assert.equal((await amira.c.rpc("gratitude_feed", {})).data.find((p) => p.id === gpost).author_name, "Zara Ahmed");
});
await test("posts with contact details are held for review", async () => {
  assert.equal((await zara.c.rpc("create_gratitude_post", { p_category: "people", p_body: "Thanks! Message me on 0300 1234567", p_anonymous: true, p_allow_comments: true })).data, "held");
  assert.ok(!(await omar.c.rpc("gratitude_feed", {})).data.some((p) => p.body.includes("0300")));
  assert.ok((await amira.c.rpc("gratitude_feed", {})).data.some((p) => p.status === "held" && p.body.includes("0300")));
});
await test("tables can't be read directly and comments are screened", async () => {
  assert.equal(((await omar.c.from("gratitude_posts").select("id")).data ?? []).length, 0);
  assert.ok((await omar.c.rpc("add_gratitude_comment", { p_post: gpost, p_body: "add me @sneaky_handle", p_anonymous: true })).error);
  assert.ifError((await omar.c.rpc("add_gratitude_comment", { p_post: gpost, p_body: "That's really kind.", p_anonymous: true })).error);
});
await test("students can't moderate; three reports hold a post", async () => {
  assert.ok((await omar.c.rpc("moderate_gratitude_post", { p_post: gpost, p_status: "hidden" })).error);
  const extra = await provision(`greporter${Date.now() % 100000}`, { full_name: "Reporter" });
  for (const r of [omar, lina, extra]) await r.c.rpc("report_gratitude_post", { p_post: gpost, p_reason: "" });
  assert.ok(!(await omar.c.rpc("gratitude_feed", {})).data.some((p) => p.id === gpost));
  await service.auth.admin.deleteUser(extra.id);
  for (const p of (await zara.c.rpc("gratitude_feed", {})).data.filter((x) => x.is_mine)) await zara.c.rpc("delete_gratitude_post", { p_post: p.id });
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
