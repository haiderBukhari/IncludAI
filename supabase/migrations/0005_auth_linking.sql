-- StimuSonic — optional account linking (magic-link sign-in)
-- Run after 0001-0004 migrations
--
-- All app tables already carry a nullable user_id except comfort_ratings,
-- which was added device-only in 0003. This adds it so a signed-in user's
-- before/after ratings can be re-parented too, same as everything else.

alter table comfort_ratings
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

create index if not exists idx_comfort_ratings_user on comfort_ratings (user_id);

-- Once a user signs in, /api/auth/link-device sets user_id on every row that
-- matches their device_id and has no user_id yet, using the service-role key
-- (bypasses RLS by design — this is a server-only linking operation, never
-- exposed to the browser).
