-- ArcPM: certification items per program

create table if not exists cert_items (
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

create index if not exists cert_items_program_id_idx on cert_items(program_id);

alter table cert_items enable row level security;

drop policy if exists "Members can read cert items" on cert_items;
create policy "Members can read cert items"
  on cert_items for select
  using (public.is_program_member(program_id));

drop policy if exists "Members can insert cert items" on cert_items;
create policy "Members can insert cert items"
  on cert_items for insert
  with check (public.is_program_member(program_id));

drop policy if exists "Members can update cert items" on cert_items;
create policy "Members can update cert items"
  on cert_items for update
  using (public.is_program_member(program_id));

drop policy if exists "Members can delete cert items" on cert_items;
create policy "Members can delete cert items"
  on cert_items for delete
  using (public.is_program_member(program_id));
