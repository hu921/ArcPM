-- ArcPM fixes after initial schema.sql
-- Run in Supabase SQL Editor (arcpm project)

-- 1. Tracks write access (needed when creating a hardware-template program)
create policy "Members can insert tracks"
  on tracks for insert
  with check (public.is_program_member(program_id));

create policy "Members can update tracks"
  on tracks for update
  using (public.is_program_member(program_id));

-- 2. Program create: use auth.uid() check (more reliable with publishable keys)
drop policy if exists "Authenticated users can create programs" on programs;

create policy "Authenticated users can create programs"
  on programs for insert
  with check (auth.uid() is not null and created_by = auth.uid());
