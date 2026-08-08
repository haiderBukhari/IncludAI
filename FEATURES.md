# StimuSonic — Features

Prioritized as **P0** (must-have for demo to work), **P1** (strongly worth it, small-to-medium effort), **P2** (stretch / "what's next").

## P0 — Core loop (must ship)

### 1. iOS motion permission flow
- Dedicated screen, one big button, triggers `DeviceMotionEvent.requestPermission()` inside the tap's user-gesture context (required on iOS Safari — silently fails otherwise).
- Fallback path for browsers/devices without motion sensors: tap/click-and-drag gesture capture (timing + position deltas instead of accelerometer).
- Tested on a real iPhone on day 1, not assumed to work.

### 2. Calibration
- 5-second "do your gesture naturally" step on first use.
- Records baseline peak amplitude and tempo.
- All later classification (bouncy / steady-wave / jerky / slow-rock) is normalized against this baseline per user, not hardcoded thresholds.
- Re-calibration available anytime from settings.

### 3. Live visual (real-time, no AI)
- Canvas-based particles / color trails / shape morphing driven directly by live motion features (intensity, tempo, regularity).
- Target latency: <100ms motion-to-visual.
- This is the primary "I did that" perceptual link — must feel responsive before anything else is built.

### 4. Live sound (real-time, no AI)
- Tone.js synth, patch/scale/tempo selected from the same live feature stream.
- Fast/bouncy → brighter scale, higher tempo, arpeggiated. Slow/rocking → pad tones, slower tempo, minor/ambient.
- Runs in lockstep with the live visual, same feature source.

### 5. Capture → AI image
- Explicit "Capture this moment" button (not automatic — keeps AI latency out of the live loop).
- Sends session feature summary to `/api/generate-image`.
- Server builds a prompt from features → OpenAI Images API → downloads result → stores in Supabase Storage → saves a `sessions`/`outputs` row.
- Clear loading state, target completion <10s.

### 6. Consent flow
- Standard consent screen before first use: what's collected (motion data only), how it's used (generates art/sound), no camera/mic, can stop anytime.
- Parental/guardian consent variant ready to use if a tester is a minor.

## P1 — Strengthens the story, modest effort

### 7. AI reflection caption
- Short LLM-generated note per capture, in the user's own vocabulary, e.g. "fast and bright today — similar to your Tuesday session."
- Same feature vector as the image prompt, one extra cheap LLM call.
- Directly serves the self-awareness/interoception angle without a second product.

### 8. Session gallery
- Simple list/grid of past captures (image + caption + date) pulled from Supabase.
- Gives demo material showing progress across the week and a reason to return.

### 9. Personalization / custom mappings
- User can save a gesture→style mapping ("shaking = calm blue landscape") from any capture.
- On future sessions, if features match a saved mapping's range, use its prompt/synth style instead of the default heuristic.

### 10. Export as one shareable file
- Combine captured image + short audio clip into a single downloadable file (video, via server-side ffmpeg).
- Matches the brief's "shareable work" language; strong demo closer.

### 11. Accessibility pass
- Adjustable motion sensitivity (for subtle vs. large movements).
- One-tap stop/skip if output feels overwhelming.
- Soft, non-flashing color palette by default; no sudden loud sounds.
- Large buttons, minimal clutter, plain-language copy throughout.

## P2 — Stretch / "what's next" (for submission vision, not required this week)

- **Duet mode** — two people stim together (co-located or remote), outputs blend into one piece.
- **Personal glossary view** — captions accumulate over weeks into a dictionary the user owns ("fast+bright = excited").
- **Vocal stim input** — opt-in mic mode for vocal stims (humming, echolalia) using pitch/rhythm detection instead of motion.
- **Theme skins** — selectable visual/sound aesthetic packs so the tool doesn't impose one look on everyone.
