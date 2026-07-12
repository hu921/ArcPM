-- ============================================================
-- ArcPM — Supabase Schema (multi-user, multi-program)
-- Run this in your Supabase SQL editor (Database > SQL Editor)
-- For upgrades from the legacy schema, run migrations/001_phase1_program_memberships.sql
-- ============================================================

-- ─── User profiles (extends Supabase auth.users) ──────────────────────────

create table user_profiles (
  id                       uuid primary key references auth.users(id) on delete cascade,
  email                    text not null,
  full_name                text not null,
  account_setup_complete   boolean not null default false,
  last_active_program_id   uuid,
  created_at               timestamptz default now()
);

-- ─── Programs ─────────────────────────────────────────────────────────────

create table programs (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  version         text default '',
  launch_target   date,
  reporter        text,
  created_by      uuid references user_profiles(id) on delete set null,
  template        text not null default 'hardware',
  status          text default 'active',
  created_at      timestamptz default now()
);

alter table user_profiles
  add constraint user_profiles_last_active_program_id_fkey
  foreign key (last_active_program_id) references programs(id) on delete set null;

-- ─── Program members ───────────────────────────────────────────────────────

create table program_members (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references programs(id) on delete cascade,
  user_id     uuid not null references user_profiles(id) on delete cascade,
  role        text not null default 'product',
  status      text not null default 'active',
  invited_by  uuid references user_profiles(id) on delete set null,
  joined_at   timestamptz default now(),
  unique (program_id, user_id)
);

create index program_members_user_id_idx on program_members(user_id);
create index program_members_program_id_idx on program_members(program_id);

-- ─── Program invites ───────────────────────────────────────────────────────

create table program_invites (
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

-- ─── Tracks ───────────────────────────────────────────────────────────────

create table tracks (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid references programs(id) on delete cascade,
  name        text not null,
  color       text default '#7F77DD',
  status      text default 'on-track',
  owner_role  text,
  start_date  date,
  end_date    date,
  created_at  timestamptz default now()
);

-- ─── Risk items ───────────────────────────────────────────────────────────

create table risk_items (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid references programs(id) on delete cascade,
  track       text not null,
  area        text not null,
  status_note text,
  mitigation  text,
  level       text default 'major',
  next_cp     date,
  created_by  uuid references user_profiles(id),
  updated_by  uuid references user_profiles(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── Launch items ─────────────────────────────────────────────────────────

create table launch_items (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid references programs(id) on delete cascade,
  domain      text not null,
  label       text not null,
  status      text default 'ongoing',
  owner       text,
  note        text,
  updated_by  uuid references user_profiles(id),
  updated_at  timestamptz default now()
);

-- ─── Certification items ────────────────────────────────────────────────────

create table cert_items (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid references programs(id) on delete cascade not null,
  name        text not null,
  level       text not null default 'major',
  status      text not null default 'Not started',
  target      text,
  owner       text,
  region      text not null default 'Global',
  note        text,
  updated_by  uuid references user_profiles(id),
  updated_at  timestamptz default now()
);

-- ─── Change log ───────────────────────────────────────────────────────────

create table change_log (
  id                   uuid primary key default gen_random_uuid(),
  program_id           uuid references programs(id) on delete cascade,
  created_by           uuid references user_profiles(id),
  input_text           text not null,
  input_mode           text default 'text',
  ai_result            jsonb,
  risk_score           integer,
  risk_level           text,
  launch_impact_days   integer,
  created_at           timestamptz default now()
);

-- ─── Auth trigger ───────────────────────────────────────────────────────────

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── RLS helpers ───────────────────────────────────────────────────────────

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

-- ─── Row Level Security ───────────────────────────────────────────────────

alter table user_profiles enable row level security;
alter table programs enable row level security;
alter table program_members enable row level security;
alter table program_invites enable row level security;
alter table tracks enable row level security;
alter table risk_items enable row level security;
alter table launch_items enable row level security;
alter table cert_items enable row level security;
alter table change_log enable row level security;

create policy "Authenticated users can read profiles"
  on user_profiles for select using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on user_profiles for update using (auth.uid() = id);

create policy "Members can read programs"
  on programs for select using (public.is_program_member(id));

create policy "Authenticated users can create programs"
  on programs for insert with check (auth.uid() is not null and created_by = auth.uid());

create policy "Program ops can update programs"
  on programs for update using (public.is_program_ops(id));

create policy "Members can read program membership"
  on program_members for select
  using (public.is_program_member(program_id) or user_id = auth.uid());

create policy "Users can insert own membership"
  on program_members for insert with check (user_id = auth.uid());

create policy "Program ops can update membership"
  on program_members for update using (public.is_program_ops(program_id));

create policy "Invitee or inviter can read invite"
  on program_invites for select
  using (
    invited_by = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "Program ops can create invites"
  on program_invites for insert with check (public.is_program_ops(program_id));

create policy "Program ops can revoke invites"
  on program_invites for update using (public.is_program_ops(program_id));

-- Program-scoped data: members only (API routes without auth may need service role — see docs)
create policy "Members can read tracks"
  on tracks for select using (public.is_program_member(program_id));

create policy "Members can insert tracks"
  on tracks for insert with check (public.is_program_member(program_id));

create policy "Members can update tracks"
  on tracks for update using (public.is_program_member(program_id));

create policy "Members can read risk items"
  on risk_items for select using (public.is_program_member(program_id));

create policy "Members can read launch items"
  on launch_items for select using (public.is_program_member(program_id));

create policy "Members can read change log"
  on change_log for select using (public.is_program_member(program_id));

create policy "Members can insert risk items"
  on risk_items for insert with check (public.is_program_member(program_id));

create policy "Members can update risk items"
  on risk_items for update using (public.is_program_member(program_id));

create policy "Members can insert launch items"
  on launch_items for insert with check (public.is_program_member(program_id));

create policy "Members can update launch items"
  on launch_items for update using (public.is_program_member(program_id));

create policy "Members can read cert items"
  on cert_items for select using (public.is_program_member(program_id));

create policy "Members can insert cert items"
  on cert_items for insert with check (public.is_program_member(program_id));

create policy "Members can update cert items"
  on cert_items for update using (public.is_program_member(program_id));

create policy "Members can delete cert items"
  on cert_items for delete using (public.is_program_member(program_id));

create policy "Members can insert change log"
  on change_log for insert with check (public.is_program_member(program_id));

-- ─── Google OAuth setup (Supabase Dashboard) ───────────────────────────────
-- Authentication > Providers > Google: enable and add OAuth client ID/secret
-- Authentication > URL Configuration:
--   Site URL: http://localhost:3000  (or your Vercel URL)
--   Redirect URLs: http://localhost:3000/auth/callback
--
-- Onboarding: /signup → Google → /onboarding/account → create program OR join invite

-- ─── Optional demo seed (SR1 sample — not inserted by default) ─────────────
-- See demo mode in the app or run docs/onboarding-workflow-plan.md sample loader.
