-- Run this in Supabase Dashboard > SQL Editor to set up storage for PYQ Predictor

create table if not exists pyq_sessions (
  id uuid primary key default gen_random_uuid(),
  class_grade text,
  subject text,
  batch text,
  pyq_text text not null,
  result jsonb,
  created_at timestamptz default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  course text not null,
  state text not null,
  college text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security: locked down by default.
-- Session and registration writes happen only through server routes using
-- SUPABASE_SERVICE_ROLE_KEY. Do not add anon/authenticated policies here.
alter table pyq_sessions enable row level security;
alter table students enable row level security;

-- Remove the legacy public INSERT policy. Existing student records are
-- retained; only server-side registration can create future records.
drop policy if exists "Allow public student registration inserts" on students;
