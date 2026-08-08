-- StimuSonic — fix ON CONFLICT upsert failures
--
-- 0004 and 0006 created *partial* unique indexes (`where device_id is not
-- null`). Postgres only uses a partial index to satisfy `ON CONFLICT (col)`
-- if the query repeats that exact WHERE predicate — which a plain
-- `.upsert({...}, { onConflict: "col" })` call can never express. That's
-- why upserts to mappings/profiles fail with:
--   "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- even after the earlier migrations ran successfully.
--
-- Fix: make these indexes non-partial. This is safe — in Postgres, NULL
-- values in a unique index never conflict with each other or anything else,
-- so rows without a device_id/user_id simply never collide; only real
-- matching values enforce uniqueness, which is exactly the behavior we want.

drop index if exists idx_mappings_device_classification;
create unique index if not exists idx_mappings_device_classification
  on mappings (device_id, classification);

drop index if exists idx_profiles_device;
create unique index if not exists idx_profiles_device
  on profiles (device_id);

drop index if exists idx_profiles_user;
create unique index if not exists idx_profiles_user
  on profiles (user_id);
