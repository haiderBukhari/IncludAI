-- StimuSonic — voice features (TTS caption playback + optional voice-note transcription)
-- Run after 0001_init.sql

alter table outputs
  add column if not exists tts_audio_url text,
  add column if not exists voice_note_text text;
