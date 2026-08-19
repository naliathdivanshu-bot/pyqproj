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

-- Row Level Security: locked down by default.
-- Writes happen only from our server route using the service role key,
-- so no public write/read policies are required for the app to work.
alter table pyq_sessions enable row level security;
