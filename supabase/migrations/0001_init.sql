-- FEAT-030 — Supabase infra base initial schema
-- 2026-05-19
-- ref: docs/specs/2026-05-19-supabase-migration-roadmap.md

-- table: days
create table if not exists public.days (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  intention text,
  mood jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- table: priorities
create table if not exists public.priorities (
  id text primary key,
  user_id uuid not null,
  date date not null,
  text text not null,
  done boolean not null default false,
  position int not null,
  foreign key (user_id, date) references public.days(user_id, date) on delete cascade
);

-- table: agenda_slots
create table if not exists public.agenda_slots (
  user_id uuid not null,
  date date not null,
  hour smallint not null check (hour between 6 and 23),
  text text not null default '',
  energy_emoji text,
  primary key (user_id, date, hour),
  foreign key (user_id, date) references public.days(user_id, date) on delete cascade
);

-- table: notes
create table if not exists public.notes (
  id text primary key,
  user_id uuid not null,
  date date not null,
  prefix text not null check (prefix in ('•','→','—','★')),
  text text not null,
  position int not null,
  foreign key (user_id, date) references public.days(user_id, date) on delete cascade
);

-- table: gratitude_items
create table if not exists public.gratitude_items (
  id text primary key,
  user_id uuid not null,
  date date not null,
  text text not null,
  position int not null,
  foreign key (user_id, date) references public.days(user_id, date) on delete cascade
);

-- indexes
create index if not exists days_user_date_desc on public.days(user_id, date desc);
create index if not exists priorities_user_date on public.priorities(user_id, date);
create index if not exists notes_user_date on public.notes(user_id, date);
create index if not exists gratitude_items_user_date on public.gratitude_items(user_id, date);

-- rls
alter table public.days enable row level security;
drop policy if exists "user owns row" on public.days;
create policy "user owns row" on public.days for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.priorities enable row level security;
drop policy if exists "user owns row" on public.priorities;
create policy "user owns row" on public.priorities for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.agenda_slots enable row level security;
drop policy if exists "user owns row" on public.agenda_slots;
create policy "user owns row" on public.agenda_slots for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.notes enable row level security;
drop policy if exists "user owns row" on public.notes;
create policy "user owns row" on public.notes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.gratitude_items enable row level security;
drop policy if exists "user owns row" on public.gratitude_items;
create policy "user owns row" on public.gratitude_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
