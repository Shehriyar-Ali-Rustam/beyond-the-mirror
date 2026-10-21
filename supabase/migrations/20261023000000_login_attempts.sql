-- skip-if: select to_regclass('public.auth_attempts') is not null
-- =============================================================================
-- Brute-force protection for login and sign-up.
-- Only the server (service key) can read or write this table: RLS is on with no
-- policies, and the API roles have no grants.
-- =============================================================================

create table public.auth_attempts (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind in ('login_failed', 'signup')),
  username    text,
  ip          text,
  created_at  timestamptz not null default now()
);

create index auth_attempts_username_idx on public.auth_attempts (kind, username, created_at desc);
create index auth_attempts_ip_idx on public.auth_attempts (kind, ip, created_at desc);

alter table public.auth_attempts enable row level security;
revoke all on public.auth_attempts from anon, authenticated;
