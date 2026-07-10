-- ArcPM: allow members to delete launch checklist items

drop policy if exists "Members can delete launch items" on launch_items;
create policy "Members can delete launch items"
  on launch_items for delete
  using (public.is_program_member(program_id));
