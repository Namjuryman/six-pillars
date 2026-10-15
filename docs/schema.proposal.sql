-- Six Pillars preliminary Supabase/PostgreSQL schema proposal v1.1.
-- DESIGN ONLY: M0 never executes this file. Includes future M1/M2 achievements.
-- For review and testing before production deployment. Supabase projects provide auth.users and auth.uid().
-- Setup: first create your own Supabase Auth user in the Dashboard, then run the
-- admin-only INSERT INTO public.app_owners(user_id) VALUES ('YOUR_AUTH_USER_UUID');
-- Do not allow public signups. Test owner/non-owner/anon access before launch.

create extension if not exists pgcrypto;

create table if not exists public.app_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pillar_key text not null check (pillar_key in ('fitness','english','analog_ic','cooking','ai','finance')),
  scope text not null check (scope in ('three_year','year','quarter')),
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  success_criteria text not null default '',
  start_on date not null,
  due_on date not null,
  status text not null default 'planned' check (status in ('planned','active','completed','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_date_check check (start_on <= due_on),
  constraint goals_id_owner_unique unique (id, owner_id)
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goal_id uuid not null,
  title text not null check (length(trim(title)) > 0),
  detail text not null default '',
  due_on date,
  completed_on date,
  status text not null default 'todo' check (status in ('todo','doing','done','cancelled')),
  evidence_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint milestone_belongs_to_owner_goal foreign key (goal_id, owner_id)
    references public.goals (id, owner_id) on delete cascade
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pillar_key text not null check (pillar_key in ('fitness','english','analog_ic','cooking','ai','finance')),
  title text not null check (length(trim(title)) > 0),
  summary text not null default '',
  status text not null default 'idea' check (status in ('idea','active','completed','paused','archived')),
  repo_url text,
  started_on date,
  finished_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_id_owner_unique unique (id, owner_id),
  constraint projects_date_check check (started_on is null or finished_on is null or started_on <= finished_on)
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pillar_key text check (pillar_key is null or pillar_key in ('fitness','english','analog_ic','cooking','ai','finance')),
  title text not null check (length(trim(title)) between 1 and 160),
  description text not null default '',
  icon text not null default '✦' check (length(trim(icon)) between 1 and 32),
  status text not null default 'locked' check (status in ('locked','unlocked')),
  unlocked_at date,
  notes text not null default '',
  related_project_id uuid,
  related_url text check (related_url is null or related_url ~ '^https?://[^[:space:]]+$'),
  image_paths text[] not null default '{}'::text[],
  is_highlight boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint achievements_id_owner_unique unique (id, owner_id),
  constraint achievements_status_date check (
    (status = 'locked' and unlocked_at is null) or
    (status = 'unlocked' and unlocked_at is not null)
  ),
  constraint achievement_project_same_owner foreign key (related_project_id, owner_id)
    references public.projects (id, owner_id) on delete set null (related_project_id)
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pillar_key text not null check (pillar_key in ('fitness','english','analog_ic','cooking','ai','finance')),
  project_id uuid,
  activity_on date not null default current_date,
  title text not null check (length(trim(title)) > 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  note text not null default '',
  metrics_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activity_project_same_owner foreign key (project_id, owner_id)
    references public.projects (id, owner_id) on delete set null (project_id)
);

create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pillar_key text not null check (pillar_key in ('fitness','english','analog_ic','cooking','ai','finance')),
  metric_code text not null check (length(trim(metric_code)) > 0),
  numeric_value numeric not null,
  unit text not null default '',
  measured_on date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  period_type text not null check (period_type in ('weekly','monthly','quarterly','annual')),
  period_start date not null,
  period_end date not null,
  wins text not null default '',
  issues text not null default '',
  next_actions text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reviews_dates_ok check (period_start <= period_end),
  constraint reviews_unique_period unique (owner_id, period_type, period_start, period_end)
);

-- This is NOT a view of private diaries. This table holds purpose-written public-safe content.
create table if not exists public.public_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('about','roadmap','project','article','review','achievement')),
  pillar_key text check (pillar_key is null or pillar_key in ('fitness','english','analog_ic','cooking','ai','finance')),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) > 0),
  summary text not null default '',
  body_md text not null default '',
  status text not null default 'draft' check (status in ('draft','published','withdrawn')),
  published_at timestamptz,
  featured boolean not null default false,
  -- M2 public-safe snapshot only, never a join to a private achievement.
  achievement_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_requires_time check (status <> 'published' or published_at is not null),
  constraint achievement_snapshot_shape check (
    (kind <> 'achievement' and achievement_snapshot is null) or
    (kind = 'achievement' and achievement_snapshot is not null and
      jsonb_typeof(achievement_snapshot) = 'object' and
      achievement_snapshot ?& array['status','unlocked_at','icon','sort_order'] and
      achievement_snapshot - array['status','unlocked_at','icon','sort_order'] = '{}'::jsonb and
      jsonb_typeof(achievement_snapshot->'status') = 'string' and
      jsonb_typeof(achievement_snapshot->'icon') = 'string' and
      length(trim(achievement_snapshot->>'icon')) between 1 and 32 and
      jsonb_typeof(achievement_snapshot->'sort_order') = 'number' and
      (achievement_snapshot->>'sort_order') ~ '^-?[0-9]+$' and
      ((achievement_snapshot->>'status' = 'locked' and achievement_snapshot->'unlocked_at' = 'null'::jsonb) or
       (achievement_snapshot->>'status' = 'unlocked' and
        jsonb_typeof(achievement_snapshot->'unlocked_at') = 'string' and
        (achievement_snapshot->>'unlocked_at') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' and
        (achievement_snapshot->>'unlocked_at')::date is not null)))
  )
);

-- Keep timestamp maintenance consistent.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_goals_updated before update on public.goals
for each row execute function public.set_updated_at();
create trigger trg_milestones_updated before update on public.milestones
for each row execute function public.set_updated_at();
create trigger trg_projects_updated before update on public.projects
for each row execute function public.set_updated_at();
create trigger trg_achievements_updated before update on public.achievements
for each row execute function public.set_updated_at();

-- Use a trigger rather than a time-dependent CHECK for the actual achievement date.
create or replace function public.validate_achievement_date()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.unlocked_at > (now() at time zone 'Asia/Hong_Kong')::date then
    raise exception 'Achievement date must not be in the future' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger trg_achievements_date before insert or update on public.achievements
for each row execute function public.validate_achievement_date();
create trigger trg_activity_logs_updated before update on public.activity_logs
for each row execute function public.set_updated_at();
create trigger trg_reviews_updated before update on public.reviews
for each row execute function public.set_updated_at();
create trigger trg_public_entries_updated before update on public.public_entries
for each row execute function public.set_updated_at();

-- Privileges: grants first, then row-level policies.
revoke all on public.app_owners from anon, authenticated;
grant select on public.app_owners to authenticated;

-- Do not grant read/write to anon on private tables.
revoke all on public.goals, public.milestones, public.projects,
  public.activity_logs, public.measurements, public.reviews, public.achievements from anon;
grant select, insert, update, delete on public.goals, public.milestones,
  public.projects, public.activity_logs, public.measurements, public.reviews, public.achievements to authenticated;

revoke all on public.public_entries from anon;
grant select on public.public_entries to anon;
grant select, insert, update, delete on public.public_entries to authenticated;

alter table public.app_owners enable row level security;
alter table public.goals enable row level security;
alter table public.milestones enable row level security;
alter table public.projects enable row level security;
alter table public.achievements enable row level security;
alter table public.activity_logs enable row level security;
alter table public.measurements enable row level security;
alter table public.reviews enable row level security;
alter table public.public_entries enable row level security;

-- Admin list itself can be read by the logged-in admin, but nobody can insert an owner through API.
create policy "owner can see own allowlist entry" on public.app_owners
for select to authenticated using (user_id = (select auth.uid()));

-- Access is BOTH the row owner and a pre-approved app owner.
-- The EXISTS() uses SELECT on app_owners, which is itself limited to own user_id.
create policy "owner manage goals" on public.goals
for all to authenticated
using (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners where user_id = (select auth.uid())))
with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners where user_id = (select auth.uid())));

create policy "owner manage milestones" on public.milestones
for all to authenticated
using (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners where user_id = (select auth.uid())))
with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners where user_id = (select auth.uid())));

create policy "owner manage projects" on public.projects
for all to authenticated
using (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners where user_id = (select auth.uid())))
with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners where user_id = (select auth.uid())));

create policy "owner manage logs" on public.activity_logs
for all to authenticated
using (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners where user_id = (select auth.uid())))
with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners where user_id = (select auth.uid())));

create policy "owner manage achievements" on public.achievements
for all to authenticated
using (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners where user_id = (select auth.uid())))
with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners where user_id = (select auth.uid())));

create policy "owner manage measurements" on public.measurements
for all to authenticated
using (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners where user_id = (select auth.uid())))
with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners where user_id = (select auth.uid())));

create policy "owner manage reviews" on public.reviews
for all to authenticated
using (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners where user_id = (select auth.uid())))
with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners where user_id = (select auth.uid())));

create policy "anyone can read approved published entries" on public.public_entries
for select to anon, authenticated
using (status = 'published' and published_at is not null and published_at <= now());

create policy "owner manage entries" on public.public_entries
for all to authenticated
using (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners where user_id = (select auth.uid())))
with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners where user_id = (select auth.uid())));

create index if not exists idx_goals_owner_due on public.goals(owner_id, due_on);
create index if not exists idx_goals_owner_pillar on public.goals(owner_id, pillar_key, start_on);
create index if not exists idx_milestones_goal on public.milestones(goal_id, due_on);
create index if not exists idx_projects_owner_pillar on public.projects(owner_id, pillar_key, created_at desc);
create index if not exists idx_achievements_owner_pillar_status on public.achievements(owner_id, pillar_key, status, unlocked_at desc);
create index if not exists idx_achievements_owner_order on public.achievements(owner_id, is_highlight desc, sort_order, id);
create index if not exists idx_logs_owner_date on public.activity_logs(owner_id, activity_on desc);
create index if not exists idx_logs_owner_pillar on public.activity_logs(owner_id, pillar_key, activity_on desc);
create index if not exists idx_measurements_owner_metric on public.measurements(owner_id, metric_code, measured_on desc);
create index if not exists idx_reviews_owner_period on public.reviews(owner_id, period_start desc);
create index if not exists idx_public_entries_published on public.public_entries(status, published_at desc);

-- Admin-only seeding after creating your Supabase Auth account in the dashboard:
-- INSERT INTO public.app_owners(user_id) VALUES ('YOUR_AUTH_USER_UUID');
-- No client-side application code should ever execute the above statement.

-- Production checklist: run RLS allow/deny tests as anon, your owner auth user,
-- and another authenticated user. Also check public_entries drafts are not
-- visible, and that cross-owner goal/milestone relationships cannot be inserted.
-- Future achievements tests: three identities, all CRUD, invalid status/date,
-- future date, cross-owner project FK, publish/withdraw independent snapshots.
-- Before M1: promote reviewed baseline + changes into small versioned migrations.
-- Do NOT create Storage buckets or expose private images by running M0.
