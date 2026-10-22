# FirstStep

FirstStep helps university students break overwhelming assignments into manageable steps so they know what to do next and start earlier.

Built with Next.js 15 (App Router) and Supabase (Auth + Postgres with Row Level Security).

## Features

- Public landing page (`/`) with a sign-up button
- Email/password sign-up (`/signup`), login (`/login`) and logout
- Private dashboard (`/app`): add an assignment with only a title; course, deadline, notes and type (assignment, midterm, final, group project) are optional
- Edit and delete assignments
- Add, edit, reorder, complete and delete steps (subtasks) inside each assignment
- Progress bar and the next incomplete step for every assignment
- In-app calendar of assignment deadlines and step due dates, built from the same saved data

Planned, **not implemented yet**: Google Calendar two-way sync, other calendar providers, Excel import, grade tracking.

## Setup

1. Run `supabase/schema.sql` in the Supabase SQL Editor (creates tables, grants and RLS policies).
2. In Supabase → Authentication → Sign In / Providers → Email, turn **off** "Confirm email".
3. Make sure `.env.local` contains:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   ```
   Only the URL and the publishable (anon) key are used. Never add a secret/service_role key.
4. `npm install`
5. `npm run dev`, then open http://localhost:3000

## Deploying to Vercel

Add the same two environment variables in Vercel → Project → Settings → Environment Variables, then deploy.

## Project layout

- `app/` — pages (`/`, `/login`, `/signup`, `/app`) and global styles
- `components/` — header, auth form, dashboard, assignment card, subtasks, calendar
- `lib/supabase/` — browser, server and middleware Supabase clients
- `middleware.ts` — refreshes the session and protects `/app`
- `supabase/schema.sql` — database schema, grants and RLS policies
