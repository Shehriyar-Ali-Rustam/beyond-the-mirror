-- Voice notes can now be up to two minutes long and 7 MB in size.
-- Files go straight from the browser to private storage (a signed upload), so
-- they are no longer limited by the size of a request to the website.

alter table public.voice_notes drop constraint if exists voice_notes_duration_seconds_check;
alter table public.voice_notes add constraint voice_notes_duration_seconds_check check (duration_seconds between 15 and 125);

update storage.buckets set file_size_limit = 7340032 where id = 'voices';
