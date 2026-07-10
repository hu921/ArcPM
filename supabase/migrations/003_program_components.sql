-- ArcPM Phase 4a: program_components + timeline range
-- Run once in Supabase SQL Editor (arcpm)

-- ─── Timeline range on programs ─────────────────────────────────────────────

alter table programs
  add column if not exists timeline_start date,
  add column if not exists timeline_end date;

-- ─── Program components ─────────────────────────────────────────────────────

create table if not exists program_components (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references programs(id) on delete cascade,
  name        text not null,
  color       text not null default '#7F77DD',
  sort_order  int not null default 0,
  created_by  uuid references user_profiles(id) on delete set null,
  created_at  timestamptz default now(),
  unique (program_id, name)
);

create index if not exists program_components_program_id_idx
  on program_components(program_id);

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table program_components enable row level security;

create policy "Members can read program components"
  on program_components for select
  using (public.is_program_member(program_id));

create policy "Program ops can insert program components"
  on program_components for insert
  with check (public.is_program_ops(program_id));

create policy "Program ops can update program components"
  on program_components for update
  using (public.is_program_ops(program_id));

create policy "Program ops can delete program components"
  on program_components for delete
  using (public.is_program_ops(program_id));
