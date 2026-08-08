-- StimuSonic — save an actual music clip per capture, not just live playback
-- Run after 0001-0008 migrations

alter table outputs add column if not exists music_url text;
