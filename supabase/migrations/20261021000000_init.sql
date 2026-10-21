-- skip-if: select to_regclass('public.profiles') is not null
-- =============================================================================
-- Beyond the Mirror: core schema
--
-- Security model (read this first):
--   * Every table has Row Level Security enabled. The browser only ever holds
--     the publishable/anon key, so RLS + column grants are the real boundary.
--   * Roles live in public.profiles.role and can NOT be changed by the user:
--     authenticated users only get UPDATE on a whitelist of harmless columns.
--     Role/status/assignment changes go through admin-only RPCs.
--   * Students see only their own conversations. Counselors see only
--     conversations assigned to them. Admins manage accounts and see
--     aggregate statistics, but have NO policy that lets them read messages,
--     subjects, case notes or feedback text.
--   * Multi-row writes (starting a request, booking, feedback) run inside
--     SECURITY DEFINER functions that re-check the caller's identity.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('student', 'counselor', 'admin');
create type public.account_status as enum ('active', 'pending', 'suspended');
create type public.request_category as enum (
  'academic', 'exams', 'career', 'wellbeing', 'friendship', 'family', 'bullying', 'other'
);
create type public.request_urgency as enum ('low', 'normal', 'high', 'urgent');
create type public.request_status as enum ('pending', 'in_progress', 'resolved');
create type public.counselor_presence as enum ('available', 'busy', 'away');
create type public.appointment_mode as enum ('in_person', 'online', 'phone');
create type public.appointment_status as enum ('confirmed', 'completed', 'cancelled');
create type public.announcement_audience as enum ('everyone', 'all_students', 'my_students', 'counselors');

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  role          public.user_role not null default 'student',
  status        public.account_status not null default 'active',
  full_name     text not null check (char_length(full_name) between 1 and 80),
  email         text not null,
  avatar_hue    smallint not null default (floor(random() * 360))::smallint
                check (avatar_hue between 0 and 359),
  -- student fields
  grade         text check (grade is null or char_length(grade) <= 40),
  counselor_id  uuid references public.profiles (id) on delete set null,
  -- counselor fields
  title         text check (title is null or char_length(title) <= 80),
  bio           text check (bio is null or char_length(bio) <= 600),
  specialties   text[] not null default '{}' check (cardinality(specialties) <= 8),
  office_hours  text check (office_hours is null or char_length(office_hours) <= 120),
  presence      public.counselor_presence not null default 'available',
  whatsapp      text check (whatsapp is null or whatsapp ~ '^\+?[0-9 ]{7,20}$'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index profiles_counselor_idx on public.profiles (counselor_id);
create index profiles_role_idx on public.profiles (role, status);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so policies don't recurse into RLS)
-- ---------------------------------------------------------------------------
create or replace function public.current_role_active()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid() and status = 'active'
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_role_active() = 'admin', false) $$;

create or replace function public.is_counselor()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_role_active() = 'counselor', false) $$;

create or replace function public.my_counselor_id()
returns uuid language sql stable security definer set search_path = ''
as $$ select counselor_id from public.profiles where id = auth.uid() $$;

-- ---------------------------------------------------------------------------
-- Conversations (a "request" a student opens with their counselor)
-- ---------------------------------------------------------------------------
create table public.conversations (
  id                      uuid primary key default gen_random_uuid(),
  student_id              uuid not null references public.profiles (id) on delete cascade,
  counselor_id            uuid references public.profiles (id) on delete set null,
  subject                 text not null check (char_length(subject) between 3 and 120),
  category                public.request_category not null default 'other',
  urgency                 public.request_urgency not null default 'normal',
  status                  public.request_status not null default 'pending',
  last_message_at         timestamptz not null default now(),
  last_message_preview    text,
  last_message_sender     uuid,
  student_last_read_at    timestamptz not null default now(),
  counselor_last_read_at  timestamptz,
  first_response_at       timestamptz,
  resolved_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index conversations_student_idx on public.conversations (student_id, last_message_at desc);
create index conversations_counselor_idx on public.conversations (counselor_id, status, last_message_at desc);

create or replace function public.can_access_conversation(cid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = cid
      and (
        c.student_id = auth.uid()
        or (c.counselor_id = auth.uid() and public.is_counselor())
      )
  )
$$;

-- A counselor may see a student's profile if assigned, or if they share a conversation.
create or replace function public.counselor_can_see_student(sid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_counselor() and exists (
    select 1 from public.profiles p where p.id = sid and p.counselor_id = auth.uid()
    union all
    select 1 from public.conversations c where c.student_id = sid and c.counselor_id = auth.uid()
  )
$$;

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------
create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  sender_id        uuid references public.profiles (id) on delete set null,
  body             text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at       timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Private case notes (visible only to the counselor who wrote them)
-- ---------------------------------------------------------------------------
create table public.case_notes (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  body        text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at  timestamptz not null default now()
);

create index case_notes_student_idx on public.case_notes (student_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Availability & appointments
-- ---------------------------------------------------------------------------
create table public.availability_slots (
  id            uuid primary key default gen_random_uuid(),
  counselor_id  uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  mode          public.appointment_mode not null default 'in_person',
  location      text check (location is null or char_length(location) <= 120),
  created_at    timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at - starts_at <= interval '3 hours')
);

create index availability_counselor_idx on public.availability_slots (counselor_id, starts_at);

create table public.appointments (
  id               uuid primary key default gen_random_uuid(),
  slot_id          uuid not null references public.availability_slots (id) on delete cascade,
  student_id       uuid not null references public.profiles (id) on delete cascade,
  counselor_id     uuid not null references public.profiles (id) on delete cascade,
  status           public.appointment_status not null default 'confirmed',
  reason           text check (reason is null or char_length(reason) <= 500),
  cancel_reason    text check (cancel_reason is null or char_length(cancel_reason) <= 300),
  cancelled_by     uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- One live booking per slot. Cancelled bookings free the slot again.
create unique index appointments_one_active_per_slot
  on public.appointments (slot_id) where status <> 'cancelled';
create index appointments_student_idx on public.appointments (student_id, created_at desc);
create index appointments_counselor_idx on public.appointments (counselor_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Feedback (after a session or a resolved request)
-- ---------------------------------------------------------------------------
create table public.feedback (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.profiles (id) on delete cascade,
  counselor_id     uuid references public.profiles (id) on delete set null,
  appointment_id   uuid unique references public.appointments (id) on delete cascade,
  conversation_id  uuid unique references public.conversations (id) on delete cascade,
  rating           smallint not null check (rating between 1 and 5),
  comment          text check (comment is null or char_length(comment) <= 1000),
  created_at       timestamptz not null default now(),
  check ((appointment_id is null) <> (conversation_id is null))
);

create index feedback_counselor_idx on public.feedback (counselor_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  href        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------
create table public.announcements (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  title       text not null check (char_length(title) between 3 and 120),
  body        text not null check (char_length(body) between 1 and 2000),
  audience    public.announcement_audience not null default 'all_students',
  pinned      boolean not null default false,
  created_at  timestamptz not null default now()
);

create index announcements_created_idx on public.announcements (created_at desc);

-- =============================================================================
-- Grants: deny by default, then allow narrowly.
-- =============================================================================
revoke all on all tables in schema public from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, grade, title, bio, specialties, office_hours, presence, whatsapp, avatar_hue)
  on public.profiles to authenticated;

grant select on public.conversations to authenticated;
grant update (status, category, urgency) on public.conversations to authenticated;

grant select, insert on public.messages to authenticated;
grant select, insert, delete on public.case_notes to authenticated;
grant select, insert, delete on public.availability_slots to authenticated;
grant select on public.appointments to authenticated;
grant select on public.feedback to authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select, insert, delete on public.announcements to authenticated;
grant update (pinned) on public.announcements to authenticated;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.case_notes enable row level security;
alter table public.availability_slots enable row level security;
alter table public.appointments enable row level security;
alter table public.feedback enable row level security;
alter table public.notifications enable row level security;
alter table public.announcements enable row level security;

-- profiles --------------------------------------------------------------------
create policy "profiles: read self" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles: read active counselors" on public.profiles
  for select to authenticated using (role = 'counselor' and status = 'active');
create policy "profiles: counselors read their students" on public.profiles
  for select to authenticated using (public.counselor_can_see_student(id));
create policy "profiles: admins read all" on public.profiles
  for select to authenticated using (public.is_admin());
create policy "profiles: update self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- conversations ---------------------------------------------------------------
create policy "conversations: participants read" on public.conversations
  for select to authenticated
  using (student_id = auth.uid() or (counselor_id = auth.uid() and public.is_counselor()));
create policy "conversations: participants update" on public.conversations
  for update to authenticated
  using (student_id = auth.uid() or (counselor_id = auth.uid() and public.is_counselor()))
  with check (student_id = auth.uid() or (counselor_id = auth.uid() and public.is_counselor()));

-- messages --------------------------------------------------------------------
create policy "messages: participants read" on public.messages
  for select to authenticated using (public.can_access_conversation(conversation_id));
create policy "messages: participants send" on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.can_access_conversation(conversation_id));

-- case notes ------------------------------------------------------------------
create policy "case_notes: author reads" on public.case_notes
  for select to authenticated using (author_id = auth.uid() and public.is_counselor());
create policy "case_notes: counselor writes for own students" on public.case_notes
  for insert to authenticated
  with check (author_id = auth.uid() and public.counselor_can_see_student(student_id));
create policy "case_notes: author deletes" on public.case_notes
  for delete to authenticated using (author_id = auth.uid());

-- availability ----------------------------------------------------------------
create policy "slots: counselor reads own" on public.availability_slots
  for select to authenticated using (counselor_id = auth.uid());
create policy "slots: students read their counselor's" on public.availability_slots
  for select to authenticated using (counselor_id = public.my_counselor_id());
create policy "slots: counselor creates own" on public.availability_slots
  for insert to authenticated
  with check (counselor_id = auth.uid() and public.is_counselor() and starts_at > now());
create policy "slots: counselor deletes own" on public.availability_slots
  for delete to authenticated using (counselor_id = auth.uid());

-- appointments ----------------------------------------------------------------
create policy "appointments: participants read" on public.appointments
  for select to authenticated
  using (student_id = auth.uid() or (counselor_id = auth.uid() and public.is_counselor()));

-- feedback --------------------------------------------------------------------
create policy "feedback: student reads own" on public.feedback
  for select to authenticated using (student_id = auth.uid());
create policy "feedback: counselor reads own" on public.feedback
  for select to authenticated using (counselor_id = auth.uid() and public.is_counselor());

-- notifications ---------------------------------------------------------------
create policy "notifications: owner reads" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications: owner marks read" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications: owner deletes" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- announcements ---------------------------------------------------------------
create policy "announcements: audience reads" on public.announcements
  for select to authenticated
  using (
    author_id = auth.uid()
    or public.is_admin()
    or audience = 'everyone'
    or (audience = 'all_students' and public.current_role_active() = 'student')
    or (audience = 'my_students' and author_id = public.my_counselor_id())
    or (audience = 'counselors' and public.current_role_active() in ('counselor', 'admin'))
  );
create policy "announcements: staff publish" on public.announcements
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      public.is_admin()
      or (public.is_counselor() and audience in ('all_students', 'my_students', 'counselors'))
    )
  );
create policy "announcements: author or admin deletes" on public.announcements
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());
create policy "announcements: author or admin pins" on public.announcements
  for update to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

-- =============================================================================
-- Triggers
-- =============================================================================

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger conversations_touch before update on public.conversations
  for each row execute function public.touch_updated_at();
create trigger appointments_touch before update on public.appointments
  for each row execute function public.touch_updated_at();

-- Internal helper for writing notifications from definer functions/triggers.
create or replace function public.notify(
  p_user uuid, p_kind text, p_title text, p_body text, p_href text
) returns void language sql security definer set search_path = ''
as $$
  insert into public.notifications (user_id, kind, title, body, href)
  select p_user, p_kind, p_title, left(p_body, 160), p_href
  where p_user is not null
$$;
revoke execute on function public.notify(uuid, text, text, text, text) from public, anon, authenticated;

-- New auth user -> profile. Counselor sign-ups start as "pending" until an
-- admin approves them; everything else becomes an active student.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  wants_counselor boolean := coalesce(new.raw_user_meta_data ->> 'role_request', '') = 'counselor';
  v_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
begin
  insert into public.profiles (id, email, full_name, role, status, grade)
  values (
    new.id,
    new.email,
    left(coalesce(v_name, split_part(new.email, '@', 1)), 80),
    case when wants_counselor then 'counselor'::public.user_role else 'student'::public.user_role end,
    case when wants_counselor then 'pending'::public.account_status else 'active'::public.account_status end,
    case when wants_counselor then null else left(nullif(btrim(new.raw_user_meta_data ->> 'grade'), ''), 40) end
  );

  if wants_counselor then
    insert into public.notifications (user_id, kind, title, body, href)
    select p.id, 'counselor_request', 'New counselor account awaiting approval',
           left(coalesce(v_name, new.email), 160), '/admin/users?status=pending'
    from public.profiles p where p.role = 'admin' and p.status = 'active';
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Message side-effects: conversation summary, status transitions, notifications,
-- and a simple per-user rate limit.
create or replace function public.before_message_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (select count(*) from public.messages
      where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'You are sending messages too quickly. Please wait a moment.'
      using errcode = 'P0001';
  end if;
  new.body := btrim(new.body);
  new.created_at := now();
  return new;
end $$;

create trigger messages_before_insert before insert on public.messages
  for each row execute function public.before_message_insert();

create or replace function public.after_message_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  conv public.conversations;
  sender_is_student boolean;
  sender_name text;
begin
  select * into conv from public.conversations where id = new.conversation_id for update;
  sender_is_student := new.sender_id = conv.student_id;
  select full_name into sender_name from public.profiles where id = new.sender_id;

  -- The message notification below already covers the implied status change.
  perform set_config('btm.quiet_status', 'on', true);
  update public.conversations set
    last_message_at = new.created_at,
    last_message_preview = left(new.body, 140),
    last_message_sender = new.sender_id,
    student_last_read_at = case when sender_is_student then new.created_at else student_last_read_at end,
    counselor_last_read_at = case when not sender_is_student then new.created_at else counselor_last_read_at end,
    first_response_at = case
      when not sender_is_student and first_response_at is null then new.created_at
      else first_response_at end,
    status = case
      when sender_is_student and status = 'resolved' then 'pending'::public.request_status
      when not sender_is_student and status = 'pending' then 'in_progress'::public.request_status
      else status end,
    resolved_at = case when sender_is_student and status = 'resolved' then null else resolved_at end
  where id = conv.id;
  perform set_config('btm.quiet_status', 'off', true);

  if sender_is_student then
    perform public.notify(conv.counselor_id, 'message',
      case when conv.status = 'resolved' then 'Request reopened: ' else 'New message: ' end || conv.subject,
      sender_name || ': ' || new.body, '/counselor/inbox/' || conv.id);
  else
    perform public.notify(conv.student_id, 'message',
      'Your counselor replied', sender_name || ': ' || new.body, '/student/messages/' || conv.id);
  end if;
  return null;
end $$;

create trigger messages_after_insert after insert on public.messages
  for each row execute function public.after_message_insert();

-- Status changes: students may only resolve or reopen; timestamps + notify.
create or replace function public.before_conversation_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is not null and auth.uid() = old.student_id then
    -- Students can mark resolved / reopen, nothing else.
    new.category := old.category;
    new.urgency := old.urgency;
    if new.status = 'in_progress' and old.status <> 'in_progress' then
      new.status := 'pending';
    end if;
  end if;

  if new.status = 'resolved' and old.status <> 'resolved' then
    new.resolved_at := now();
  elsif new.status <> 'resolved' then
    new.resolved_at := null;
  end if;

  if new.status <> old.status and auth.uid() is not null
     and coalesce(current_setting('btm.quiet_status', true), 'off') <> 'on' then
    if auth.uid() = old.student_id then
      perform public.notify(old.counselor_id, 'status',
        'Request ' || replace(new.status::text, '_', ' ') || ': ' || old.subject,
        'Updated by the student.', '/counselor/inbox/' || old.id);
    else
      perform public.notify(old.student_id, 'status',
        case new.status
          when 'resolved' then 'Your request was marked resolved'
          when 'in_progress' then 'Your counselor is working on your request'
          else 'Your request was reopened' end,
        old.subject, '/student/messages/' || old.id);
    end if;
  end if;
  return new;
end $$;

create trigger conversations_before_update before update of status, category, urgency on public.conversations
  for each row execute function public.before_conversation_update();

-- Don't let a counselor delete a slot that has a live booking.
create or replace function public.before_slot_delete()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.appointments a
             where a.slot_id = old.id and a.status = 'confirmed') then
    raise exception 'This time slot has a booking. Cancel the appointment first.'
      using errcode = 'P0001';
  end if;
  return old;
end $$;

create trigger availability_before_delete before delete on public.availability_slots
  for each row execute function public.before_slot_delete();

-- =============================================================================
-- RPCs (called from server actions with the user's session)
-- =============================================================================

-- Start a new request with its first message. Auto-assigns a counselor
-- (lightest caseload) if the student doesn't have one yet.
create or replace function public.start_conversation(
  p_subject text,
  p_category public.request_category,
  p_urgency public.request_urgency,
  p_body text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  me public.profiles;
  assigned uuid;
  new_id uuid;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role <> 'student' or me.status <> 'active' then
    raise exception 'Only active student accounts can open a request.' using errcode = '42501';
  end if;

  if (select count(*) from public.conversations
      where student_id = me.id and created_at > now() - interval '1 day') >= 8 then
    raise exception 'You have opened several requests today. Please continue in an existing conversation.'
      using errcode = 'P0001';
  end if;

  assigned := me.counselor_id;
  if assigned is null or not exists (
    select 1 from public.profiles where id = assigned and role = 'counselor' and status = 'active'
  ) then
    select c.id into assigned
    from public.profiles c
    where c.role = 'counselor' and c.status = 'active'
    order by (select count(*) from public.profiles s where s.counselor_id = c.id), c.created_at
    limit 1;

    if assigned is null then
      raise exception 'No counselor is available on the platform yet. Please try again later.'
        using errcode = 'P0001';
    end if;
    update public.profiles set counselor_id = assigned where id = me.id;
  end if;

  insert into public.conversations (student_id, counselor_id, subject, category, urgency)
  values (me.id, assigned, btrim(p_subject), p_category, p_urgency)
  returning id into new_id;

  insert into public.messages (conversation_id, sender_id, body)
  values (new_id, me.id, p_body);

  if p_urgency = 'urgent' then
    perform public.notify(assigned, 'urgent', 'Urgent request from ' || me.full_name,
      btrim(p_subject), '/counselor/inbox/' || new_id);
  end if;

  return new_id;
end $$;

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update public.conversations set
    student_last_read_at = case when student_id = auth.uid() then now() else student_last_read_at end,
    counselor_last_read_at = case when counselor_id = auth.uid() then now() else counselor_last_read_at end
  where id = p_conversation
    and (student_id = auth.uid() or counselor_id = auth.uid());

  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null and href like '%' || p_conversation::text;
end $$;

-- Book an open slot with the caller's assigned counselor.
create or replace function public.book_appointment(p_slot uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  me public.profiles;
  slot public.availability_slots;
  new_id uuid;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role <> 'student' or me.status <> 'active' then
    raise exception 'Only active student accounts can book sessions.' using errcode = '42501';
  end if;

  select * into slot from public.availability_slots where id = p_slot for update;
  if slot.id is null or slot.counselor_id is distinct from me.counselor_id then
    raise exception 'That time slot is not available.' using errcode = 'P0001';
  end if;
  if slot.starts_at <= now() then
    raise exception 'That time slot has already started.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.appointments
             where student_id = me.id and status = 'confirmed'
               and slot_id in (select id from public.availability_slots where starts_at > now())
             having count(*) >= 3) then
    raise exception 'You already have 3 upcoming sessions booked.' using errcode = 'P0001';
  end if;

  begin
    insert into public.appointments (slot_id, student_id, counselor_id, reason)
    values (slot.id, me.id, slot.counselor_id, nullif(btrim(p_reason), ''))
    returning id into new_id;
  exception when unique_violation then
    raise exception 'Someone just booked that time. Please pick another slot.' using errcode = 'P0001';
  end;

  perform public.notify(slot.counselor_id, 'appointment', 'New session booked',
    me.full_name || ' booked one of your open times.', '/counselor/schedule');
  return new_id;
end $$;

-- Open (unbooked, future) slots of the caller's counselor. Students cannot read
-- other students' appointments, so availability is computed here.
create or replace function public.open_slots()
returns setof public.availability_slots
language sql stable security definer set search_path = ''
as $$
  select s.* from public.availability_slots s
  where s.counselor_id = public.my_counselor_id()
    and s.starts_at > now()
    and not exists (
      select 1 from public.appointments a where a.slot_id = s.id and a.status <> 'cancelled'
    )
  order by s.starts_at
  limit 200
$$;

-- Cancel (student or counselor) or complete (counselor) an appointment.
create or replace function public.update_appointment(
  p_appointment uuid, p_status public.appointment_status, p_reason text
) returns void language plpgsql security definer set search_path = ''
as $$
declare
  appt public.appointments;
  is_student boolean;
  is_owner_counselor boolean;
begin
  select * into appt from public.appointments where id = p_appointment for update;
  if appt.id is null then raise exception 'Appointment not found.' using errcode = 'P0002'; end if;

  is_student := appt.student_id = auth.uid();
  is_owner_counselor := appt.counselor_id = auth.uid() and public.is_counselor();
  if not (is_student or is_owner_counselor) then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  if appt.status <> 'confirmed' then
    raise exception 'This appointment is already %.', appt.status using errcode = 'P0001';
  end if;

  if p_status = 'cancelled' then
    update public.appointments
      set status = 'cancelled', cancelled_by = auth.uid(), cancel_reason = nullif(btrim(p_reason), '')
      where id = appt.id;
    if is_student then
      perform public.notify(appt.counselor_id, 'appointment', 'A student cancelled a session',
        coalesce(nullif(btrim(p_reason), ''), 'The time is open for booking again.'), '/counselor/schedule');
    else
      perform public.notify(appt.student_id, 'appointment', 'Your session was cancelled',
        coalesce(nullif(btrim(p_reason), ''), 'Your counselor cancelled this session. You can book another time.'),
        '/student/appointments');
    end if;
  elsif p_status = 'completed' then
    if not is_owner_counselor then
      raise exception 'Only the counselor can mark a session complete.' using errcode = '42501';
    end if;
    update public.appointments set status = 'completed' where id = appt.id;
    perform public.notify(appt.student_id, 'feedback', 'How did your session go?',
      'Your feedback helps your counselor support you better.', '/student/appointments');
  else
    raise exception 'Unsupported status.' using errcode = '22023';
  end if;
end $$;

create or replace function public.leave_feedback(
  p_appointment uuid, p_conversation uuid, p_rating smallint, p_comment text
) returns void language plpgsql security definer set search_path = ''
as $$
declare
  cid uuid;
begin
  if p_appointment is not null then
    select counselor_id into cid from public.appointments
      where id = p_appointment and student_id = auth.uid() and status = 'completed';
  elsif p_conversation is not null then
    select counselor_id into cid from public.conversations
      where id = p_conversation and student_id = auth.uid() and status = 'resolved';
  end if;
  if cid is null then
    raise exception 'Feedback can be left after a completed session or resolved request.'
      using errcode = 'P0001';
  end if;

  insert into public.feedback (student_id, counselor_id, appointment_id, conversation_id, rating, comment)
  values (auth.uid(), cid, p_appointment, p_conversation, p_rating, nullif(btrim(p_comment), ''))
  on conflict do nothing;
end $$;

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_user(
  p_user uuid, p_role public.user_role, p_status public.account_status
) returns void language plpgsql security definer set search_path = ''
as $$
declare
  target public.profiles;
begin
  if not public.is_admin() then raise exception 'Admins only.' using errcode = '42501'; end if;
  if p_user = auth.uid() then
    raise exception 'You cannot change your own role or status.' using errcode = 'P0001';
  end if;
  select * into target from public.profiles where id = p_user for update;
  if target.id is null then raise exception 'User not found.' using errcode = 'P0002'; end if;

  update public.profiles set
    role = coalesce(p_role, role),
    status = coalesce(p_status, status),
    counselor_id = case when coalesce(p_role, role) <> 'student' then null else counselor_id end
  where id = p_user;

  -- A counselor who leaves the role releases their students for reassignment.
  if target.role = 'counselor' and (coalesce(p_role, target.role) <> 'counselor'
                                    or coalesce(p_status, target.status) = 'suspended') then
    update public.profiles set counselor_id = null where counselor_id = p_user;
  end if;

  if target.status = 'pending' and p_status = 'active' then
    perform public.notify(p_user, 'account', 'Your account has been approved',
      'Welcome aboard. Your dashboard is ready.', '/' || coalesce(p_role, target.role)::text);
  end if;
end $$;

create or replace function public.admin_assign_counselor(
  p_student uuid, p_counselor uuid, p_move_open boolean default true
) returns void language plpgsql security definer set search_path = ''
as $$
declare
  counselor_name text;
begin
  if not public.is_admin() then raise exception 'Admins only.' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = p_student and role = 'student') then
    raise exception 'Student not found.' using errcode = 'P0002';
  end if;
  if p_counselor is not null then
    select full_name into counselor_name from public.profiles
      where id = p_counselor and role = 'counselor' and status = 'active';
    if counselor_name is null then
      raise exception 'Choose an active counselor.' using errcode = 'P0001';
    end if;
  end if;

  update public.profiles set counselor_id = p_counselor where id = p_student;

  if p_move_open and p_counselor is not null then
    update public.conversations set counselor_id = p_counselor, counselor_last_read_at = null
      where student_id = p_student and status <> 'resolved';
  end if;

  if p_counselor is not null then
    perform public.notify(p_student, 'account', 'You have a counselor',
      counselor_name || ' is now your counselor.', '/student');
    perform public.notify(p_counselor, 'account', 'New student assigned',
      (select full_name from public.profiles where id = p_student), '/counselor/students/' || p_student);
  end if;
end $$;

-- Aggregate-only statistics. Admins never receive subjects or message text.
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admins only.' using errcode = '42501'; end if;
  return jsonb_build_object(
    'students', (select count(*) from public.profiles where role = 'student' and status = 'active'),
    'counselors', (select count(*) from public.profiles where role = 'counselor' and status = 'active'),
    'pending_accounts', (select count(*) from public.profiles where status = 'pending'),
    'unassigned_students', (select count(*) from public.profiles
                            where role = 'student' and status = 'active' and counselor_id is null),
    'requests_by_status', (select coalesce(jsonb_object_agg(status, n), '{}') from
                            (select status, count(*) n from public.conversations group by status) s),
    'requests_by_category', (select coalesce(jsonb_object_agg(category, n), '{}') from
                            (select category, count(*) n from public.conversations group by category) s),
    'requests_last_30d', (select count(*) from public.conversations where created_at > now() - interval '30 days'),
    'messages_last_7d', (select count(*) from public.messages where created_at > now() - interval '7 days'),
    'appointments_upcoming', (select count(*) from public.appointments a
                              join public.availability_slots s on s.id = a.slot_id
                              where a.status = 'confirmed' and s.starts_at > now()),
    'appointments_completed', (select count(*) from public.appointments where status = 'completed'),
    'avg_rating', (select round(avg(rating)::numeric, 2) from public.feedback),
    'median_first_response_minutes', (
      select round((percentile_cont(0.5) within group (
        order by extract(epoch from first_response_at - created_at) / 60))::numeric, 0)
      from public.conversations where first_response_at is not null),
    'daily_requests', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'count', coalesce(n, 0)) order by d), '[]')
      from generate_series(current_date - 13, current_date, interval '1 day') d
      left join (select created_at::date dd, count(*) n from public.conversations
                 where created_at > current_date - 14 group by 1) c on c.dd = d::date),
    'caseloads', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.full_name, 'presence', c.presence,
        'students', (select count(*) from public.profiles s where s.counselor_id = c.id),
        'open', (select count(*) from public.conversations v where v.counselor_id = c.id and v.status <> 'resolved')
      ) order by c.full_name), '[]')
      from public.profiles c where c.role = 'counselor' and c.status = 'active')
  );
end $$;

create or replace function public.counselor_stats()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if not public.is_counselor() then raise exception 'Counselors only.' using errcode = '42501'; end if;
  return jsonb_build_object(
    'students', (select count(*) from public.profiles where counselor_id = me),
    'pending', (select count(*) from public.conversations where counselor_id = me and status = 'pending'),
    'in_progress', (select count(*) from public.conversations where counselor_id = me and status = 'in_progress'),
    'urgent_open', (select count(*) from public.conversations
                    where counselor_id = me and status <> 'resolved' and urgency in ('high', 'urgent')),
    'awaiting_reply', (select count(*) from public.conversations
                       where counselor_id = me and status <> 'resolved' and last_message_sender = student_id),
    'resolved_7d', (select count(*) from public.conversations
                    where counselor_id = me and resolved_at > now() - interval '7 days'),
    'median_first_response_minutes', (
      select round((percentile_cont(0.5) within group (
        order by extract(epoch from first_response_at - created_at) / 60))::numeric, 0)
      from public.conversations where counselor_id = me and first_response_at is not null),
    'avg_rating', (select round(avg(rating)::numeric, 2) from public.feedback where counselor_id = me),
    'ratings_count', (select count(*) from public.feedback where counselor_id = me),
    'sessions_upcoming', (select count(*) from public.appointments a
                          join public.availability_slots s on s.id = a.slot_id
                          where a.counselor_id = me and a.status = 'confirmed' and s.starts_at > now()),
    'by_category', (select coalesce(jsonb_object_agg(category, n), '{}') from
                    (select category, count(*) n from public.conversations
                     where counselor_id = me group by category) s)
  );
end $$;

-- Lock down function execution: no anonymous access to anything.
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.current_role_active(), public.is_admin(), public.is_counselor(), public.my_counselor_id(),
  public.can_access_conversation(uuid), public.counselor_can_see_student(uuid),
  public.start_conversation(text, public.request_category, public.request_urgency, text),
  public.mark_conversation_read(uuid),
  public.book_appointment(uuid, text), public.open_slots(),
  public.update_appointment(uuid, public.appointment_status, text),
  public.leave_feedback(uuid, uuid, smallint, text),
  public.admin_update_user(uuid, public.user_role, public.account_status),
  public.admin_assign_counselor(uuid, uuid, boolean),
  public.admin_stats(), public.counselor_stats()
to authenticated;

alter default privileges in schema public revoke execute on functions from public, anon;

-- =============================================================================
-- Realtime: stream inserts/updates (RLS still applies to subscribers)
-- =============================================================================
alter publication supabase_realtime add table public.messages, public.conversations, public.notifications;
