-- StimuSonic — simplify mappings lookup by motion classification
-- Run after 0001-0003 migrations

alter table mappings add column if not exists classification text;

-- One saved preset per classification per device (re-saving overwrites the old one).
create unique index if not exists idx_mappings_device_classification
  on mappings (device_id, classification)
  where device_id is not null;
