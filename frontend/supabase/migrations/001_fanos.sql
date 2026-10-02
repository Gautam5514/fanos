-- FanOS schema for Supabase. Run once in Supabase → SQL Editor → New query → Run.
-- Safe to re-run (idempotent).
--
-- Security model: Row Level Security is ON for every table and NO policies are created,
-- so the public (publishable/anon) key cannot read or write any table.
-- Only the Next.js server, using SUPABASE_SECRET_KEY, accesses data; it enforces
-- roles (creator vs member) and validates every write in app/lib/server/actions.js.

-- 1. Profiles: one row per Supabase Auth user (role + link to the community member record)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null check (role in ('creator', 'member')),
  member_id text unique,
  provider text not null default 'email',
  created_at timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles (role);

-- 2. Community state: communities, members, ideas, votes, comments, collaboration
--    requests, projects, invites, announcements. Stored as one versioned JSON document
--    so the same reducer runs in the browser and on the server; writes use optimistic
--    concurrency (UPDATE … WHERE version = expected).
create table if not exists public.app_state (
  id int primary key default 1 check (id = 1),
  version bigint not null default 1,
  data jsonb not null,
  member_supports jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 3. Real creator test feedback (validation kit)
create table if not exists public.creator_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  consent_publish boolean not null default false,
  data jsonb not null
);
create index if not exists creator_feedback_created_idx on public.creator_feedback (created_at desc);

alter table public.profiles enable row level security;
alter table public.app_state enable row level security;
alter table public.creator_feedback enable row level security;

-- Make sure the public API roles have no direct table privileges either.
revoke all on public.profiles, public.app_state, public.creator_feedback from anon, authenticated;
