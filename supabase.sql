-- 1) Wklej cały ten plik w Supabase -> SQL Editor -> Run

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  company text not null,
  industry text,

  website_url text,
  instagram_url text,

  signal text,
  stage text not null default 'NEW_SIGNAL',

  product text,
  estimated_value numeric(12,2) default 0,

  next_action text,
  follow_up_at timestamptz,

  won_value numeric(12,2),
  won_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,

  type text not null,
  xp integer not null default 0,
  note text,

  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;
alter table public.activities enable row level security;

drop policy if exists "own leads select" on public.leads;
drop policy if exists "own leads insert" on public.leads;
drop policy if exists "own leads update" on public.leads;
drop policy if exists "own leads delete" on public.leads;

create policy "own leads select"
on public.leads for select to authenticated
using (auth.uid() = user_id);

create policy "own leads insert"
on public.leads for insert to authenticated
with check (auth.uid() = user_id);

create policy "own leads update"
on public.leads for update to authenticated
using (auth.uid() = user_id);

create policy "own leads delete"
on public.leads for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "own activities select" on public.activities;
drop policy if exists "own activities insert" on public.activities;
drop policy if exists "own activities update" on public.activities;
drop policy if exists "own activities delete" on public.activities;

create policy "own activities select"
on public.activities for select to authenticated
using (auth.uid() = user_id);

create policy "own activities insert"
on public.activities for insert to authenticated
with check (auth.uid() = user_id);

create policy "own activities update"
on public.activities for update to authenticated
using (auth.uid() = user_id);

create policy "own activities delete"
on public.activities for delete to authenticated
using (auth.uid() = user_id);