-- StimuSonic — initial schema
-- Run this directly in the Supabase SQL editor, or via `supabase db push`
-- if you're using the Supabase CLI with this repo linked to your project.

create extension if not exists "pgcrypto";

-- ── users are handled by Supabase Auth (auth.users) ─────────────────────
-- We support anonymous usage too: if a session has no signed-in user, we key
-- rows off a client-generated device_id instead. Both columns are nullable
-- so either identity path works.

create table if not exists calibrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  device_id text,
  baseline_amplitude real not null,
  baseline_tempo real not null,
  created_at timestamptz not null default now(),
  constraint calibrations_owner_check check (user_id is not null or device_id is not null)
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  device_id text,
  started_at timestamptz not null default now(),
  duration_ms integer not null default 0,
  feature_summary jsonb not null default '{}'::jsonb, -- { intensity, tempo, regularity, classification }
  created_at timestamptz not null default now(),
  constraint sessions_owner_check check (user_id is not null or device_id is not null)
);

create table if not exists outputs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  image_url text,
  caption_text text,
  audio_config jsonb default '{}'::jsonb, -- { classification, tempo, scale } used to render the sound
  export_url text,
  created_at timestamptz not null default now()
);

create table if not exists mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  device_id text,
  label text not null,
  feature_range jsonb not null, -- { intensity: [min,max], tempo: [min,max], classification }
  prompt_style text,
  synth_style text,
  created_at timestamptz not null default now(),
  constraint mappings_owner_check check (user_id is not null or device_id is not null)
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  output_id uuid not null references outputs (id) on delete cascade,
  rating smallint not null check (rating in (-1, 1)), -- -1 thumbs down, 1 thumbs up
  created_at timestamptz not null default now()
);

-- ── indexes ──────────────────────────────────────────────────────────────
create index if not exists idx_sessions_user on sessions (user_id);
create index if not exists idx_sessions_device on sessions (device_id);
create index if not exists idx_outputs_session on outputs (session_id);
create index if not exists idx_mappings_user on mappings (user_id);
create index if not exists idx_mappings_device on mappings (device_id);
create index if not exists idx_feedback_output on feedback (output_id);

-- ── row level security ───────────────────────────────────────────────────
-- Authenticated users only ever see their own rows. Anonymous/device-keyed
-- rows are written and read via the service-role key from API routes, never
-- directly from the browser, so no anon RLS policy is needed for them.

alter table calibrations enable row level security;
alter table sessions enable row level security;
alter table outputs enable row level security;
alter table mappings enable row level security;
alter table feedback enable row level security;

create policy "calibrations_owner_rw" on calibrations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sessions_owner_rw" on sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "outputs_owner_rw" on outputs
  for all using (
    exists (select 1 from sessions s where s.id = outputs.session_id and s.user_id = auth.uid())
  )
  with check (
    exists (select 1 from sessions s where s.id = outputs.session_id and s.user_id = auth.uid())
  );

create policy "mappings_owner_rw" on mappings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "feedback_owner_rw" on feedback
  for all using (
    exists (
      select 1 from outputs o
      join sessions s on s.id = o.session_id
      where o.id = feedback.output_id and s.user_id = auth.uid()
    )
  );

-- ── storage ──────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('stimusonic-media', 'stimusonic-media', true)
on conflict (id) do nothing;

create policy "public read stimusonic-media"
  on storage.objects for select
  using (bucket_id = 'stimusonic-media');

-- Writes to storage happen via the service-role key in API routes only,
-- so no insert/update policy is granted to anon/authenticated roles here.
