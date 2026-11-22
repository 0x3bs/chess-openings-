-- ChessCoach Supabase schema.
-- Run this in the Supabase SQL editor (Dashboard -> SQL -> New query).

create table if not exists public.line_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  line_id text not null,
  attempts integer not null default 0,
  clean integer not null default 0,
  total_mistakes integer not null default 0,
  total_hints integer not null default 0,
  last_practiced timestamptz not null default now(),
  interval integer not null default 0,
  ease real not null default 2.5,
  reps integer not null default 0,
  due_at timestamptz not null default now(),
  history jsonb not null default '[]'::jsonb,
  streak integer not null default 0,
  mastery integer not null default 0,
  last_mistakes integer not null default 0,
  last_hints integer not null default 0,
  last_quality integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, line_id)
);

-- Upgrade an older table created before mastery/streak existed.
alter table public.line_progress
  add column if not exists streak integer not null default 0,
  add column if not exists mastery integer not null default 0,
  add column if not exists last_mistakes integer not null default 0,
  add column if not exists last_hints integer not null default 0,
  add column if not exists last_quality integer not null default 0;

alter table public.line_progress enable row level security;

drop policy if exists "Users can read their own progress" on public.line_progress;
create policy "Users can read their own progress"
  on public.line_progress for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own progress" on public.line_progress;
create policy "Users can insert their own progress"
  on public.line_progress for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own progress" on public.line_progress;
create policy "Users can update their own progress"
  on public.line_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own progress" on public.line_progress;
create policy "Users can delete their own progress"
  on public.line_progress for delete
  using (auth.uid() = user_id);

create index if not exists line_progress_user_idx
  on public.line_progress (user_id);

-- Daily training days and total completed attempts, used by the dashboard
-- streak and lifetime counters.
create table if not exists public.user_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  days jsonb not null default '[]'::jsonb,
  sessions integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_stats enable row level security;

drop policy if exists "Users can read their own stats" on public.user_stats;
create policy "Users can read their own stats"
  on public.user_stats for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own stats" on public.user_stats;
create policy "Users can insert their own stats"
  on public.user_stats for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own stats" on public.user_stats;
create policy "Users can update their own stats"
  on public.user_stats for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
