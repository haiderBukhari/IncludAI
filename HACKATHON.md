# StimuSonic × IncludAI (Stanford NNEA) — Submission Plan

Track: **Track 3 — AI Creative Amplifier** ("gesture, voice, or drawing inputs driving AI music or visual art" is listed as an explicit example — this is a direct fit).

Deadline: **9 Aug 2026, 11:45 AM GMT+5** (~1 day out as of this writing — Devpost's posted deadline, supersedes the earlier Aug 8 11:59 PM PT estimate).

## How the current build already satisfies the two universal requirements

**1. AI used meaningfully**
- OpenAI Images API turns a motion feature vector into a genuinely unique piece of art per session ([prompts.ts](src/lib/ai/prompts.ts), [/api/capture](src/app/api/capture/route.ts)).
- OpenAI Chat Completions generates a personal reflective caption from the same features — not decorative AI, it's the mechanism that turns raw sensor data into something legible and emotionally resonant to the user.
- **Every capture now saves a real music clip, not just live playback.** [renderMusicClip.ts](src/lib/audio/renderMusicClip.ts) uses Tone.js's offline renderer to produce an actual WAV file from the same motion-to-scale/tempo/velocity mapping the live synth uses, uploaded via [/api/music](src/app/api/music/route.ts) and stored as `outputs.music_url`. Until this was added, "music" only ever existed as ephemeral speaker output during the live Studio session — nothing kept, nothing shareable, nothing in the export video's audio track. That was a direct gap against the spec's own "AI-Generated Creative Output... a melody via MusicGen... generate a matching soundtrack" requirement. Now the exported video ([/api/export](src/app/api/export/route.ts)) prefers this music track over the spoken caption for its audio, so a shared piece pairs the art with the actual generative music it produced.
- The AI is isolated to the async "Capture" path specifically so it never fakes real-time responsiveness — the live layer (canvas + Tone.js) is what's actually real-time, and is honestly non-AI. This distinction is worth stating explicitly in the submission, since judges score "could a neurodivergent individual actually use this comfortably" — an honest architecture diagram builds credibility.

**2. Real neurodivergent users involved in design/testing** — not yet done, this is the most time-sensitive gap given the deadline. See "Immediate priorities" below.

## Immediate priorities before submission (in order)

1. **Find your neurodivergent tester now.** This is a hard requirement, not a nice-to-have, and Devpost explicitly asks "who was involved, what you learned, how their feedback shaped the project." One real session with one real person, documented, outweighs any additional feature.
2. **Run the consent flow with them for real** (already built — [ConsentStep.tsx](src/components/onboarding/ConsentStep.tsx)) before anything else.
3. **Record the 3-minute demo video** — show the tester's actual hands/movement, the live visual/sound reacting, and the captured art+caption. This is your single highest-leverage deliverable.
4. **Capture the before/after 1–5 comfort rating** from [SUCCESS_CRITERIA.md](SUCCESS_CRITERIA.md) — gives you a concrete number for the submission's "impact demonstrated, not just claimed" ask.
5. Write the Devpost project description covering: the problem, target users, how AI is used meaningfully (point to the architecture split above), and the tester engagement (point to #1–2).
6. Push the public GitHub repo (required for submission).

## Extension features — mapped to what strengthens each judging criterion

Judging weights: Impact 30%, Innovation/comfort 25%, Technical execution 10%, Presentation 10%.

### Done

- **TTS read-back of the caption** — `/api/capture` now generates speech for the caption via OpenAI TTS (`gpt-4o-mini-tts`), uploads it to Supabase Storage, and `CaptureModal.tsx` auto-plays it. Serves users who process audio better than text (dyslexia, younger K-12 users, or anyone whose eyes are closed mid-stim).
- **Optional voice-note capture** — after a capture, `CaptureModal.tsx` offers "want to say anything about that moment?". Records via `MediaRecorder`, sends to `/api/voice-note`, which transcribes with Whisper (`whisper-1`) and stores only the transcript on the `outputs` row (`voice_note_text` — see [0002_voice_features.sql](supabase/migrations/0002_voice_features.sql)). The raw audio is never persisted, only processed in-memory during transcription — keep saying this explicitly in the submission and consent copy.
- Both surfaces in the gallery too ([gallery/page.tsx](src/app/gallery/page.tsx)).

### Done

- **Optional magic-link auth (device-to-account linking)** — sign-in is never required; `device_id` in localStorage keeps working exactly as before. A "save this permanently — sign in with email" link in the gallery ([SignInWidget.tsx](src/components/auth/SignInWidget.tsx)) sends a passwordless Supabase magic link. On return, `/auth/callback` calls `/api/auth/link-device`, which re-parents every row matching the device onto the new `user_id` (service-role, bypasses RLS by design — server-only operation). `/api/sessions` and `/api/mappings` now accept an optional bearer token and match `user_id OR device_id`, so a signed-in user sees their history across devices while an anonymous user sees nothing different. Needs [0005_auth_linking.sql](supabase/migrations/0005_auth_linking.sql) (adds the `user_id` column `comfort_ratings` was missing). **Setup required**: in Supabase → Authentication → URL Configuration, add `http://localhost:3000/auth/callback` (and your deployed URL's equivalent) to Redirect URLs, or the magic link will bounce.
- **Comfort self-rating widget** — 1–5 face-scale shown right before Studio (`comfort-before` stage) and right after "End session" (`comfort-after` stage) in [OnboardingFlow.tsx](src/components/onboarding/OnboardingFlow.tsx), posts to `/api/comfort-rating`, stored in `comfort_ratings` ([0003_comfort_ratings.sql](supabase/migrations/0003_comfort_ratings.sql)). Skippable, never blocks the flow. This is your direct source for the "impact demonstrated, not claimed" number.
- **Mappings/personalization** — after any capture (except "still"), `CaptureModal.tsx` offers "save this style for next time." The label doubles as the DALL·E style override, upserted per device+classification (`/api/mappings`, [0004_mappings_classification.sql](supabase/migrations/0004_mappings_classification.sql)). Future captures of that same motion classification automatically pull the saved style into the prompt — `/api/capture` looks it up and applies it, and the modal shows "made with your saved style" when it fires. The gallery also lists all saved styles as chips. This is the literal "shaking = calm blue landscape" example from the brief, working end to end.
- **Export as shareable video** — "export as a shareable video" in `CaptureModal.tsx` calls `/api/export`, which uses `ffmpeg-static` server-side to combine the captured image with the TTS caption audio into an MP4, uploads it to Supabase Storage, and returns a download link. Also surfaced per-piece in the gallery. Scope note: the audio track is the spoken caption, not a rendered clip of the live Tone.js pattern — capturing that would require the client to render its own audio buffer and upload it, which is a bigger addition; call this out as a known simplification if asked.

### Done (this pass — pattern-detection fix + spec-driven features)

- **Fixed a real motion-detection bug**: [useMotionCapture.ts](src/lib/motion/useMotionCapture.ts) was prioritizing `accelerationIncludingGravity` over gravity-excluded `acceleration`, so a constant ~9.8 m/s² offset was swamping real stim motion and degrading peak/tempo detection. Now prefers gravity-excluded data, and falls back to an exponential-moving-average high-pass filter when only gravity-included data is available (some Android browsers). [features.ts](src/lib/motion/features.ts) also got 3-point smoothing before peak-finding and a refractory gap so a single tap can't double-count as it decays — this was the actual cause of "pattern detecting isn't cool enough."
- **Sensitivity slider** — a "Sensitivity" toggle in the Studio ([StudioView.tsx](src/components/studio/StudioView.tsx)) opens a Subtle↔Big slider, persisted to `localStorage` ([useSensitivity.ts](src/lib/motion/useSensitivity.ts)), scaling both the intensity calculation and the peak noise floor. Directly answers the spec's accessibility requirement ("let users adjust sensitivity since some make very subtle or very large movements").
- **LLM mood-interpretation step (the "Adaptive Mapping Engine")** — `/api/capture` now makes an explicit GPT call ([buildMoodInterpretationMessages](src/lib/ai/prompts.ts)) that reads the raw features and returns `{mood, visualStyle}` in its own words *before* generating anything, instead of jumping straight from a fixed classification to a fixed prompt template. A saved personal style still wins if one exists; otherwise the mood step's style feeds the image prompt, and the mood label feeds the caption. The modal shows "read as 'restless energy'" (or whatever GPT names it) when no personal style overrode it — this is the literal AI-interpretation step your pipeline diagram calls for, not just heuristic-to-template mapping.
- **Self-soothe / de-escalation mode** — if live intensity stays above a high threshold for ~1.4s straight, the Studio gently dampens the live visual/sound output and shows "That got big — softening things for a moment" with an "I'm okay" dismiss (turns auto-softening off for the rest of the session). This only affects the live playback loop, never the capture pipeline, so a genuinely big intentional gesture still captures faithfully. Matches the spec's "Safety/Comfort Controls."
- **In-Studio history** — a "Recent pieces" thumbnail strip now shows inside the Studio screen itself (last 6 captures), so continuity is visible without leaving to the gallery. Also fixed "Turn on sound" reappearing every time you return to Studio — the audio-unlock state is now tracked at the tab level ([soundEngine.ts](src/lib/audio/soundEngine.ts)) since browser audio contexts stay unlocked for the tab's lifetime once started.
- **Export 500 error, root-caused and fixed**: Next's webpack bundler was rewriting `ffmpeg-static`'s binary path to somewhere inside `.next/` that doesn't exist at runtime. Fixed via `serverExternalPackages: ["ffmpeg-static"]` in [next.config.ts](next.config.ts) — needed a full dev-server restart since config changes don't hot-reload.
- **Real-time dashboard** — `/api/dashboard` + [Dashboard.tsx](src/components/gallery/Dashboard.tsx) surface total sessions, pieces made, comfort-rating shift, and a movement-type breakdown at the top of the gallery, so there's now visible evidence of what the app has done beyond "it made one audio file."

### Still not built (honest gaps vs. the full spec)

- **Multi-modal input** (microphone/camera-based stim detection) — motion + tap only. Camera/pose (MediaPipe) was explicitly flagged in the spec as high-effort/lower-priority for a one-week build; still true.
- **Customizable palette/instrument picker as a settings panel** — mappings cover personalization per-classification, but there's no free-form "choose your palette/instrument" UI separate from that.
- **Personal glossary as a dedicated browsable view** — the data exists (mappings + captions), but it's shown as chips in the gallery, not framed as a standalone growing dictionary experience.

### Stretch, mention in "what's next" section of the submission rather than build

- **Duet mode** (two users' motion blending into one piece) — bridges Track 2 (connection) language into a Track 3 submission, good vision-statement material.
- **Full STT-driven narrative structuring** — closer to the "helping writers structure narratives while preserving voice" Track 3 example; bigger scope than a week allows on top of the current build, call it out as a roadmap item instead of building it half-finished.
- **Theme skins** — different visual/sound aesthetic packs, mentioned for completeness in FEATURES.md P2.

## What NOT to add this week

Do not add STT/mic access for voice *commands* to control the app (e.g. "next," "louder") — that's a different feature with its own privacy surface and no judging-criteria benefit here. The voice-note feature that was built stays scoped to: opt-in, one short recording per capture, transcript-only storage, audio discarded immediately after transcription. Keep it that way and keep saying so in the consent screen and submission text — don't let it grow into always-listening or continuous audio capture.

**Reminder**: the consent screen ([ConsentStep.tsx](src/components/onboarding/ConsentStep.tsx)) currently says "no microphone" — now that the voice-note feature exists, update that copy before testing with a real user so consent stays accurate.

## Submission checklist (Devpost)

- [ ] Demo video (≤3 min, YouTube/Vimeo link) showing a real neurodivergent user interacting with the tool
- [ ] Project description: problem, target users, meaningful AI use, tester engagement + what changed because of their feedback
- [ ] Public GitHub repo link
- [ ] Confirm track selected: AI Creative Amplifier
