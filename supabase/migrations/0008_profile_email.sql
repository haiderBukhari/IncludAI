-- StimuSonic — add email to the one-time profile capture
-- Run after 0001-0007 migrations

alter table profiles add column if not exists email text;
