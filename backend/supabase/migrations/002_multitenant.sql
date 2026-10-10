-- FanOS multi-tenant migration. Run once in Supabase → SQL Editor → New query → Run.
-- Safe to re-run (idempotent).
--
-- WHAT THIS CHANGES
--   Before: ONE global community — app_state had a single row (id = 1) shared by everyone,
--           and the first creator to sign up "claimed" it.
--   After:  EACH creator owns an isolated community. app_state has one row per creator
--           (primary key = creator_id), and every member belongs to exactly one creator's
--           community via profiles.community_id.
--
-- Security model is unchanged: RLS stays ON with NO policies, so only the backend API
-- (SUPABASE_SECRET_KEY) can read/write. Roles + validation are enforced in the API.
--
-- NOTE: this drops the old single-row community document. Existing community CONTENT
-- (ideas / projects / members inside the JSON blob) is NOT migrated — each creator starts
-- with a fresh empty community. Auth accounts (profiles / auth.users) are preserved;
-- members will re-join through a creator's invite link.

-- 1. profiles.community_id — which creator's community this account belongs to.
--    For a creator, community_id = their own id. For a member, it is the creator they joined.
alter table public.profiles
  add column if not exists community_id uuid references public.profiles (id) on delete cascade;
create index if not exists profiles_community_idx on public.profiles (community_id);

-- Backfill: existing creators own their own community.
update public.profiles set community_id = id where role = 'creator' and community_id is null;

-- 2. app_state — one versioned community document PER creator.
--    Rebuild the table keyed by creator_id (the old table was keyed by the fixed id = 1).
drop table if exists public.app_state cascade;

create table public.app_state (
  creator_id uuid primary key references public.profiles (id) on delete cascade,
  version bigint not null default 1,
  data jsonb not null,
  member_supports jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Keep the public API roles with no direct table privileges.
revoke all on public.app_state from anon, authenticated;

-- 3. Seed an empty community document for every existing creator so they have a home
--    immediately after the migration (the API also creates one lazily on first access).
insert into public.app_state (creator_id, version, data, member_supports)
select id,
       1,
       jsonb_build_object(
         'creator', jsonb_build_object(
           'id', 'creator', 'name', coalesce(name, ''), 'firstName', '',
           'handle', '', 'niche', '', 'platforms', '[]'::jsonb, 'claimed', false
         ),
         'ideas', '[]'::jsonb,
         'members', '[]'::jsonb,
         'opportunities', '[]'::jsonb,
         'projects', '[]'::jsonb,
         'communities', '[]'::jsonb,
         'activity', '[]'::jsonb,
         'announcements', '[]'::jsonb,
         'invites', '[]'::jsonb,
         'topicBoost', '{}'::jsonb,
         'newActivity', 0
       ),
       '{}'::jsonb
from public.profiles
where role = 'creator'
on conflict (creator_id) do nothing;
