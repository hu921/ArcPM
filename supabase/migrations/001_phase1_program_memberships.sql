-- Phase 1: program memberships + onboarding fields
-- Run after existing schema.sql on deployed Supabase projects.

-- ─── user_profiles ───────────────────────────────────────────────────────────

alter table user_profiles
  add column if not exists account_setup_complete boolean not null default false,
  add column if not exists last_active_program_id uuid references programs(id) on delete set null;

-- Backfill: existing users who completed legacy onboarding
update user_profiles set account_setup_complete = true where role is not null;

-- ─── programs ────────────────────────────────────────────────────────────────

alter table programs
  add column if not exists created_by uuid references user_profiles(id) on delete set null,
  add column if not exists template text not null default 'hardware';

alter table programs alter column version drop not null;
alter table programs alter column version set default '';

-- ─── program_members ─────────────────────────────────────────────────────────

create table if not exists program_members (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references programs(id) on delete cascade,
  user_id     uuid not null references user_profiles(id) on delete cascade,
  role        text not null default 'product',
  status      text not null default 'active',
  invited_by  uuid references user_profiles(id) on delete set null,
  joined_at   timestamptz default now(),
  unique (program_id, user_id)
);

create index if not exists program_members_user_id_idx on program_members(user_id);
create index if not exists program_members_program_id_idx on program_members(program_id);

-- ─── program_invites ─────────────────────────────────────────────────────────

create table if not exists program_invites (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references programs(id) on delete cascade,
  email       text not null,
  role        text not null default 'product',
  invited_by  uuid not null references user_profiles(id) on delete cascade,
  token       text not null unique default encode(gen_random_bytes(24), 'hex'),
  expires_at  timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  revoked_at  timestamptz,
  created_at  timestamptz default now()
);

create index if not exists program_invites_email_idx on lower(email);

-- ─── handle_new_user (stop setting global role) ──────────────────────────────

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, full_name, account_setup_complete)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    false
  );
  return new;
end;
$$ language plpgsql security definer;

-- ─── RLS helpers ─────────────────────────────────────────────────────────────

create or replace function public.is_program_member(p_program_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.program_members
    where program_id = p_program_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$ language sql security definer stable;

create or replace function public.is_program_ops(p_program_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.program_members
    where program_id = p_program_id
      and user_id = auth.uid()
      and role = 'program_ops'
      and status = 'active'
  );
$$ language sql security definer stable;

-- ─── program_members RLS ───────────────────────────────────────────────────

alter table program_members enable row level security;

create policy "Members can read program membership"
  on program_members for select
  using (public.is_program_member(program_id) or user_id = auth.uid());

create policy "Users can insert own membership"
  on program_members for insert
  with check (user_id = auth.uid());

create policy "Program ops can update membership"
  on program_members for update
  using (public.is_program_ops(program_id));

-- ─── program_invites RLS ─────────────────────────────────────────────────────

alter table program_invites enable row level security;

create policy "Invitee or inviter can read invite"
  on program_invites for select
  using (
    invited_by = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "Program ops can create invites"
  on program_invites for insert
  with check (public.is_program_ops(program_id));

create policy "Program ops can revoke invites"
  on program_invites for update
  using (public.is_program_ops(program_id));

-- ─── programs RLS (replace open read) ────────────────────────────────────────

drop policy if exists "Authenticated users can read programs" on programs;

create policy "Members can read programs"
  on programs for select
  using (public.is_program_member(id));

create policy "Authenticated users can create programs"
  on programs for insert
  with check (auth.role() = 'authenticated' and created_by = auth.uid());

create policy "Program ops can update programs"
  on programs for update
  using (public.is_program_ops(id));

-- ─── Drop legacy global program_ops profile policy ───────────────────────────

drop policy if exists "Program ops can update any profile" on user_profiles;

-- Optional: backfill SR1 seed memberships for existing users (run manually if needed)
-- insert into program_members (program_id, user_id, role, status)
-- select p.id, u.id, u.role, 'active'
-- from programs p cross join user_profiles u
-- where p.name = 'SR1 v1'
-- on conflict do nothing;
