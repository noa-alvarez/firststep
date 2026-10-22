-- Adds a priority level (high / normal / low) to assignments.
-- Run this in Supabase → SQL Editor BEFORE deploying the code that uses it.
-- Safe to re-run. Existing assignments become 'normal'.

alter table public.assignments
  add column if not exists priority text not null default 'normal';

alter table public.assignments drop constraint if exists assignments_priority_check;
alter table public.assignments
  add constraint assignments_priority_check check (priority in ('high', 'normal', 'low'));

-- Existing grants and RLS policies on public.assignments already cover the new column.

-- Make the API see the new column right away.
notify pgrst, 'reload schema';
