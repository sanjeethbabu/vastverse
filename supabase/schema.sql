-- Optional storage for enquiries and subscribers.
-- Run in Supabase: SQL Editor -> New query -> paste -> Run.
-- Then set SUPABASE_URL and SUPABASE_SERVICE_KEY in Vercel to switch storage on.

create table if not exists public.leads (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  company text,
  service text not null,
  details text not null,
  estimate jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.subscribers (
  id bigint generated always as identity primary key,
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Lock the tables down: only the server (service_role key) can read or write.
alter table public.leads enable row level security;
alter table public.subscribers enable row level security;
