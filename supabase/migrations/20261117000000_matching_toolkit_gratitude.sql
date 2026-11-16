-- =============================================================================
-- Counselor credentials and verification, automatic counselor matching,
-- the personal wellbeing toolkit, the Gratitude Wall and saved game progress.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Areas of expertise (also the vocabulary the matcher works with)
-- -----------------------------------------------------------------------------
create or replace function public.expertise_areas()
returns text[] language sql immutable set search_path = ''
as $$ select array['academic','family','friendships','bullying','anxiety','low_mood','self_esteem','grief','career','anger'] $$;

-- -----------------------------------------------------------------------------
-- Counselor credentials. Contact details are visible only to the counselor
-- themselves and to admins; students see a safe summary through a function.
-- -----------------------------------------------------------------------------
create table public.counselor_credentials (
  counselor_id     uuid primary key references public.profiles (id) on delete cascade,
  qualifications   text not null check (char_length(btrim(qualifications)) between 2 and 300),
  experience_years smallint not null check (experience_years between 0 and 60),
  email            text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'),
  phone            text not null check (phone ~ '^\+?[0-9]{10,15}$'),
  expertise        text[] not null check (cardinality(expertise) between 1 and 6 and expertise <@ public.expertise_areas()),
  verified_at      timestamptz,
  verified_by      uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.counselor_credentials enable row level security;
revoke all on public.counselor_credentials from anon, authenticated;
grant select on public.counselor_credentials to authenticated;
grant insert (counselor_id, qualifications, experience_years, email, phone, expertise) on public.counselor_credentials to authenticated;
grant update (qualifications, experience_years, email, phone, expertise) on public.counselor_credentials to authenticated;
grant all on public.counselor_credentials to service_role;

create policy "credentials: owner or admin reads" on public.counselor_credentials
  for select to authenticated using (counselor_id = auth.uid() or public.is_admin());
create policy "credentials: counselor adds own" on public.counselor_credentials
  for insert to authenticated
  with check (counselor_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'counselor'));
create policy "credentials: counselor edits own" on public.counselor_credentials
  for update to authenticated using (counselor_id = auth.uid()) with check (counselor_id = auth.uid());

-- Changing qualifications, experience or areas needs a fresh check by an admin.
create or replace function public.before_credentials_write()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  who text;
begin
  new.updated_at := now();
  new.qualifications := btrim(new.qualifications);
  new.email := lower(btrim(new.email));
  new.expertise := array(select distinct unnest(new.expertise) order by 1);
  if tg_op = 'INSERT' then
    -- Verification is only ever set by the admin functions below.
    if coalesce(current_setting('btm.verifying', true), '') <> 'on' then
      new.verified_at := null;
      new.verified_by := null;
    end if;
  elsif (new.qualifications, new.experience_years, new.expertise) is distinct from (old.qualifications, old.experience_years, old.expertise)
        and old.verified_at is not null
        and coalesce(current_setting('btm.verifying', true), '') <> 'on' then
    new.verified_at := null;
    new.verified_by := null;
  end if;

  if new.verified_at is null and (tg_op = 'INSERT' or old.verified_at is not null)
     and exists (select 1 from public.profiles where id = new.counselor_id and status = 'active') then
    select full_name into who from public.profiles where id = new.counselor_id;
    insert into public.notifications (user_id, kind, title, body, href)
    select a.id, 'counselor_request', 'Counselor details need verifying', left(who, 160), '/admin/users?status=verify'
    from public.profiles a where a.role = 'admin' and a.status = 'active';
  end if;
  return new;
end $$;
create trigger counselor_credentials_write before insert or update on public.counselor_credentials
  for each row execute function public.before_credentials_write();

-- Verified = an approved counselor whose details have been checked. Counselors
-- approved before credentials existed count as verified until they edit them.
create or replace function public.counselor_is_verified(p_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    left join public.counselor_credentials c on c.counselor_id = p.id
    where p.id = p_id and p.role = 'counselor' and p.status = 'active'
      and (c.counselor_id is null or c.verified_at is not null)
  )
$$;

create or replace function public.admin_verify_counselor(p_counselor uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admins only.' using errcode = '42501'; end if;
  perform set_config('btm.verifying', 'on', true);
  update public.counselor_credentials set verified_at = now(), verified_by = auth.uid() where counselor_id = p_counselor;
  if not found then raise exception 'This counselor has not added their professional details yet.' using errcode = 'P0002'; end if;
  perform set_config('btm.verifying', 'off', true);
  perform public.notify(p_counselor, 'account', 'Your professional details are verified',
    'Students can now be matched with you.', '/counselor/settings');
end $$;

-- Safe summary for students and staff: never contact details.
create or replace function public.counselor_summaries(p_ids uuid[])
returns table (id uuid, expertise text[], experience_years smallint, qualifications text, verified boolean)
language sql stable security definer set search_path = ''
as $$
  select p.id, coalesce(c.expertise, '{}'), c.experience_years, c.qualifications, public.counselor_is_verified(p.id)
  from public.profiles p
  left join public.counselor_credentials c on c.counselor_id = p.id
  where p.id = any(p_ids) and p.role = 'counselor' and p.status = 'active'
    and public.current_role_active() is not null
$$;

-- -----------------------------------------------------------------------------
-- Sign-up: counselors must provide professional details.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  wants_counselor boolean := coalesce(meta ->> 'role_request', '') = 'counselor';
  v_name text := nullif(btrim(coalesce(meta ->> 'full_name', '')), '');
  v_username text := lower(nullif(btrim(coalesce(meta ->> 'username', '')), ''));
  v_contact text := nullif(btrim(coalesce(meta ->> 'contact_email', '')), '');
  v_phone text := regexp_replace(coalesce(meta ->> 'phone', ''), '[^0-9+]', '', 'g');
  v_expertise text[];
  provisioned_admin boolean := false;
begin
  if meta ? 'provision_token' then
    delete from private.provision_tokens
    where token = meta ->> 'provision_token' and created_at > now() - interval '10 minutes';
    provisioned_admin := found;
  end if;

  if v_username is null then
    v_username := left(regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9._]', '', 'g'), 24);
  end if;
  if not provisioned_admin and v_username in
     ('admin', 'administrator', 'root', 'system', 'support', 'counselor', 'counsellor', 'staff', 'moderator', 'beyondthemirror') then
    raise exception 'That username is reserved.' using errcode = 'P0001';
  end if;

  if wants_counselor and not provisioned_admin then
    if v_contact is null or nullif(btrim(coalesce(meta ->> 'qualifications', '')), '') is null
       or v_phone = '' or coalesce(meta ->> 'experience_years', '') !~ '^[0-9]{1,2}$'
       or jsonb_typeof(meta -> 'expertise') is distinct from 'array' then
      raise exception 'Counselors must add their email, phone, qualifications, experience and areas of expertise.' using errcode = 'P0001';
    end if;
    select array_agg(x) into v_expertise from jsonb_array_elements_text(meta -> 'expertise') x;
  end if;

  insert into public.profiles (id, email, username, full_name, role, status, grade, section, student_number, title)
  values (
    new.id,
    -- A counselor's professional email stays in the private credentials table.
    case when wants_counselor then null when new.email like '%.invalid' then v_contact else coalesce(v_contact, new.email) end,
    v_username,
    left(coalesce(v_name, v_username), 80),
    case when provisioned_admin then 'admin'::public.user_role
         when wants_counselor then 'counselor'::public.user_role else 'student'::public.user_role end,
    case when wants_counselor and not provisioned_admin then 'pending'::public.account_status else 'active'::public.account_status end,
    case when wants_counselor then null else left(nullif(btrim(meta ->> 'grade'), ''), 40) end,
    case when wants_counselor then null else left(nullif(btrim(meta ->> 'section'), ''), 40) end,
    case when wants_counselor then null else left(nullif(btrim(meta ->> 'student_number'), ''), 40) end,
    case when wants_counselor then left(nullif(btrim(meta ->> 'title'), ''), 80) else null end
  );

  if wants_counselor and not provisioned_admin then
    insert into public.counselor_credentials (counselor_id, qualifications, experience_years, email, phone, expertise)
    values (new.id, left(btrim(meta ->> 'qualifications'), 300), (meta ->> 'experience_years')::smallint, v_contact, v_phone, v_expertise);

    insert into public.notifications (user_id, kind, title, body, href)
    select p.id, 'counselor_request', 'New counselor application to verify',
           left(coalesce(v_name, v_username), 160), '/admin/users?status=pending'
    from public.profiles p where p.role = 'admin' and p.status = 'active';
  end if;
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Automatic matching. Only verified counselors are ever chosen. Admins no
-- longer assign students by hand.
-- -----------------------------------------------------------------------------
create table public.counselor_matches (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles (id) on delete cascade,
  counselor_id uuid references public.profiles (id) on delete set null,
  concern      text not null check (concern ~ '^[a-z_]{2,24}$'),
  tags         text[] not null default '{}',
  score        numeric(6,2) not null,
  kept_current boolean not null default false,
  created_at   timestamptz not null default now()
);
create index counselor_matches_student_idx on public.counselor_matches (student_id, created_at desc);
create index counselor_matches_counselor_idx on public.counselor_matches (counselor_id, created_at desc);
alter table public.counselor_matches enable row level security;
revoke all on public.counselor_matches from anon, authenticated;
grant all on public.counselor_matches to service_role;

-- Scores every verified counselor for a student and a set of concern weights
-- ({"academic": 1, "anxiety": 0.4, ...}). Highest score wins.
create or replace function private.rank_counselors(p_student uuid, p_weights jsonb, p_urgent boolean)
returns table (counselor_id uuid, score numeric, matched text[], is_current boolean)
language sql stable security definer set search_path = ''
as $$
  with w as (
    select key as tag, least(greatest((value)::numeric, 0), 1) as weight
    from jsonb_each_text(coalesce(p_weights, '{}'::jsonb))
    where key = any(public.expertise_areas()) and value ~ '^[0-9]+(\.[0-9]+)?$'
  ),
  me as (select counselor_id as current_id from public.profiles where id = p_student),
  loads as (
    select c.id, (select count(*) from public.profiles s where s.counselor_id = c.id and s.role = 'student') as load
    from public.profiles c where c.role = 'counselor' and c.status = 'active'
  ),
  cand as (
    select p.id, p.presence, p.created_at, coalesce(cr.expertise, '{}') as expertise,
           coalesce(cr.experience_years, 0) as years, l.load
    from public.profiles p
    join loads l on l.id = p.id
    left join public.counselor_credentials cr on cr.counselor_id = p.id
    where public.counselor_is_verified(p.id)
  ),
  scored as (
    select c.id,
      -- Fit: how well their areas cover what the student described (0 to 60).
      coalesce((select sum(w.weight) from w where w.tag = any(c.expertise)), 0)
        / greatest((select sum(weight) from w), 1) * 60
      -- Counselors without listed areas are generalists: a modest base.
      + case when cardinality(c.expertise) = 0 and exists (select 1 from w) then 12 else 0 end
      -- Experience, up to 10.
      + least(c.years, 15)::numeric / 15 * 10
      -- Availability now (doubled for urgent requests).
      + case c.presence when 'available' then 8 when 'busy' then 3 else 0 end * case when p_urgent then 2 else 1 end
      -- Fewer students = more time for each one (up to -12).
      - least(c.load, 40)::numeric / 40 * 12
      -- Continuity: someone who already knows the student.
      + case when c.id = (select current_id from me) then 10 else 0 end
      as score,
      array(select w.tag from w where w.tag = any(c.expertise) order by w.weight desc) as matched,
      c.id = (select current_id from me) as is_current,
      c.load, c.created_at
    from cand c
  )
  select id, round(score, 2), matched, coalesce(is_current, false)
  from scored
  order by score desc, load, created_at
$$;
revoke execute on function private.rank_counselors(uuid, jsonb, boolean) from public, anon, authenticated;

create or replace function private.category_weights(p_category public.request_category)
returns jsonb language sql immutable set search_path = ''
as $$
  select case p_category
    when 'exams' then '{"academic": 1, "anxiety": 0.3}'
    when 'academic' then '{"academic": 1}'
    when 'career' then '{"career": 1, "academic": 0.3}'
    when 'wellbeing' then '{"low_mood": 0.6, "anxiety": 0.6}'
    when 'friendship' then '{"friendships": 1}'
    when 'family' then '{"family": 1}'
    when 'bullying' then '{"bullying": 1, "friendships": 0.3}'
    else '{}' end::jsonb
$$;

-- Called by the student after the "How are you feeling?" questions.
create or replace function public.match_counselor(p_concern text, p_weights jsonb, p_urgent boolean default false)
returns table (
  counselor_id uuid, full_name text, title text, avatar_hue smallint, presence public.counselor_presence,
  expertise text[], experience_years smallint, qualifications text, matched text[], score numeric,
  kept_current boolean
)
language plpgsql security definer set search_path = ''
as $$
declare
  me public.profiles;
  best record;
  previous uuid;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role <> 'student' or me.status <> 'active' then
    raise exception 'Only students can be matched with a counselor.' using errcode = '42501';
  end if;
  if p_concern !~ '^[a-z_]{2,24}$' then raise exception 'Invalid request.' using errcode = '22023'; end if;
  if (select count(*) from public.counselor_matches m where m.student_id = me.id and m.created_at > now() - interval '1 day') >= 10 then
    raise exception 'You have been matched several times today. Please continue with your current counselor for now.' using errcode = 'P0001';
  end if;

  select * into best from private.rank_counselors(me.id, p_weights, coalesce(p_urgent, false)) limit 1;
  if best.counselor_id is null then
    raise exception 'No verified counselor is available yet. Please try again a little later.' using errcode = 'P0001';
  end if;

  previous := me.counselor_id;
  if previous is distinct from best.counselor_id then
    update public.profiles set counselor_id = best.counselor_id where id = me.id;
    perform public.notify(best.counselor_id, 'account', 'A new student was matched with you',
      me.full_name, '/counselor/students/' || me.id);
  end if;

  insert into public.counselor_matches (student_id, counselor_id, concern, tags, score, kept_current)
  values (me.id, best.counselor_id, p_concern, best.matched, best.score, previous is not distinct from best.counselor_id);

  return query
  select p.id, p.full_name, p.title, p.avatar_hue, p.presence, coalesce(c.expertise, '{}'), c.experience_years,
         c.qualifications, best.matched, best.score, previous is not distinct from best.counselor_id
  from public.profiles p left join public.counselor_credentials c on c.counselor_id = p.id
  where p.id = best.counselor_id;
end $$;

-- Requests from students who have no counselor yet are matched by topic.
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
  pick record;
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
    select * into pick from private.rank_counselors(me.id, private.category_weights(p_category), p_urgency = 'urgent') limit 1;
    assigned := pick.counselor_id;
    if assigned is null then
      raise exception 'No counselor is available on the platform yet. Please try again later.'
        using errcode = 'P0001';
    end if;
    update public.profiles set counselor_id = assigned where id = me.id;
    insert into public.counselor_matches (student_id, counselor_id, concern, tags, score)
    values (me.id, assigned, p_category::text, pick.matched, pick.score);
    perform public.notify(assigned, 'account', 'A new student was matched with you',
      case when anon then 'A student' else me.full_name end, '/counselor/students/' || me.id);
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

-- Approving a counselor also verifies the details they applied with.
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

  -- Their students are matched again automatically on their next request.
  if target.role = 'counselor' and (coalesce(p_role, target.role) <> 'counselor'
                                    or coalesce(p_status, target.status) = 'suspended') then
    update public.profiles set counselor_id = null where counselor_id = p_user;
  end if;

  if target.status = 'pending' and p_status = 'active' then
    if coalesce(p_role, target.role) = 'counselor' then
      perform set_config('btm.verifying', 'on', true);
      update public.counselor_credentials set verified_at = now(), verified_by = auth.uid() where counselor_id = p_user;
      perform set_config('btm.verifying', 'off', true);
    end if;
    perform public.notify(p_user, 'account', 'Your account has been approved',
      'Welcome aboard. Your dashboard is ready.', '/' || coalesce(p_role, target.role)::text);
  end if;
end $$;

-- Manual assignment is retired: matching is automatic.
drop function if exists public.admin_assign_counselor(uuid, uuid, boolean);

-- Admin overview of counselors and matching. Aggregates only: no concerns per student.
create or replace function public.admin_matching_overview()
returns table (
  counselor_id uuid, full_name text, username text, status public.account_status, presence public.counselor_presence,
  has_details boolean, verified boolean, expertise text[], experience_years smallint, qualifications text,
  email text, phone text, students bigint, matches_30d bigint
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admins only.' using errcode = '42501'; end if;
  return query
  select p.id, p.full_name, p.username, p.status, p.presence, c.counselor_id is not null,
         public.counselor_is_verified(p.id), coalesce(c.expertise, '{}'), c.experience_years, c.qualifications,
         c.email, c.phone,
         (select count(*) from public.profiles s where s.counselor_id = p.id and s.role = 'student'),
         (select count(*) from public.counselor_matches m where m.counselor_id = p.id and m.created_at > now() - interval '30 days')
  from public.profiles p
  left join public.counselor_credentials c on c.counselor_id = p.id
  where p.role = 'counselor'
  order by p.status, p.full_name;
end $$;

create or replace function public.admin_match_areas()
returns table (concern text, matches bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admins only.' using errcode = '42501'; end if;
  return query
  select m.concern, count(*) from public.counselor_matches m
  where m.created_at > now() - interval '30 days' group by m.concern order by 2 desc;
end $$;

-- -----------------------------------------------------------------------------
-- Personal wellbeing toolkit: private to the owner only (not counselors, not admins).
-- -----------------------------------------------------------------------------
create or replace function private.limit_rows()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  n int;
begin
  execute format('select count(*) from %I.%I where user_id = $1', tg_table_schema, tg_table_name) into n using new.user_id;
  if n >= tg_argv[0]::int then
    raise exception 'You have reached the limit for saved entries here. Please delete a few older ones first.' using errcode = 'P0001';
  end if;
  return new;
end $$;

create table public.behaviour_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  logged_on      date not null default current_date,
  behaviour      text not null check (behaviour in ('sleep','study','social','screen_time','avoidance','breaks','exercise','eating','other')),
  label          text check (label is null or char_length(label) <= 80),
  hours          numeric(4,1) check (hours is null or hours between 0 and 24),
  before_context text check (before_context is null or char_length(before_context) <= 500),
  feeling        text check (feeling is null or feeling in ('calm','happy','motivated','tired','bored','stressed','anxious','low','frustrated','overwhelmed')),
  after_effect   text check (after_effect is null or char_length(after_effect) <= 500),
  impact         smallint check (impact is null or impact between -2 and 2),
  created_at     timestamptz not null default now()
);
create index behaviour_logs_user_idx on public.behaviour_logs (user_id, logged_on desc);

create table public.behaviour_goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  behaviour  text not null check (behaviour in ('sleep','study','social','screen_time','avoidance','breaks','exercise','eating','other')),
  title      text not null check (char_length(btrim(title)) between 3 and 120),
  target     text check (target is null or char_length(target) <= 200),
  status     text not null default 'active' check (status in ('active','done','dropped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index behaviour_goals_user_idx on public.behaviour_goals (user_id, created_at desc);

create table public.decisions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 3 and 120),
  area        text not null default 'other' check (area in ('education','friendships','family','responsibilities','future','other')),
  situation   text check (situation is null or char_length(situation) <= 2000),
  options     jsonb not null default '[]' check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) <= 6 and octet_length(options::text) <= 24000),
  priorities  jsonb not null default '[]' check (jsonb_typeof(priorities) = 'array' and jsonb_array_length(priorities) <= 8 and octet_length(priorities::text) <= 4000),
  reflection  text check (reflection is null or char_length(reflection) <= 2000),
  next_step   text check (next_step is null or char_length(next_step) <= 300),
  chosen      text check (chosen is null or char_length(chosen) <= 40),
  status      text not null default 'open' check (status in ('open','decided')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index decisions_user_idx on public.decisions (user_id, updated_at desc);

create table public.stress_entries (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  entry_on             date not null default current_date,
  sources              text[] not null check (cardinality(sources) between 1 and 8 and sources <@ array['academic','family','friendships','social','responsibilities','future','health','other']),
  other_source         text check (other_source is null or char_length(other_source) <= 80),
  intensity            smallint not null check (intensity between 1 and 5),
  frequency            text not null check (frequency in ('once','sometimes','often','daily')),
  impact_concentration smallint not null default 0 check (impact_concentration between 0 and 3),
  impact_sleep         smallint not null default 0 check (impact_sleep between 0 and 3),
  impact_motivation    smallint not null default 0 check (impact_motivation between 0 and 3),
  impact_relationships smallint not null default 0 check (impact_relationships between 0 and 3),
  impact_daily         smallint not null default 0 check (impact_daily between 0 and 3),
  triggers             text check (triggers is null or char_length(triggers) <= 500),
  helped               text check (helped is null or char_length(helped) <= 500),
  created_at           timestamptz not null default now()
);
create index stress_entries_user_idx on public.stress_entries (user_id, entry_on desc);

create table public.academic_tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 2 and 120),
  kind        text not null default 'assignment' check (kind in ('assignment','project','exam','presentation','reading','other')),
  subject     text check (subject is null or char_length(subject) <= 60),
  due_on      date not null,
  est_hours   numeric(5,1) not null default 1 check (est_hours between 0.5 and 200),
  importance  smallint not null default 2 check (importance between 1 and 3),
  progress    smallint not null default 0 check (progress between 0 and 100),
  steps       jsonb not null default '[]' check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) <= 20 and octet_length(steps::text) <= 6000),
  done_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index academic_tasks_user_idx on public.academic_tasks (user_id, due_on);

create table public.study_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  task_id      uuid references public.academic_tasks (id) on delete set null,
  minutes      smallint not null check (minutes between 1 and 240),
  completed_at timestamptz not null default now()
);
create index study_sessions_user_idx on public.study_sessions (user_id, completed_at desc);

create table public.academic_reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('checkin','weekly')),
  week_start  date not null,
  pressures   text[] not null default '{}' check (pressures <@ array['exam_anxiety','workload','fear_of_failure','expectations','time','understanding','motivation','other']),
  level       smallint check (level is null or level between 1 and 5),
  went_well   text check (went_well is null or char_length(went_well) <= 1000),
  difficult   text check (difficult is null or char_length(difficult) <= 1000),
  improve     text check (improve is null or char_length(improve) <= 1000),
  note        text check (note is null or char_length(note) <= 1000),
  created_at  timestamptz not null default now()
);
create index academic_reviews_user_idx on public.academic_reviews (user_id, week_start desc);

create table public.reflection_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  entry_on    date not null default current_date,
  question_id text not null check (question_id ~ '^[a-z0-9_-]{1,40}$'),
  category    text not null check (category in ('emotional','self','relationships','academic','growth','challenges','gratitude','weekly')),
  question    text not null check (char_length(question) between 3 and 300),
  answer      text check (answer is null or char_length(answer) <= 4000),
  followups   jsonb not null default '[]' check (jsonb_typeof(followups) = 'array' and jsonb_array_length(followups) <= 3 and octet_length(followups::text) <= 9000),
  skipped     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index reflection_entries_user_idx on public.reflection_entries (user_id, entry_on desc);

create table public.game_saves (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  game       text not null check (game in ('pet','cozy')),
  data       jsonb not null check (octet_length(data::text) <= 60000),
  updated_at timestamptz not null default now(),
  primary key (user_id, game)
);

do $$
declare
  t text;
  caps jsonb := '{"behaviour_logs": 3000, "behaviour_goals": 200, "decisions": 200, "stress_entries": 2000,
                  "academic_tasks": 1000, "study_sessions": 5000, "academic_reviews": 1000, "reflection_entries": 3000,
                  "game_saves": 5}';
begin
  foreach t in array array['behaviour_logs','behaviour_goals','decisions','stress_entries','academic_tasks',
                           'study_sessions','academic_reviews','reflection_entries','game_saves'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format($p$create policy "%s: owner only" on public.%I for all to authenticated
                     using (user_id = auth.uid())
                     with check (user_id = auth.uid() and public.current_role_active() is not null)$p$, t, t);
    execute format('create trigger %I before insert on public.%I for each row execute function private.limit_rows(%s)',
                   t || '_limit', t, caps ->> t);
  end loop;
end $$;

create trigger behaviour_goals_touch before update on public.behaviour_goals for each row execute function public.touch_updated_at();
create trigger decisions_touch before update on public.decisions for each row execute function public.touch_updated_at();
create trigger academic_tasks_touch before update on public.academic_tasks for each row execute function public.touch_updated_at();
create trigger reflection_entries_touch before update on public.reflection_entries for each row execute function public.touch_updated_at();

-- Owners can't move their records to someone else.
create or replace function public.keep_owner()
returns trigger language plpgsql set search_path = ''
as $$ begin new.user_id := old.user_id; return new; end $$;
do $$
declare t text;
begin
  foreach t in array array['behaviour_logs','behaviour_goals','decisions','stress_entries','academic_tasks',
                           'study_sessions','academic_reviews','reflection_entries','game_saves'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.keep_owner()', t || '_owner', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Gratitude Wall
-- -----------------------------------------------------------------------------
create type public.gratitude_category as enum ('people', 'small_moments', 'achievements', 'kindness', 'learned', 'happy');

create table public.gratitude_posts (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references public.profiles (id) on delete cascade,
  category       public.gratitude_category not null,
  body           text not null check (char_length(btrim(body)) between 3 and 600),
  is_anonymous   boolean not null default true,
  allow_comments boolean not null default true,
  status         text not null default 'published' check (status in ('published', 'held', 'hidden')),
  held_reason    text,
  created_at     timestamptz not null default now()
);
create index gratitude_posts_created_idx on public.gratitude_posts (created_at desc);
create index gratitude_posts_author_idx on public.gratitude_posts (author_id, created_at desc);

create table public.gratitude_reactions (
  post_id    uuid not null references public.gratitude_posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('appreciate', 'relate', 'inspiring')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.gratitude_comments (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.gratitude_posts (id) on delete cascade,
  author_id    uuid not null references public.profiles (id) on delete cascade,
  is_anonymous boolean not null default true,
  body         text not null check (char_length(btrim(body)) between 1 and 280),
  hidden       boolean not null default false,
  created_at   timestamptz not null default now()
);
create index gratitude_comments_post_idx on public.gratitude_comments (post_id, created_at);

create table public.gratitude_reports (
  post_id     uuid not null references public.gratitude_posts (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason      text check (reason is null or char_length(reason) <= 200),
  created_at  timestamptz not null default now(),
  primary key (post_id, reporter_id)
);

do $$
declare t text;
begin
  foreach t in array array['gratitude_posts','gratitude_reactions','gratitude_comments','gratitude_reports'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

-- Automatic screening: personal details, insults and worrying content are held
-- for a counselor to look at before anyone else sees them.
create or replace function private.screen_text(p_text text)
returns text language plpgsql immutable set search_path = ''
as $$
declare
  t text := lower(coalesce(p_text, ''));
begin
  if t ~ '(\+?\d[\d\s-]{8,}\d)' then return 'Looks like a phone number'; end if;
  if t ~ '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then return 'Looks like an email address'; end if;
  if t ~ '(https?://|www\.|\.com\b|instagram|snapchat|tiktok\.com|@[a-z0-9_.]{3,})' then return 'Contains a link or social handle'; end if;
  if t ~ '(kill (my ?self|myself)|suicid|want to die|wanna die|end my life|self[ -]?harm|hurt(ing)? my ?self|cut(ting)? my ?self)' then
    return 'May need a counselor to check in';
  end if;
  if t ~ '\m(stupid|idiot|loser|ugly|fatso|dumb|retard\w*|slut|whore|bitch|bastard|fuck\w*|shit\w*|kys|hate you|pagal|bewakoof|gadha|gadhi|kutta|kutti|kamina|kamini|ullu|harami|chutiya|bakwas)\M' then
    return 'Language that might hurt someone';
  end if;
  return null;
end $$;

create or replace function public.gratitude_feed(p_category public.gratitude_category default null, p_before timestamptz default null, p_limit int default 20)
returns table (
  id uuid, category public.gratitude_category, body text, created_at timestamptz, is_anonymous boolean, is_mine boolean,
  author_name text, author_hue smallint, author_role public.user_role, allow_comments boolean, status text, held_reason text,
  appreciate bigint, relate bigint, inspiring bigint, my_reaction text, comment_count bigint, report_count bigint
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  staff boolean := public.is_staff();
begin
  if public.current_role_active() is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  return query
  select p.id, p.category, p.body, p.created_at, p.is_anonymous, p.author_id = auth.uid(),
         case when not p.is_anonymous or staff or p.author_id = auth.uid() then a.full_name else null end,
         case when not p.is_anonymous or staff then a.avatar_hue else null end,
         case when not p.is_anonymous or staff then a.role else null end,
         p.allow_comments, p.status,
         case when staff or p.author_id = auth.uid() then p.held_reason else null end,
         (select count(*) from public.gratitude_reactions r where r.post_id = p.id and r.kind = 'appreciate'),
         (select count(*) from public.gratitude_reactions r where r.post_id = p.id and r.kind = 'relate'),
         (select count(*) from public.gratitude_reactions r where r.post_id = p.id and r.kind = 'inspiring'),
         (select r.kind from public.gratitude_reactions r where r.post_id = p.id and r.user_id = auth.uid()),
         (select count(*) from public.gratitude_comments c where c.post_id = p.id and (not c.hidden or staff)),
         case when staff then (select count(*) from public.gratitude_reports x where x.post_id = p.id) else 0 end
  from public.gratitude_posts p
  join public.profiles a on a.id = p.author_id
  where (p.status = 'published' or staff or p.author_id = auth.uid())
    and (p_category is null or p.category = p_category)
    and (p_before is null or p.created_at < p_before)
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end $$;

create or replace function public.create_gratitude_post(
  p_category public.gratitude_category, p_body text, p_anonymous boolean default true, p_allow_comments boolean default true
) returns text language plpgsql security definer set search_path = ''
as $$
declare
  reason text := private.screen_text(p_body);
  new_id uuid;
begin
  if public.current_role_active() is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if (select count(*) from public.gratitude_posts where author_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then
    raise exception 'You have shared several posts today. Come back tomorrow to share more.' using errcode = 'P0001';
  end if;
  insert into public.gratitude_posts (author_id, category, body, is_anonymous, allow_comments, status, held_reason)
  values (auth.uid(), p_category, btrim(p_body), coalesce(p_anonymous, true), coalesce(p_allow_comments, true),
          case when reason is null then 'published' else 'held' end, reason)
  returning id into new_id;
  if reason is not null then
    insert into public.notifications (user_id, kind, title, body, href)
    select s.id, 'report', 'A Gratitude Wall post is waiting for review', reason, '/' || s.role::text || '/gratitude?filter=review'
    from public.profiles s where s.role in ('counselor', 'admin') and s.status = 'active' and s.id <> auth.uid();
  end if;
  return case when reason is null then 'published' else 'held' end;
end $$;

create or replace function public.react_gratitude(p_post uuid, p_kind text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if public.current_role_active() is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if not exists (select 1 from public.gratitude_posts where id = p_post and status = 'published') then
    raise exception 'Post not found.' using errcode = 'P0002';
  end if;
  if p_kind is null then
    delete from public.gratitude_reactions where post_id = p_post and user_id = auth.uid();
  elsif p_kind in ('appreciate', 'relate', 'inspiring') then
    insert into public.gratitude_reactions (post_id, user_id, kind) values (p_post, auth.uid(), p_kind)
    on conflict (post_id, user_id) do update set kind = excluded.kind, created_at = now();
  else
    raise exception 'Invalid reaction.' using errcode = '22023';
  end if;
end $$;

create or replace function public.gratitude_comments_for(p_post uuid)
returns table (id uuid, body text, created_at timestamptz, is_mine boolean, author_name text, author_hue smallint, author_role public.user_role, hidden boolean)
language plpgsql stable security definer set search_path = ''
as $$
declare
  staff boolean := public.is_staff();
begin
  if public.current_role_active() is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if not exists (select 1 from public.gratitude_posts p where p.id = p_post and (p.status = 'published' or staff or p.author_id = auth.uid())) then
    raise exception 'Post not found.' using errcode = 'P0002';
  end if;
  return query
  select c.id, c.body, c.created_at, c.author_id = auth.uid(),
         case when not c.is_anonymous or staff or c.author_id = auth.uid() then a.full_name else null end,
         case when not c.is_anonymous or staff then a.avatar_hue else null end,
         case when not c.is_anonymous or staff then a.role else null end,
         c.hidden
  from public.gratitude_comments c join public.profiles a on a.id = c.author_id
  where c.post_id = p_post and (not c.hidden or staff or c.author_id = auth.uid())
  order by c.created_at
  limit 100;
end $$;

create or replace function public.add_gratitude_comment(p_post uuid, p_body text, p_anonymous boolean default true)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  post public.gratitude_posts;
  new_id uuid;
begin
  if public.current_role_active() is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  select * into post from public.gratitude_posts where id = p_post;
  if post.id is null or post.status <> 'published' then raise exception 'Post not found.' using errcode = 'P0002'; end if;
  if not post.allow_comments then raise exception 'Comments are turned off for this post.' using errcode = 'P0001'; end if;
  if private.screen_text(p_body) is not null then
    raise exception 'Please keep comments kind and don''t share personal details, links or contact information.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.gratitude_comments where author_id = auth.uid() and created_at > now() - interval '1 day') >= 30 then
    raise exception 'You have left a lot of comments today. Take a break and come back tomorrow.' using errcode = 'P0001';
  end if;
  insert into public.gratitude_comments (post_id, author_id, body, is_anonymous)
  values (p_post, auth.uid(), btrim(p_body), coalesce(p_anonymous, true))
  returning id into new_id;
  if post.author_id <> auth.uid() then
    perform public.notify(post.author_id, 'community', 'Someone replied to your gratitude post', left(btrim(p_body), 120),
      (select case when role = 'student' then '/student/toolkit/gratitude' else '/' || role::text || '/gratitude' end
       from public.profiles where id = post.author_id));
  end if;
  return new_id;
end $$;

create or replace function public.delete_gratitude_post(p_post uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.gratitude_posts where id = p_post and (author_id = auth.uid() or public.is_staff());
  if not found then raise exception 'Post not found.' using errcode = 'P0002'; end if;
end $$;

create or replace function public.delete_gratitude_comment(p_comment uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.gratitude_comments where id = p_comment and (author_id = auth.uid() or public.is_staff());
  if not found then raise exception 'Comment not found.' using errcode = 'P0002'; end if;
end $$;

create or replace function public.moderate_gratitude_post(p_post uuid, p_status text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_staff() then raise exception 'Staff only.' using errcode = '42501'; end if;
  if p_status not in ('published', 'hidden') then raise exception 'Invalid status.' using errcode = '22023'; end if;
  update public.gratitude_posts set status = p_status,
    held_reason = case when p_status = 'published' then null else held_reason end
  where id = p_post;
  if not found then raise exception 'Post not found.' using errcode = 'P0002'; end if;
end $$;

create or replace function public.moderate_gratitude_comment(p_comment uuid, p_hidden boolean)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_staff() then raise exception 'Staff only.' using errcode = '42501'; end if;
  update public.gratitude_comments set hidden = p_hidden where id = p_comment;
  if not found then raise exception 'Comment not found.' using errcode = 'P0002'; end if;
end $$;

create or replace function public.report_gratitude_post(p_post uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  n int;
begin
  if public.current_role_active() is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if not exists (select 1 from public.gratitude_posts where id = p_post and status = 'published' and author_id <> auth.uid()) then
    raise exception 'Post not found.' using errcode = 'P0002';
  end if;
  insert into public.gratitude_reports (post_id, reporter_id, reason)
  values (p_post, auth.uid(), left(nullif(btrim(p_reason), ''), 200))
  on conflict do nothing;
  select count(*) into n from public.gratitude_reports where post_id = p_post;
  if n = 1 then
    insert into public.notifications (user_id, kind, title, body, href)
    select s.id, 'report', 'A Gratitude Wall post was reported', 'Please take a look.', '/' || s.role::text || '/gratitude?filter=review'
    from public.profiles s where s.role in ('counselor', 'admin') and s.status = 'active';
  end if;
  if n >= 3 then
    update public.gratitude_posts set status = 'held', held_reason = 'Reported by several people' where id = p_post and status = 'published';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Function permissions: signed-in users only.
-- -----------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'public.counselor_is_verified(uuid)',
    'public.admin_verify_counselor(uuid)',
    'public.counselor_summaries(uuid[])',
    'public.match_counselor(text, jsonb, boolean)',
    'public.admin_matching_overview()',
    'public.admin_match_areas()',
    'public.gratitude_feed(public.gratitude_category, timestamptz, int)',
    'public.create_gratitude_post(public.gratitude_category, text, boolean, boolean)',
    'public.react_gratitude(uuid, text)',
    'public.gratitude_comments_for(uuid)',
    'public.add_gratitude_comment(uuid, text, boolean)',
    'public.delete_gratitude_post(uuid)',
    'public.delete_gratitude_comment(uuid)',
    'public.moderate_gratitude_post(uuid, text)',
    'public.moderate_gratitude_comment(uuid, boolean)',
    'public.report_gratitude_post(uuid, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
revoke execute on function public.before_credentials_write() from public, anon, authenticated;
revoke execute on function private.limit_rows() from public, anon, authenticated;
revoke execute on function private.category_weights(public.request_category) from public, anon, authenticated;
revoke execute on function private.screen_text(text) from public, anon, authenticated;

notify pgrst, 'reload schema';
