-- ArcPM: timeline track fields + delete policies
-- Safe to re-run (idempotent)

alter table tracks
  add column if not exists component text,
  add column if not exists dri_name text,
  add column if not exists dri_id uuid references user_profiles(id) on delete set null;

drop policy if exists "Members can delete tracks" on tracks;
create policy "Members can delete tracks"
  on tracks for delete
  using (public.is_program_member(program_id));

drop policy if exists "Members can delete risk items" on risk_items;
create policy "Members can delete risk items"
  on risk_items for delete
  using (public.is_program_member(program_id));
