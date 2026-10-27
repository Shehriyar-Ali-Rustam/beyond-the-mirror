-- skip-if: select to_regclass('public.voice_notes') is not null
-- =============================================================================
-- 1. "A Voice That Understands": short, human-recorded voice notes.
--    Anyone signed in can submit one; nothing is playable until a counselor or
--    the admin approves it. Speakers can stay anonymous to listeners (staff can
--    always see who submitted, for safety).
--
-- 2. Doodle Wall: students post drawings for others to guess. The secret word
--    is never sent to someone until they guess it, give up, or drew it.
--
-- Like the community board, the tables are never exposed to the API: all
-- access goes through the functions below, which check the caller.
-- =============================================================================

create type public.voice_category as enum ('lonely', 'exam', 'giving_up', 'overwhelmed', 'hope', 'self_worth');
create type public.voice_language as enum ('en', 'ur');
create type public.review_status as enum ('pending', 'approved', 'rejected');

create table public.voice_notes (
  id                uuid primary key default gen_random_uuid(),
  author_id         uuid not null references public.profiles (id) on delete cascade,
  category          public.voice_category not null,
  language          public.voice_language not null default 'en',
  title             text not null check (char_length(btrim(title)) between 3 and 80),
  speaker_name      text check (speaker_name is null or char_length(btrim(speaker_name)) between 1 and 40),
  is_anonymous      boolean not null default true,
  audio_path        text not null check (audio_path ~ '^voices/[0-9a-f-]{36}\.(webm|ogg|m4a|mp3)$'),
  mime_type         text not null check (mime_type in ('audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg')),
  duration_seconds  smallint not null check (duration_seconds between 15 and 65),
  status            public.review_status not null default 'pending',
  reviewed_by       uuid references public.profiles (id) on delete set null,
  reviewed_at       timestamptz,
  review_note       text check (review_note is null or char_length(review_note) <= 300),
  play_count        integer not null default 0,
  created_at        timestamptz not null default now()
);
create index voice_notes_library_idx on public.voice_notes (status, category, created_at desc);
create index voice_notes_author_idx on public.voice_notes (author_id, created_at desc);

create table public.doodles (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles (id) on delete cascade,
  word        text not null check (word ~ '^[a-z][a-z ]{1,23}$'),
  image_path  text not null check (image_path ~ '^doodles/[0-9a-f-]{36}\.png$'),
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index doodles_created_idx on public.doodles (created_at desc);

create table public.doodle_guesses (
  doodle_id   uuid not null references public.doodles (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  solved      boolean not null default false,
  revealed    boolean not null default false,
  attempts    smallint not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (doodle_id, user_id)
);

create table public.doodle_reports (
  doodle_id    uuid not null references public.doodles (id) on delete cascade,
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (doodle_id, reporter_id)
);

alter table public.voice_notes enable row level security;
alter table public.doodles enable row level security;
alter table public.doodle_guesses enable row level security;
alter table public.doodle_reports enable row level security;
revoke all on public.voice_notes, public.doodles, public.doodle_guesses, public.doodle_reports from anon, authenticated;
grant all on public.voice_notes, public.doodles, public.doodle_guesses, public.doodle_reports to service_role;

-- ---------------------------------------------------------------------------
-- Voice notes
-- ---------------------------------------------------------------------------
create or replace function public.submit_voice_note(
  p_category public.voice_category, p_language public.voice_language, p_title text,
  p_speaker_name text, p_anonymous boolean, p_audio_path text, p_mime text, p_duration int
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  new_id uuid;
begin
  if public.current_role_active() is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if (select count(*) from public.voice_notes where author_id = auth.uid() and created_at > now() - interval '1 day') >= 5 then
    raise exception 'You have shared several voice notes today. Thank you! Please try again tomorrow.' using errcode = 'P0001';
  end if;
  insert into public.voice_notes (author_id, category, language, title, speaker_name, is_anonymous, audio_path, mime_type, duration_seconds)
  values (auth.uid(), p_category, p_language, btrim(p_title),
          case when coalesce(p_anonymous, true) then null else nullif(btrim(p_speaker_name), '') end,
          coalesce(p_anonymous, true), p_audio_path, p_mime, p_duration)
  returning id into new_id;

  insert into public.notifications (user_id, kind, title, body, href)
  select s.id, 'voice', 'New voice note to review', btrim(p_title), '/' || s.role::text || '/voices?tab=review'
  from public.profiles s where s.role in ('counselor', 'admin') and s.status = 'active' and s.id <> auth.uid();
  return new_id;
end $$;

-- Approved notes only. Anonymous speakers are never named to listeners.
create or replace function public.voice_library(p_category public.voice_category default null, p_language public.voice_language default null)
returns table (
  id uuid, category public.voice_category, language public.voice_language, title text, speaker text,
  duration_seconds smallint, play_count integer, created_at timestamptz, audio_path text, mime_type text, is_mine boolean
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if public.current_role_active() is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  return query
  select v.id, v.category, v.language, v.title,
         case when v.is_anonymous then null else coalesce(v.speaker_name, split_part(a.full_name, ' ', 1)) end,
         v.duration_seconds, v.play_count, v.created_at, v.audio_path, v.mime_type, v.author_id = auth.uid()
  from public.voice_notes v join public.profiles a on a.id = v.author_id
  where v.status = 'approved'
    and (p_category is null or v.category = p_category)
    and (p_language is null or v.language = p_language)
  order by v.created_at desc
  limit 200;
end $$;

create or replace function public.random_voice_note(p_category public.voice_category default null)
returns table (
  id uuid, category public.voice_category, language public.voice_language, title text, speaker text,
  duration_seconds smallint, play_count integer, created_at timestamptz, audio_path text, mime_type text, is_mine boolean
)
language sql stable security definer set search_path = ''
as $$
  select * from public.voice_library(p_category, null) order by random() limit 1
$$;

create or replace function public.my_voice_notes()
returns table (id uuid, category public.voice_category, language public.voice_language, title text, status public.review_status,
               review_note text, duration_seconds smallint, play_count integer, created_at timestamptz, audio_path text, mime_type text)
language sql stable security definer set search_path = ''
as $$
  select id, category, language, title, status, review_note, duration_seconds, play_count, created_at, audio_path, mime_type
  from public.voice_notes where author_id = auth.uid() order by created_at desc limit 50
$$;

-- Staff only: everything waiting for review, with who submitted it.
create or replace function public.voice_review_queue()
returns table (id uuid, category public.voice_category, language public.voice_language, title text, speaker_name text,
               is_anonymous boolean, author_name text, author_username text, duration_seconds smallint,
               created_at timestamptz, audio_path text, mime_type text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_staff() then raise exception 'Staff only.' using errcode = '42501'; end if;
  return query
  select v.id, v.category, v.language, v.title, v.speaker_name, v.is_anonymous, a.full_name, a.username,
         v.duration_seconds, v.created_at, v.audio_path, v.mime_type
  from public.voice_notes v join public.profiles a on a.id = v.author_id
  where v.status = 'pending'
  order by v.created_at
  limit 100;
end $$;

create or replace function public.review_voice_note(p_id uuid, p_approve boolean, p_note text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  note public.voice_notes;
begin
  if not public.is_staff() then raise exception 'Staff only.' using errcode = '42501'; end if;
  update public.voice_notes
  set status = case when p_approve then 'approved'::public.review_status else 'rejected'::public.review_status end,
      reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(btrim(p_note), '')
  where id = p_id and status = 'pending'
  returning * into note;
  if note.id is null then raise exception 'That voice note was already reviewed.' using errcode = 'P0002'; end if;

  perform public.notify(note.author_id, 'voice',
    case when p_approve then 'Your voice note is live' else 'Your voice note wasn''t published' end,
    case when p_approve then 'Thank you for helping someone feel less alone: ' || note.title
         else coalesce(nullif(btrim(p_note), ''), 'It didn''t meet the guidelines this time.') end,
    '/' || (select p.role::text from public.profiles p where p.id = note.author_id) || '/voices?tab=mine');
end $$;

create or replace function public.delete_voice_note(p_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  path text;
begin
  delete from public.voice_notes where id = p_id and (author_id = auth.uid() or public.is_staff())
  returning audio_path into path;
  if not found then raise exception 'Voice note not found.' using errcode = 'P0002'; end if;
  return path;
end $$;

create or replace function public.count_voice_play(p_id uuid)
returns void language sql security definer set search_path = ''
as $$
  update public.voice_notes set play_count = play_count + 1
  where id = p_id and status = 'approved' and public.current_role_active() is not null
$$;

-- ---------------------------------------------------------------------------
-- Doodle Wall
-- ---------------------------------------------------------------------------
create or replace function public.normalize_guess(t text)
returns text language sql immutable set search_path = ''
as $$ select regexp_replace(regexp_replace(lower(btrim(coalesce(t, ''))), '[^a-z ]', '', 'g'), '\s+', ' ', 'g') $$;

create or replace function public.doodle_wall(p_before timestamptz default null, p_limit int default 24)
returns table (
  id uuid, image_path text, created_at timestamptz, is_mine boolean, author_name text,
  solved boolean, revealed boolean, attempts smallint, answer text, hint text,
  solvers bigint, hidden boolean, report_count bigint
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  staff boolean := public.is_staff();
begin
  if public.current_role_active() is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  return query
  select d.id, d.image_path, d.created_at, d.author_id = auth.uid(),
         case when staff or d.author_id = auth.uid() then a.full_name else null end,
         coalesce(g.solved, false), coalesce(g.revealed, false), coalesce(g.attempts, 0::smallint),
         case when d.author_id = auth.uid() or coalesce(g.solved, false) or coalesce(g.revealed, false) or staff then d.word else null end,
         regexp_replace(d.word, '[a-z]', '_', 'g'),
         (select count(*) from public.doodle_guesses x where x.doodle_id = d.id and x.solved),
         d.hidden,
         case when staff then (select count(*) from public.doodle_reports r where r.doodle_id = d.id) else 0 end
  from public.doodles d
  join public.profiles a on a.id = d.author_id
  left join public.doodle_guesses g on g.doodle_id = d.id and g.user_id = auth.uid()
  where (not d.hidden or staff or d.author_id = auth.uid())
    and (p_before is null or d.created_at < p_before)
  order by d.created_at desc
  limit least(greatest(coalesce(p_limit, 24), 1), 48);
end $$;

create or replace function public.create_doodle(p_word text, p_image_path text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  new_id uuid;
begin
  if public.current_role_active() is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  if (select count(*) from public.doodles where author_id = auth.uid() and created_at > now() - interval '1 day') >= 15 then
    raise exception 'That''s a lot of doodles today! Try again tomorrow.' using errcode = 'P0001';
  end if;
  insert into public.doodles (author_id, word, image_path)
  values (auth.uid(), public.normalize_guess(p_word), p_image_path)
  returning id into new_id;
  return new_id;
end $$;

-- Returns {correct, answer, attempts}. The answer is only included once solved,
-- or after three wrong guesses.
create or replace function public.guess_doodle(p_id uuid, p_guess text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  d public.doodles;
  g public.doodle_guesses;
  guess text := public.normalize_guess(p_guess);
  correct boolean;
begin
  if public.current_role_active() is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  select * into d from public.doodles where id = p_id and not hidden;
  if d.id is null then raise exception 'That doodle is no longer available.' using errcode = 'P0002'; end if;
  if d.author_id = auth.uid() then raise exception 'You drew this one!' using errcode = 'P0001'; end if;

  select * into g from public.doodle_guesses where doodle_id = p_id and user_id = auth.uid();
  -- Already solved, given up, or out of tries: no more scoring.
  if g.solved or g.revealed or coalesce(g.attempts, 0) >= 3 then
    return jsonb_build_object('correct', coalesce(g.solved, false), 'answer', d.word, 'attempts', g.attempts);
  end if;

  correct := guess = d.word
          or replace(guess, ' ', '') = replace(d.word, ' ', '')
          or regexp_replace(guess, 's$', '') = regexp_replace(d.word, 's$', '');

  insert into public.doodle_guesses (doodle_id, user_id, solved, attempts, updated_at)
  values (p_id, auth.uid(), correct, 1, now())
  on conflict (doodle_id, user_id) do update
    set solved = excluded.solved, attempts = public.doodle_guesses.attempts + 1, updated_at = now()
  returning * into g;

  return jsonb_build_object(
    'correct', correct,
    'attempts', g.attempts,
    'answer', case when correct or g.attempts >= 3 then d.word else null end
  );
end $$;

create or replace function public.reveal_doodle(p_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  w text;
begin
  if public.current_role_active() is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  select word into w from public.doodles where id = p_id and not hidden;
  if w is null then raise exception 'That doodle is no longer available.' using errcode = 'P0002'; end if;
  insert into public.doodle_guesses (doodle_id, user_id, revealed, attempts, updated_at)
  values (p_id, auth.uid(), true, 0, now())
  on conflict (doodle_id, user_id) do update set revealed = true, updated_at = now();
  return w;
end $$;

create or replace function public.delete_doodle(p_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  path text;
begin
  delete from public.doodles where id = p_id and (author_id = auth.uid() or public.is_staff())
  returning image_path into path;
  if not found then raise exception 'Doodle not found.' using errcode = 'P0002'; end if;
  return path;
end $$;

create or replace function public.moderate_doodle(p_id uuid, p_hidden boolean)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_staff() then raise exception 'Staff only.' using errcode = '42501'; end if;
  update public.doodles set hidden = p_hidden where id = p_id;
end $$;

create or replace function public.report_doodle(p_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  reports int;
begin
  if public.current_role_active() is null then raise exception 'Not allowed.' using errcode = '42501'; end if;
  insert into public.doodle_reports (doodle_id, reporter_id) values (p_id, auth.uid()) on conflict do nothing;
  if not found then return; end if;
  select count(*) into reports from public.doodle_reports where doodle_id = p_id;
  if reports = 1 then
    insert into public.notifications (user_id, kind, title, body, href)
    select s.id, 'report', 'A doodle was reported', 'Please take a look.', '/' || s.role::text || '/play/doodle'
    from public.profiles s where s.role in ('counselor', 'admin') and s.status = 'active';
  end if;
  if reports >= 3 then update public.doodles set hidden = true where id = p_id; end if;
end $$;

revoke execute on function
  public.submit_voice_note(public.voice_category, public.voice_language, text, text, boolean, text, text, int),
  public.voice_library(public.voice_category, public.voice_language), public.random_voice_note(public.voice_category),
  public.my_voice_notes(), public.voice_review_queue(), public.review_voice_note(uuid, boolean, text),
  public.delete_voice_note(uuid), public.count_voice_play(uuid),
  public.doodle_wall(timestamptz, int), public.create_doodle(text, text), public.guess_doodle(uuid, text),
  public.reveal_doodle(uuid), public.delete_doodle(uuid), public.moderate_doodle(uuid, boolean), public.report_doodle(uuid)
from public, anon;
grant execute on function
  public.submit_voice_note(public.voice_category, public.voice_language, text, text, boolean, text, text, int),
  public.voice_library(public.voice_category, public.voice_language), public.random_voice_note(public.voice_category),
  public.my_voice_notes(), public.voice_review_queue(), public.review_voice_note(uuid, boolean, text),
  public.delete_voice_note(uuid), public.count_voice_play(uuid),
  public.doodle_wall(timestamptz, int), public.create_doodle(text, text), public.guess_doodle(uuid, text),
  public.reveal_doodle(uuid), public.delete_doodle(uuid), public.moderate_doodle(uuid, boolean), public.report_doodle(uuid)
to authenticated;

-- Private bucket for voice recordings (doodles reuse the private "community" bucket).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voices', 'voices', false, 4194304, array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'])
on conflict (id) do nothing;
