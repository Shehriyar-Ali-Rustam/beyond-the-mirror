-- skip-if: select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'username')
-- =============================================================================
-- Username-based accounts (no email required)
--
-- People sign up with a username + password. Supabase Auth still needs an
-- email-shaped identifier, so the server derives an internal, undeliverable
-- address from the username. profiles.email now holds an OPTIONAL contact
-- email the person chose to share.
-- =============================================================================

alter table public.profiles add column username text;
alter table public.profiles add column section text check (section is null or char_length(section) <= 40);
alter table public.profiles add column student_number text check (student_number is null or char_length(student_number) <= 40);
alter table public.profiles alter column email drop not null;

-- Backfill any existing rows from their email's local part (deduplicated).
with cleaned as (
  select id, created_at,
         coalesce(nullif(left(regexp_replace(lower(split_part(coalesce(email, ''), '@', 1)), '[^a-z0-9._]', '', 'g'), 20), ''), 'user') as raw
  from public.profiles
), base as (
  select id,
         case when length(raw) < 3 then rpad(raw, 3, '0') else raw end as u,
         row_number() over (partition by case when length(raw) < 3 then rpad(raw, 3, '0') else raw end order by created_at) as n
  from cleaned
)
update public.profiles p
set username = case when b.n = 1 then b.u else b.u || b.n end
from base b where b.id = p.id;

alter table public.profiles alter column username set not null;
alter table public.profiles add constraint profiles_username_format check (username ~ '^[a-z0-9][a-z0-9._]{2,23}$');
create unique index profiles_username_key on public.profiles (username);

-- Internal auth addresses are not contact emails.
update public.profiles set email = null where email like '%.invalid';

grant update (email, section, student_number) on public.profiles to authenticated;

-- One-time tokens that let the server (service key only) create the fixed
-- admin account. Users can't read or mint these, so they can't claim reserved
-- usernames or the admin role through the public auth API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.provision_tokens (
  token       text primary key,
  created_at  timestamptz not null default now()
);

create or replace function public.create_admin_provision_token()
returns text language plpgsql security definer set search_path = ''
as $$
declare
  t text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  delete from private.provision_tokens where created_at < now() - interval '10 minutes';
  insert into private.provision_tokens (token) values (t);
  return t;
end $$;
revoke execute on function public.create_admin_provision_token() from public, anon, authenticated;
grant execute on function public.create_admin_provision_token() to service_role;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  wants_counselor boolean := coalesce(meta ->> 'role_request', '') = 'counselor';
  v_name text := nullif(btrim(coalesce(meta ->> 'full_name', '')), '');
  v_username text := lower(nullif(btrim(coalesce(meta ->> 'username', '')), ''));
  v_contact text := nullif(btrim(coalesce(meta ->> 'contact_email', '')), '');
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

  insert into public.profiles (id, email, username, full_name, role, status, grade, section, student_number, title)
  values (
    new.id,
    case when new.email like '%.invalid' then v_contact else coalesce(v_contact, new.email) end,
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
    insert into public.notifications (user_id, kind, title, body, href)
    select p.id, 'counselor_request', 'New counselor account awaiting approval',
           left(coalesce(v_name, v_username), 160), '/admin/users?status=pending'
    from public.profiles p where p.role = 'admin' and p.status = 'active';
  end if;
  return new;
end $$;
