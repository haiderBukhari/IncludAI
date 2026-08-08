# StimuSonic — Project Overview

## What it is
StimuSonic turns stimming motions (hand-flapping, tapping, rocking, shaking) into generative art and music in real time. It reads phone motion sensors, extracts the rhythm and intensity of the movement, and reflects that pattern back as live visuals, live sound, and — on request — an AI-generated image and short reflective caption. It reframes stimming as creative expression rather than something to suppress or manage.

## Who it's for
Neurodivergent individuals (primarily autistic/ADHD folks who stim) who want their natural regulatory movements to feel seen and generative rather than something to hide. Secondary audience: caregivers/clinicians observing how the tool supports self-expression (not "regulation-as-fix" — see framing note below).

## Core loop
1. Calibrate (5s, first use only) — do your natural gesture, app learns your baseline.
2. Move — live particle/color visual and live synthesized sound react instantly (<100ms) to the motion.
3. Optionally hit "Capture this moment" — sends the session's motion features to the backend, which generates an AI image (DALL·E) and a short reflective caption (LLM), saved to a personal gallery.
4. Optionally export the moment as a single shareable file (image + audio).
5. Optionally save a custom gesture→style mapping ("shaking = calm blue landscape") for personalization over time.

## Explicit non-goals
- Not a clinical/therapeutic "calm down" tool — never framed as regulation or behavior management.
- No camera or audio recording of the user (motion sensors only; mic is a separate, opt-in stretch mode).
- Not trying to classify or diagnose stimming type — categories are just style presets, not clinical labels.

## Tech stack
- Frontend + backend: Next.js (App Router), single deployable app
- DB + storage + auth: Supabase
- Live visuals: Canvas API, driven directly by motion features (no AI in this path)
- Live sound: Tone.js (Web Audio), driven directly by motion features
- AI image generation: OpenAI Images API (DALL·E), triggered only on explicit "Capture"
- AI reflection captions: OpenAI Chat Completions, same feature vector as the image prompt
- Media export: ffmpeg (server-side) to combine captured image + audio clip into one shareable file

## Related docs
- [FEATURES.md](./FEATURES.md) — feature list and prioritization
- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design, data flow, schema
- [SUCCESS_CRITERIA.md](./SUCCESS_CRITERIA.md) — how we'll know it worked
- [HACKATHON.md](./HACKATHON.md) — IncludAI (Stanford NNEA) submission plan, deadline, extension features

## Framing note (applies everywhere: UI copy, demo, submission)
Never describe the tool as calming, soothing, or managing behavior. Always frame it as creative expression and self-authorship — the point is the user made something, not that they were regulated.
