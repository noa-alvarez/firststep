-- FirstStep database schema
-- Paste this whole file into Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run: it uses IF NOT EXISTS / DROP ... IF EXISTS where needed.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.assignments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title           text not null check (char_length(btrim(title)) between 1 and 200),
  course          text check (course is null or char_length(course) <= 120),
  deadline        date,
  notes           text check (notes is null or char_length(notes) <= 5000),
  assessment_type text not null default 'assignment'
                  check (assessment_type in ('assignment', 'midterm', 'final', 'group_project')),
  priority        text not null default 'normal'
                  constraint assignments_priority_check check (priority in ('high', 'normal', 'low')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- lets subtasks reference (id, user_id) so a subtask can never point at someone else's assignment
  unique (id, user_id)
);

create table if not exists public.subtasks (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null check (char_length(btrim(title)) between 1 and 200),
  due_date      date,
  completed     boolean not null default false,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  foreign key (assignment_id, user_id)
    references public.assignments (id, user_id) on delete cascade
);

-- For databases created before priority existed (same as migrations/002_add_priority.sql)
alter table public.assignments add column if not exists priority text not null default 'normal';
alter table public.assignments drop constraint if exists assignments_priority_check;
alter table public.assignments
  add constraint assignments_priority_check check (priority in ('high', 'normal', 'low'));

create index if not exists assignments_user_id_idx on public.assignments (user_id);
create index if not exists subtasks_user_id_idx on public.subtasks (user_id);
create index if not exists subtasks_assignment_id_idx on public.subtasks (assignment_id, position);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists assignments_set_updated_at on public.assignments;
create trigger assignments_set_updated_at
  before update on public.assignments
  for each row execute function public.set_updated_at();

drop trigger if exists subtasks_set_updated_at on public.subtasks;
create trigger subtasks_set_updated_at
  before update on public.subtasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Grants: only logged-in users get table access; anonymous visitors get none
-- ---------------------------------------------------------------------------

revoke all on public.assignments from anon;
revoke all on public.subtasks from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.assignments to authenticated;
grant select, insert, update, delete on public.subtasks to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.assignments enable row level security;
alter table public.subtasks enable row level security;

-- assignments: each user sees and changes only their own rows
drop policy if exists "assignments_select_own" on public.assignments;
create policy "assignments_select_own" on public.assignments
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "assignments_insert_own" on public.assignments;
create policy "assignments_insert_own" on public.assignments
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "assignments_update_own" on public.assignments;
create policy "assignments_update_own" on public.assignments
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "assignments_delete_own" on public.assignments;
create policy "assignments_delete_own" on public.assignments
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- subtasks: the row must belong to the user AND its parent assignment must too
drop policy if exists "subtasks_select_own" on public.subtasks;
create policy "subtasks_select_own" on public.subtasks
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "subtasks_insert_own" on public.subtasks;
create policy "subtasks_insert_own" on public.subtasks
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.assignments a
      where a.id = assignment_id and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "subtasks_update_own" on public.subtasks;
create policy "subtasks_update_own" on public.subtasks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.assignments a
      where a.id = assignment_id and a.user_id = (select auth.uid())
    )
  );

drop policy if exists "subtasks_delete_own" on public.subtasks;
create policy "subtasks_delete_own" on public.subtasks
  for delete to authenticated
  using ((select auth.uid()) = user_id);
