-- StimuSonic — lightweight display-name profile (no account required)
-- Run after 0001-0005 migrations

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  device_id text,
  user_id uuid references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_owner_check check (user_id is not null or device_id is not null)
);

create unique index if not exists idx_profiles_device on profiles (device_id) where device_id is not null;
create unique index if not exists idx_profiles_user on profiles (user_id) where user_id is not null;

alter table profiles enable row level security;
-- Written/read only via the service-role key from API routes (device-keyed, no auth requirement).
