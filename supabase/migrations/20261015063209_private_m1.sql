-- M1 private foundation. Run ONCE against a NEW, disposable Supabase DEVELOPMENT project.
-- Do not run this in production before owner/other-user/anon RLS API testing.
-- No Auth users are created here. No open signup, Storage, or public publishing.

create extension if not exists pgcrypto;

create table public.app_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pillar_key text not null check (pillar_key in ('fitness','english','analog_ic','cooking','ai','finance')),
  scope text not null check (scope in ('three_year','year','quarter')),
  title text not null check (length(trim(title)) between 1 and 160),
  description text not null default '',
  success_criteria text not null default '',
  start_on date not null, due_on date not null,
  status text not null default 'planned' check (status in ('planned','active','completed','paused','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint goals_valid_dates check (start_on <= due_on),
  constraint goals_owner_pair unique (id, owner_id)
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goal_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 160),
  detail text not null default '',
  due_on date, completed_on date,
  status text not null default 'todo' check (status in ('todo','doing','done','cancelled')),
  evidence_url text check (evidence_url is null or evidence_url ~* '^https?://[^[:space:]]+$'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint milestones_owner_goal foreign key (goal_id,owner_id) references public.goals(id,owner_id) on delete cascade,
  constraint milestones_date_state check ((status = 'done' and completed_on is not null) or (status <> 'done' and completed_on is null))
);

-- Projects are a reference target for achievements but don't have an M1 UI (reserved for M2).
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pillar_key text not null check (pillar_key in ('fitness','english','analog_ic','cooking','ai','finance')),
  title text not null check (length(trim(title)) between 1 and 160),
  summary text not null default '',
  status text not null default 'idea' check (status in ('idea','active','completed','paused','archived')),
  repo_url text check (repo_url is null or repo_url ~* '^https?://[^[:space:]]+$'),
  started_on date, finished_on date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint projects_owner_pair unique(id,owner_id),
  constraint projects_date_order check (started_on is null or finished_on is null or started_on <= finished_on)
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  pillar_key text not null check (pillar_key in ('fitness','english','analog_ic','cooking','ai','finance')),
  project_id uuid,
  activity_on date not null default current_date,
  title text not null check (length(trim(title)) between 1 and 160),
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  note text not null default '',
  metrics_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint log_owner_project foreign key(project_id,owner_id) references public.projects(id,owner_id) on delete set null (project_id)
);

create table public.achievements (
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
  related_url text check (related_url is null or related_url ~* '^https?://[^[:space:]]+$'),
  is_highlight boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint achievement_date_matches_state check (
    (status='locked' and unlocked_at is null) or (status='unlocked' and unlocked_at is not null)),
  constraint achievement_owner_project foreign key (related_project_id,owner_id)
    references public.projects(id,owner_id) on delete set null (related_project_id)
);

create function public.private_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger goals_touch before update on public.goals for each row execute function public.private_touch_updated_at();
create trigger milestones_touch before update on public.milestones for each row execute function public.private_touch_updated_at();
create trigger projects_touch before update on public.projects for each row execute function public.private_touch_updated_at();
create trigger logs_touch before update on public.activity_logs for each row execute function public.private_touch_updated_at();
create trigger achievements_touch before update on public.achievements for each row execute function public.private_touch_updated_at();

create function public.private_check_achievement_date() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.unlocked_at is not null and new.unlocked_at > (now() at time zone 'Asia/Hong_Kong')::date then
    raise exception 'Achievement date cannot be in the future' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger achievements_date before insert or update on public.achievements
  for each row execute function public.private_check_achievement_date();

-- Explicit least-privilege table grants. No anon or public grants for private tables.
revoke all on public.app_owners, public.goals, public.milestones, public.projects,
  public.activity_logs, public.achievements from public, anon, authenticated;
grant select on public.app_owners to authenticated;
grant select,insert,update,delete on public.goals, public.milestones, public.projects,
  public.activity_logs, public.achievements to authenticated;

alter table public.app_owners enable row level security;
alter table public.goals enable row level security;
alter table public.milestones enable row level security;
alter table public.projects enable row level security;
alter table public.activity_logs enable row level security;
alter table public.achievements enable row level security;

create policy app_owners_self_read on public.app_owners for select to authenticated
using (user_id = (select auth.uid()));

create policy goals_owner_only on public.goals for all to authenticated
using (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners a where a.user_id = (select auth.uid())))
with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners a where a.user_id = (select auth.uid())));
create policy milestones_owner_only on public.milestones for all to authenticated
using (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners a where a.user_id = (select auth.uid())))
with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners a where a.user_id = (select auth.uid())));
create policy projects_owner_only on public.projects for all to authenticated
using (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners a where a.user_id = (select auth.uid())))
with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners a where a.user_id = (select auth.uid())));
create policy activity_logs_owner_only on public.activity_logs for all to authenticated
using (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners a where a.user_id = (select auth.uid())))
with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners a where a.user_id = (select auth.uid())));
create policy achievements_owner_only on public.achievements for all to authenticated
using (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners a where a.user_id = (select auth.uid())))
with check (owner_id = (select auth.uid()) and exists (select 1 from public.app_owners a where a.user_id = (select auth.uid())));

create index goals_by_due on public.goals(owner_id,due_on);
create index milestones_by_goal on public.milestones(owner_id,goal_id);
create index projects_by_owner on public.projects(owner_id,pillar_key);
create index logs_by_date on public.activity_logs(owner_id,activity_on desc);
create index achievements_by_order on public.achievements(owner_id,is_highlight desc,sort_order);

-- BOOTSTRAP, SQL EDITOR / postgres privilege ONLY, AFTER creating Auth user manually:
-- insert into public.app_owners(user_id) values ('<approved-user-uuid>');
-- Never run this insert from any browser code and never expose a service_role key.

create index logs_by_project on public.activity_logs(project_id,owner_id);
create index achievements_by_project on public.achievements(related_project_id,owner_id);
