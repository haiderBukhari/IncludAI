-- StimuSonic — comfort/enjoyment self-ratings (before/after a studio session)
-- Run after 0001_init.sql and 0002_voice_features.sql

create table if not exists comfort_ratings (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  session_id uuid references sessions (id) on delete set null,
  stage text not null check (stage in ('before', 'after')),
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists idx_comfort_ratings_device on comfort_ratings (device_id);
create index if not exists idx_comfort_ratings_session on comfort_ratings (session_id);

alter table comfort_ratings enable row level security;
-- Written/read only via the service-role key from API routes (device-keyed, no auth requirement).
