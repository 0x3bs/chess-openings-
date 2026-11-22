-- ChessCoach database schema: sync-code model, no email accounts.
--
-- Run this once in the Supabase SQL editor (Dashboard -> SQL -> New query).
-- The browser only keeps the sync code. Every progress row lives in Postgres.
--
-- The anon key is public by design. Direct table access is revoked; the
-- security-definer functions below are the only API, and they verify the code.

create extension if not exists pgcrypto;

create table if not exists public.sync_profiles (
  id uuid primary key default gen_random_uuid(),
  code_hash text unique not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.sync_line_progress (
  profile_id uuid not null references public.sync_profiles (id) on delete cascade,
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
  updated_at timestamptz not null default now(),
  primary key (profile_id, line_id)
);

create table if not exists public.sync_stats (
  profile_id uuid primary key references public.sync_profiles (id) on delete cascade,
  days jsonb not null default '[]'::jsonb,
  sessions integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.sync_profiles enable row level security;
alter table public.sync_line_progress enable row level security;
alter table public.sync_stats enable row level security;

-- Nothing is readable directly with the anon key.
revoke all on public.sync_profiles from anon, authenticated;
revoke all on public.sync_line_progress from anon, authenticated;
revoke all on public.sync_stats from anon, authenticated;

create or replace function public.sync_hash(p_code text)
returns text
language sql
immutable
set search_path = public, extensions, pg_temp
as $$
  select encode(digest(p_code, 'sha256'), 'hex');
$$;

create or replace function public.sync_ensure_profile(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_code is null or length(p_code) < 16 then
    raise exception 'Invalid sync code';
  end if;

  select id into v_id
  from public.sync_profiles
  where code_hash = public.sync_hash(p_code);

  if v_id is null then
    insert into public.sync_profiles (code_hash)
    values (public.sync_hash(p_code))
    on conflict (code_hash) do update set last_seen_at = now()
    returning id into v_id;
  else
    update public.sync_profiles set last_seen_at = now() where id = v_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.sync_create_profile(p_code text)
returns uuid
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.sync_ensure_profile(p_code);
$$;

create or replace function public.sync_check_code(p_code text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.sync_profiles
    where code_hash = public.sync_hash(p_code)
  );
$$;

create or replace function public.sync_load_progress(p_code text)
returns setof public.sync_line_progress
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.sync_profiles
  where code_hash = public.sync_hash(p_code);

  if v_id is null then
    return;
  end if;

  update public.sync_profiles set last_seen_at = now() where id = v_id;
  return query
    select * from public.sync_line_progress where profile_id = v_id;
end;
$$;

create or replace function public.sync_upsert_progress(
  p_code text,
  p_line_id text,
  p_attempts integer,
  p_clean integer,
  p_total_mistakes integer,
  p_total_hints integer,
  p_last_practiced timestamptz,
  p_interval integer,
  p_ease real,
  p_reps integer,
  p_due_at timestamptz,
  p_history jsonb,
  p_streak integer,
  p_mastery integer,
  p_last_mistakes integer,
  p_last_hints integer,
  p_last_quality integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid := public.sync_ensure_profile(p_code);
begin
  insert into public.sync_line_progress (
    profile_id, line_id, attempts, clean, total_mistakes, total_hints,
    last_practiced, interval, ease, reps, due_at, history, streak, mastery,
    last_mistakes, last_hints, last_quality, updated_at
  ) values (
    v_id, p_line_id, p_attempts, p_clean, p_total_mistakes, p_total_hints,
    p_last_practiced, p_interval, p_ease, p_reps, p_due_at,
    coalesce(p_history, '[]'::jsonb), p_streak, p_mastery,
    p_last_mistakes, p_last_hints, p_last_quality, now()
  )
  on conflict (profile_id, line_id) do update set
    attempts = excluded.attempts,
    clean = excluded.clean,
    total_mistakes = excluded.total_mistakes,
    total_hints = excluded.total_hints,
    last_practiced = excluded.last_practiced,
    interval = excluded.interval,
    ease = excluded.ease,
    reps = excluded.reps,
    due_at = excluded.due_at,
    history = excluded.history,
    streak = excluded.streak,
    mastery = excluded.mastery,
    last_mistakes = excluded.last_mistakes,
    last_hints = excluded.last_hints,
    last_quality = excluded.last_quality,
    updated_at = now();
end;
$$;

create or replace function public.sync_load_stats(p_code text)
returns table (days jsonb, sessions integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.sync_profiles
  where code_hash = public.sync_hash(p_code);

  if v_id is null then
    return query select '[]'::jsonb, 0;
    return;
  end if;

  return query
    select coalesce(s.days, '[]'::jsonb), coalesce(s.sessions, 0)
    from (select 1) as one
    left join public.sync_stats s on s.profile_id = v_id;
end;
$$;

create or replace function public.sync_upsert_stats(
  p_code text,
  p_days jsonb,
  p_sessions integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid := public.sync_ensure_profile(p_code);
begin
  insert into public.sync_stats (profile_id, days, sessions, updated_at)
  values (
    v_id,
    coalesce(p_days, '[]'::jsonb),
    coalesce(p_sessions, 0),
    now()
  )
  on conflict (profile_id) do update set
    days = excluded.days,
    sessions = excluded.sessions,
    updated_at = now();
end;
$$;

create or replace function public.sync_clear_progress(p_code text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.sync_profiles
  where code_hash = public.sync_hash(p_code);

  if v_id is null then
    return;
  end if;

  delete from public.sync_line_progress where profile_id = v_id;
  delete from public.sync_stats where profile_id = v_id;
end;
$$;

create or replace function public.sync_delete_profile(p_code text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.sync_profiles
  where code_hash = public.sync_hash(p_code);
end;
$$;

-- Function permissions: only the public RPCs are callable with the anon key.
revoke all on function public.sync_hash(text) from public;
revoke all on function public.sync_ensure_profile(text) from public;

grant execute on function public.sync_create_profile(text) to anon;
grant execute on function public.sync_check_code(text) to anon;
grant execute on function public.sync_load_progress(text) to anon;
grant execute on function public.sync_upsert_progress(
  text, text, integer, integer, integer, integer, timestamptz,
  integer, real, integer, timestamptz, jsonb, integer, integer,
  integer, integer, integer
) to anon;
grant execute on function public.sync_load_stats(text) to anon;
grant execute on function public.sync_upsert_stats(text, jsonb, integer) to anon;
grant execute on function public.sync_clear_progress(text) to anon;
grant execute on function public.sync_delete_profile(text) to anon;
