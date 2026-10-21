-- skip-if: select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'conversations' and column_name = 'is_anonymous')
-- =============================================================================
-- 1. Anonymous conversations
--    A student can message their counselor without revealing who they are.
--    For anonymous conversations the owner is kept in a private table, the
--    conversation's student_id is NULL and the student's messages carry no
--    sender_id, so nothing a counselor can query links the thread to a person.
--
-- 2. Community board
--    Posts (optionally with a photo) and replies. Anonymous posts hide the
--    author from other students; counselors and the admin can still see who
--    posted, for safeguarding. All reads go through functions that mask names,
--    so the base tables are never exposed to the API.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Anonymous conversations
-- ---------------------------------------------------------------------------
alter table public.conversations alter column student_id drop not null;
alter table public.conversations add column is_anonymous boolean not null default false;
alter table public.conversations add column last_from_student boolean not null default true;
update public.conversations set last_from_student = (last_message_sender is not distinct from student_id);

alter table public.messages add column from_student boolean not null default false;
update public.messages m set from_student = (m.sender_id = c.student_id)
from public.conversations c where c.id = m.conversation_id;

create table private.anonymous_owners (
  conversation_id  uuid primary key references public.conversations (id) on delete cascade,
  student_id       uuid not null references public.profiles (id) on delete cascade
);
create index anonymous_owners_student_idx on private.anonymous_owners (student_id);

-- Does the CALLER own this conversation (named or anonymous)? Reveals nothing else.
create or replace function public.is_conversation_owner(cid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.conversations c where c.id = cid and c.student_id = auth.uid())
      or exists (select 1 from private.anonymous_owners o where o.conversation_id = cid and o.student_id = auth.uid())
$$;

create or replace function public.can_access_conversation(cid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_conversation_owner(cid) or exists (
    select 1 from public.conversations c
    where c.id = cid and c.counselor_id = auth.uid() and public.is_counselor()
  )
$$;

drop policy "conversations: participants read" on public.conversations;
drop policy "conversations: participants update" on public.conversations;
create policy "conversations: participants read" on public.conversations
  for select to authenticated
  using (public.is_conversation_owner(id) or (counselor_id = auth.uid() and public.is_counselor()));
create policy "conversations: participants update" on public.conversations
  for update to authenticated
  using (public.is_conversation_owner(id) or (counselor_id = auth.uid() and public.is_counselor()))
  with check (public.is_conversation_owner(id) or (counselor_id = auth.uid() and public.is_counselor()));

-- from_student and sender_id are always computed by the trigger below.
drop policy "messages: participants send" on public.messages;
create policy "messages: participants send" on public.messages
  for insert to authenticated
  with check (
    public.can_access_conversation(conversation_id)
    and (sender_id = auth.uid() or (sender_id is null and from_student))
  );

create or replace function public.before_message_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  conv public.conversations;
  v_owner uuid;
  actor uuid := coalesce(auth.uid(), new.sender_id);
begin
  select * into conv from public.conversations where id = new.conversation_id;
  v_owner := coalesce(conv.student_id,
    (select o.student_id from private.anonymous_owners o where o.conversation_id = conv.id));

  if (select count(*) from public.messages m
      where m.created_at > now() - interval '1 minute'
        and (m.sender_id = actor
             or (m.from_student and m.conversation_id in
                 (select o.conversation_id from private.anonymous_owners o where o.student_id = actor)))) >= 20 then
    raise exception 'You are sending messages too quickly. Please wait a moment.' using errcode = 'P0001';
  end if;

  new.from_student := actor is not null and actor = v_owner;
  new.sender_id := case when conv.is_anonymous and new.from_student then null else actor end;
  new.body := btrim(new.body);
  new.created_at := now();
  return new;
end $$;

create or replace function public.after_message_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  conv public.conversations;
  v_owner uuid;
  sender_name text;
begin
  select * into conv from public.conversations where id = new.conversation_id for update;
  v_owner := coalesce(conv.student_id,
    (select o.student_id from private.anonymous_owners o where o.conversation_id = conv.id));

  if new.from_student then
    sender_name := case when conv.is_anonymous then 'Anonymous student'
                        else (select full_name from public.profiles where id = v_owner) end;
  else
    select full_name into sender_name from public.profiles where id = new.sender_id;
  end if;

  -- The message notification below already covers the implied status change.
  perform set_config('btm.quiet_status', 'on', true);
  update public.conversations set
    last_message_at = new.created_at,
    last_message_preview = left(new.body, 140),
    last_message_sender = new.sender_id,
    last_from_student = new.from_student,
    student_last_read_at = case when new.from_student then new.created_at else student_last_read_at end,
    counselor_last_read_at = case when not new.from_student then new.created_at else counselor_last_read_at end,
    first_response_at = case
      when not new.from_student and first_response_at is null then new.created_at
      else first_response_at end,
    status = case
      when new.from_student and status = 'resolved' then 'pending'::public.request_status
      when not new.from_student and status = 'pending' then 'in_progress'::public.request_status
      else status end,
    resolved_at = case when new.from_student and status = 'resolved' then null else resolved_at end
  where id = conv.id;
  perform set_config('btm.quiet_status', 'off', true);

  if new.from_student then
    perform public.notify(conv.counselor_id, 'message',
      case when conv.status = 'resolved' then 'Request reopened: ' else 'New message: ' end || conv.subject,
      coalesce(sender_name, 'Student') || ': ' || new.body, '/counselor/inbox/' || conv.id);
  else
    perform public.notify(v_owner, 'message',
      'Your counselor replied', coalesce(sender_name, 'Your counselor') || ': ' || new.body, '/student/messages/' || conv.id);
  end if;
  return null;
end $$;

create or replace function public.before_conversation_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_owner uuid := coalesce(old.student_id,
    (select o.student_id from private.anonymous_owners o where o.conversation_id = old.id));
begin
  if auth.uid() is not null and auth.uid() = v_owner then
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
    if auth.uid() = v_owner then
      perform public.notify(old.counselor_id, 'status',
        'Request ' || replace(new.status::text, '_', ' ') || ': ' || old.subject,
        'Updated by the student.', '/counselor/inbox/' || old.id);
    else
      perform public.notify(v_owner, 'status',
        case new.status
          when 'resolved' then 'Your request was marked resolved'
          when 'in_progress' then 'Your counselor is working on your request'
          else 'Your request was reopened' end,
        old.subject, '/student/messages/' || old.id);
    end if;
  end if;
  return new;
end $$;

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  mine boolean := public.is_conversation_owner(p_conversation);
begin
  update public.conversations set
    student_last_read_at = case when mine then now() else student_last_read_at end,
    counselor_last_read_at = case when counselor_id = auth.uid() then now() else counselor_last_read_at end
  where id = p_conversation and (mine or counselor_id = auth.uid());

  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null and href like '%' || p_conversation::text;
end $$;

drop function public.start_conversation(text, public.request_category, public.request_urgency, text);
create or replace function public.start_conversation(
  p_subject text,
  p_category public.request_category,
  p_urgency public.request_urgency,
  p_body text,
  p_anonymous boolean default false
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  me public.profiles;
  assigned uuid;
  new_id uuid;
  anon boolean := coalesce(p_anonymous, false);
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role <> 'student' or me.status <> 'active' then
    raise exception 'Only active student accounts can open a request.' using errcode = '42501';
  end if;

  if (select count(*) from public.conversations c
      where c.created_at > now() - interval '1 day' and public.is_conversation_owner(c.id)) >= 8 then
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

  insert into public.conversations (student_id, counselor_id, subject, category, urgency, is_anonymous)
  values (case when anon then null else me.id end, assigned, btrim(p_subject), p_category, p_urgency, anon)
  returning id into new_id;

  if anon then
    insert into private.anonymous_owners (conversation_id, student_id) values (new_id, me.id);
  end if;

  insert into public.messages (conversation_id, sender_id, body) values (new_id, me.id, p_body);

  if p_urgency = 'urgent' then
    perform public.notify(assigned, 'urgent',
      'Urgent request from ' || case when anon then 'an anonymous student' else me.full_name end,
      btrim(p_subject), '/counselor/inbox/' || new_id);
  end if;

  return new_id;
end $$;

-- The student can choose to share their name later.
create or replace function public.reveal_identity(p_conversation uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  conv public.conversations;
  me public.profiles;
begin
  select * into conv from public.conversations where id = p_conversation for update;
  if conv.id is null or not conv.is_anonymous or not exists (
    select 1 from private.anonymous_owners o where o.conversation_id = conv.id and o.student_id = auth.uid()
  ) then
    raise exception 'Conversation not found.' using errcode = 'P0002';
  end if;
  select * into me from public.profiles where id = auth.uid();

  update public.conversations set student_id = me.id, is_anonymous = false where id = conv.id;
  update public.messages set sender_id = me.id where conversation_id = conv.id and from_student and sender_id is null;
  delete from private.anonymous_owners where conversation_id = conv.id;

  perform public.notify(conv.counselor_id, 'account', me.full_name || ' shared their name',
    'On: ' || conv.subject, '/counselor/inbox/' || conv.id);
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
      where id = p_conversation and public.is_conversation_owner(id) and status = 'resolved';
  end if;
  if cid is null then
    raise exception 'Feedback can be left after a completed session or resolved request.'
      using errcode = 'P0001';
  end if;

  insert into public.feedback (student_id, counselor_id, appointment_id, conversation_id, rating, comment)
  values (auth.uid(), cid, p_appointment, p_conversation, p_rating, nullif(btrim(p_comment), ''))
  on conflict do nothing;
end $$;

-- Counselors must not be able to link feedback on an anonymous thread to a student.
revoke select on public.feedback from authenticated;
grant select (id, counselor_id, appointment_id, conversation_id, rating, comment, created_at)
  on public.feedback to authenticated;

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
      where status <> 'resolved'
        and (student_id = p_student
             or id in (select o.conversation_id from private.anonymous_owners o where o.student_id = p_student));
  end if;

  if p_counselor is not null then
    perform public.notify(p_student, 'account', 'You have a counselor',
      counselor_name || ' is now your counselor.', '/student');
    perform public.notify(p_counselor, 'account', 'New student assigned',
      (select full_name from public.profiles where id = p_student), '/counselor/students/' || p_student);
  end if;
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
                       where counselor_id = me and status <> 'resolved' and last_from_student),
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

-- ---------------------------------------------------------------------------
-- Community board
-- ---------------------------------------------------------------------------
create type public.post_kind as enum ('advice', 'share');

create table public.posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles (id) on delete cascade,
  is_anonymous  boolean not null default false,
  kind          public.post_kind not null default 'share',
  body          text not null check (char_length(btrim(body)) between 1 and 2000),
  image_path    text check (image_path is null or image_path ~ '^posts/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  hidden        boolean not null default false,
  created_at    timestamptz not null default now()
);
create index posts_created_idx on public.posts (created_at desc);
create index posts_author_idx on public.posts (author_id, created_at desc);

create table public.post_comments (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.posts (id) on delete cascade,
  author_id     uuid not null references public.profiles (id) on delete cascade,
  is_anonymous  boolean not null default false,
  body          text not null check (char_length(btrim(body)) between 1 and 1000),
  hidden        boolean not null default false,
  created_at    timestamptz not null default now()
);
create index post_comments_post_idx on public.post_comments (post_id, created_at);

create table public.post_reactions (
  post_id     uuid not null references public.posts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_reports (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts (id) on delete cascade,
  comment_id   uuid references public.post_comments (id) on delete cascade,
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  reason       text check (reason is null or char_length(reason) <= 300),
  created_at   timestamptz not null default now(),
  unique nulls not distinct (post_id, comment_id, reporter_id)
);

alter table public.posts enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.post_reports enable row level security;
-- No policies and no grants: only the functions below (and the server) touch these tables.
revoke all on public.posts, public.post_comments, public.post_reactions, public.post_reports from anon, authenticated;
grant all on public.posts, public.post_comments, public.post_reactions, public.post_reports to service_role;
grant all on public.auth_attempts to service_role;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_role_active() in ('counselor', 'admin'), false) $$;

create or replace function public.community_feed(p_before timestamptz default null, p_limit int default 20)
returns table (
  id uuid, kind public.post_kind, body text, image_path text, created_at timestamptz,
  is_anonymous boolean, is_mine boolean, author_name text, author_hue smallint, author_role public.user_role,
  reaction_count bigint, reacted boolean, comment_count bigint, hidden boolean, report_count bigint
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  staff boolean := public.is_staff();
begin
  if public.current_role_active() is null then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  return query
  select p.id, p.kind, p.body, p.image_path, p.created_at, p.is_anonymous,
         p.author_id = auth.uid(),
         case when p.is_anonymous and not staff and p.author_id <> auth.uid() then null else a.full_name end,
         case when p.is_anonymous and not staff and p.author_id <> auth.uid() then null else a.avatar_hue end,
         case when p.is_anonymous and not staff and p.author_id <> auth.uid() then null else a.role end,
         (select count(*) from public.post_reactions r where r.post_id = p.id),
         exists (select 1 from public.post_reactions r where r.post_id = p.id and r.user_id = auth.uid()),
         (select count(*) from public.post_comments c where c.post_id = p.id and (not c.hidden or staff)),
         p.hidden,
         case when staff then (select count(*) from public.post_reports x where x.post_id = p.id and x.comment_id is null) else 0 end
  from public.posts p
  join public.profiles a on a.id = p.author_id
  where (not p.hidden or staff or p.author_id = auth.uid())
    and (p_before is null or p.created_at < p_before)
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;

create or replace function public.community_comments(p_post uuid)
returns table (
  id uuid, body text, created_at timestamptz, is_anonymous boolean, is_mine boolean,
  author_name text, author_hue smallint, author_role public.user_role, hidden boolean
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  staff boolean := public.is_staff();
begin
  if public.current_role_active() is null then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.posts p where p.id = p_post and (not p.hidden or staff or p.author_id = auth.uid())) then
    return;
  end if;
  return query
  select c.id, c.body, c.created_at, c.is_anonymous, c.author_id = auth.uid(),
         case when c.is_anonymous and not staff and c.author_id <> auth.uid() then null else a.full_name end,
         case when c.is_anonymous and not staff and c.author_id <> auth.uid() then null else a.avatar_hue end,
         case when c.is_anonymous and not staff and c.author_id <> auth.uid() then null else a.role end,
         c.hidden
  from public.post_comments c
  join public.profiles a on a.id = c.author_id
  where c.post_id = p_post and (not c.hidden or staff or c.author_id = auth.uid())
  order by c.created_at
  limit 200;
end $$;

create or replace function public.create_post(
  p_kind public.post_kind, p_body text, p_image_path text, p_anonymous boolean
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  new_id uuid;
begin
  if public.current_role_active() not in ('student', 'counselor') then
    raise exception 'Only students and counselors can post.' using errcode = '42501';
  end if;
  if (select count(*) from public.posts where author_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You have posted a lot today. Please try again tomorrow.' using errcode = 'P0001';
  end if;
  insert into public.posts (author_id, is_anonymous, kind, body, image_path)
  values (auth.uid(), coalesce(p_anonymous, false), p_kind, btrim(p_body), nullif(p_image_path, ''))
  returning id into new_id;
  return new_id;
end $$;

create or replace function public.add_comment(p_post uuid, p_body text, p_anonymous boolean)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  post public.posts;
  new_id uuid;
  v_role public.user_role := public.current_role_active();
begin
  if v_role is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  select * into post from public.posts where id = p_post;
  if post.id is null or (post.hidden and not public.is_staff()) then
    raise exception 'That post is no longer available.' using errcode = 'P0002';
  end if;
  if (select count(*) from public.post_comments where author_id = auth.uid() and created_at > now() - interval '1 day') >= 60 then
    raise exception 'You have replied a lot today. Please try again tomorrow.' using errcode = 'P0001';
  end if;

  insert into public.post_comments (post_id, author_id, is_anonymous, body)
  values (p_post, auth.uid(), coalesce(p_anonymous, false), btrim(p_body))
  returning id into new_id;

  if post.author_id <> auth.uid() then
    perform public.notify(post.author_id, 'community',
      case when v_role = 'counselor' and not coalesce(p_anonymous, false)
           then 'A counselor replied to your post' else 'New reply on your post' end,
      left(btrim(p_body), 160), '/' || (select p.role::text from public.profiles p where p.id = post.author_id) || '/community#post-' || post.id);
  end if;
  return new_id;
end $$;

create or replace function public.toggle_reaction(p_post uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if public.current_role_active() is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if not exists (select 1 from public.posts where id = p_post and not hidden) then
    raise exception 'That post is no longer available.' using errcode = 'P0002';
  end if;
  delete from public.post_reactions where post_id = p_post and user_id = auth.uid();
  if found then return false; end if;
  insert into public.post_reactions (post_id, user_id) values (p_post, auth.uid());
  return true;
end $$;

-- Returns the image path so the server can delete the file too.
create or replace function public.delete_post(p_post uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  path text;
begin
  delete from public.posts
  where id = p_post and (author_id = auth.uid() or public.is_staff())
  returning image_path into path;
  if not found then raise exception 'Post not found.' using errcode = 'P0002'; end if;
  return path;
end $$;

create or replace function public.delete_comment(p_comment uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.post_comments
  where id = p_comment and (author_id = auth.uid() or public.is_staff());
  if not found then raise exception 'Reply not found.' using errcode = 'P0002'; end if;
end $$;

create or replace function public.moderate_post(p_post uuid, p_hidden boolean)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_staff() then raise exception 'Staff only.' using errcode = '42501'; end if;
  update public.posts set hidden = p_hidden where id = p_post;
end $$;

-- Reports notify staff once; three reports hide a post until staff review it.
create or replace function public.report_content(p_post uuid, p_comment uuid, p_reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  reports int;
begin
  if public.current_role_active() is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  insert into public.post_reports (post_id, comment_id, reporter_id, reason)
  values (p_post, p_comment, auth.uid(), nullif(btrim(p_reason), ''))
  on conflict do nothing;
  if not found then return; end if;

  select count(*) into reports from public.post_reports where post_id = p_post and comment_id is not distinct from p_comment;
  if reports = 1 then
    insert into public.notifications (user_id, kind, title, body, href)
    select s.id, 'report', 'Community post reported', coalesce(nullif(btrim(p_reason), ''), 'Please review it.'),
           '/' || s.role::text || '/community#post-' || p_post
    from public.profiles s where s.role in ('counselor', 'admin') and s.status = 'active';
  end if;
  if reports >= 3 then
    if p_comment is null then
      update public.posts set hidden = true where id = p_post;
    else
      update public.post_comments set hidden = true where id = p_comment;
    end if;
  end if;
end $$;

revoke execute on function
  public.is_conversation_owner(uuid), public.start_conversation(text, public.request_category, public.request_urgency, text, boolean),
  public.reveal_identity(uuid), public.is_staff(), public.community_feed(timestamptz, int), public.community_comments(uuid),
  public.create_post(public.post_kind, text, text, boolean), public.add_comment(uuid, text, boolean),
  public.toggle_reaction(uuid), public.delete_post(uuid), public.delete_comment(uuid),
  public.moderate_post(uuid, boolean), public.report_content(uuid, uuid, text)
from public, anon;
grant execute on function
  public.is_conversation_owner(uuid), public.start_conversation(text, public.request_category, public.request_urgency, text, boolean),
  public.reveal_identity(uuid), public.is_staff(), public.community_feed(timestamptz, int), public.community_comments(uuid),
  public.create_post(public.post_kind, text, text, boolean), public.add_comment(uuid, text, boolean),
  public.toggle_reaction(uuid), public.delete_post(uuid), public.delete_comment(uuid),
  public.moderate_post(uuid, boolean), public.report_content(uuid, uuid, text)
to authenticated;

-- Private bucket for community photos. Files are uploaded by the server and
-- read through short-lived signed URLs; users get no direct storage access.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community', 'community', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
