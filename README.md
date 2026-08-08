# StimuSonic

**Stimming, turned into art, music, and words — instead of something to hide.**

Built for **[IncludAI — The Neurodiversity Hackathon](https://includedu.org/)**, in partnership with **Stanford NNEA**. Track 3: *AI Creative Amplifier*.

---

## The problem

Autistic and ADHD people stim — flapping, tapping, rocking, humming — as a natural, functional way of self-regulating and processing the world. Research estimates that **up to 88% of autistic people** stim in some form. Almost every environment, and almost every piece of assistive technology, treats that movement as a problem to redirect or suppress: "quiet hands," "sit still."

StimuSonic does the opposite. It reads the motion — the exact thing people are told to hide — and treats it as creative input, not noise.

## What it does

**Live, instantly** — no AI, zero latency:
- Your phone's motion sensors (or taps, if there's no accelerometer) drive a real-time particle visual and a generative Tone.js soundscape
- A personal 5-second calibration means the app responds to *your* baseline, not a generic threshold
- A sensitivity slider adjusts for subtle vs. large movement
- A self-soothe mode gently softens output if intensity spikes and stays high

**On demand — "Capture this moment"**:
- GPT-4o mini reads the raw motion into a mood *before* anything is generated (not a fixed lookup table — the same "bouncy" motion can read as excited, urgent, or playful depending on the real numbers)
- DALL·E paints an abstract image from that mood
- Tone.js renders an actual, savable music clip matching the rhythm — not just live-only playback that disappears
- A short, plain-language reflection is written and spoken aloud (OpenAI TTS), grounded in real numbers (tempo, session count), not generic AI-poetry
- Optional: add a spoken voice note about how the moment felt — Whisper transcribes it to text, the audio itself is discarded immediately
- Optional: save a personal style once ("shaking = calm blue landscape") — future captures of that same gesture type use it automatically
- Optional: export the piece as a shareable video (art + music, via ffmpeg)

**Dashboard**:
- Sessions, pieces made, before/after comfort-rating shift, and a movement-type breakdown
- Every past piece: image, music, spoken reflection, voice note, saved styles
- One-time name + email — no password, nothing to verify, used everywhere from then on

## Why this architecture

The live loop and the AI loop are deliberately separate. The live particle/sound feedback is 100% client-side and instant — it never depends on a model responding well. AI is isolated to the explicit, user-initiated "Capture" action, where a few seconds of latency is expected and fine. This means the moment-to-moment experience of stimming into the app is never gated on an API call.

## Real neurodivergent user testing

Tested throughout the build with **Imtiaz**, a local AuDHD tester, not just at the end. Concrete feedback that changed the shipped product:

- *"The pattern detecting isn't cool enough — it doesn't detect."* → Found and fixed a real bug: motion code was reading gravity-included accelerometer data, drowning out real stim motion. Fixed to read gravity-excluded acceleration with a high-pass fallback.
- *"This studio is kind of single — I can't see the history."* → Built a real dashboard (stats, saved styles, gallery) instead of a disconnected single screen.
- *"We don't have any music."* → Added actual saved, downloadable music clips per capture, not just ephemeral live playback.
- *"Turn on sound, every time."* → Audio-unlock state is now remembered per browser tab.
- Signup felt disjointed across screens → Replaced with a single one-time name + email gate.

## Tech stack

| Layer | Tech |
|---|---|
| Framework | [Next.js](https://nextjs.org) (App Router, TypeScript) |
| Styling | Tailwind CSS v4, Framer Motion |
| Database / Storage / Auth | [Supabase](https://supabase.com) (Postgres, Storage, magic-link auth) |
| Mood interpretation + captions | OpenAI **GPT-4o mini** |
| Image generation | OpenAI **DALL·E** |
| Live + rendered sound | [Tone.js](https://tonejs.github.io/) (live synth + offline music render) |
| Spoken reflection | OpenAI **TTS** (`gpt-4o-mini-tts`) |
| Voice-note transcription | OpenAI **Whisper** |
| Video export | ffmpeg (via `ffmpeg-static`) |
| Motion input | `DeviceMotionEvent` / `DeviceOrientationEvent`, with tap-input fallback |

## Project structure

```
src/
├── app/
│   ├── page.tsx                 # routes new devices → /studio, returning → /dashboard
│   ├── studio/page.tsx          # landing (first visit) → onboarding → live Studio
│   ├── dashboard/page.tsx       # stats, saved styles, gallery
│   ├── auth/callback/page.tsx   # magic-link return handler
│   └── api/
│       ├── capture/route.ts     # mood → image (DALL·E) → caption (GPT) → TTS
│       ├── music/route.ts       # saves the rendered music clip
│       ├── voice-note/route.ts  # Whisper transcription
│       ├── mappings/route.ts    # personal style save/lookup
│       ├── comfort-rating/route.ts
│       ├── dashboard/route.ts   # aggregate stats
│       ├── sessions/route.ts    # gallery data
│       ├── export/route.ts      # ffmpeg video export
│       ├── profile/route.ts     # one-time name+email
│       └── auth/link-device/route.ts
├── components/
│   ├── onboarding/               # Consent, Permission, Calibration, flow orchestration
│   ├── studio/                   # ParticleCanvas, CaptureModal, StudioView
│   ├── auth/                     # AuthGate (one-time signup), SignInWidget (magic link)
│   ├── gallery/                  # Dashboard stats panel
│   ├── landing/                  # Marketing/explainer page
│   └── ui/                       # Button, Card, StepDots, ComfortRating
└── lib/
    ├── motion/                   # feature extraction, calibration, sensitivity, persisted setup
    ├── audio/                    # live SoundEngine + offline renderMusicClip
    ├── ai/                       # OpenAI client, prompt builders (mood, caption, image)
    └── supabase/                 # browser + server clients

supabase/migrations/              # 0001–0009, run in order
```

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

Create a project at [supabase.com](https://supabase.com), then run every file in `supabase/migrations/` **in order** (0001 through 0009) in the SQL editor.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — from Supabase → Settings → API
- `OPENAI_API_KEY` — from [platform.openai.com](https://platform.openai.com/api-keys) (billing must be enabled for image generation)

If you plan to use the optional magic-link sign-in, also add `http://localhost:3000/auth/callback` (and your deployed URL's equivalent) to Supabase → Authentication → URL Configuration.

### 4. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On desktop, motion input automatically falls back to tap input (no accelerometer). For the full experience, open it on a phone.

> **Note**: this repo runs `next dev --webpack` / `next build --webpack` rather than the default Turbopack, due to a corrupted native SWC binary on the original dev machine (arm64 macOS). Native Turbopack should work fine on most systems — feel free to drop the `--webpack` flag if it does for you.

## Known limitations

- The generated artwork occasionally doesn't render inside the capture-results modal (renders correctly on the Dashboard grid moments later) — a display timing issue, not a data issue.
- Music generation is a deterministic, rules-based Tone.js synth mapping (scale/tempo/velocity driven by motion features), not a neural music model like MusicGen — a deliberate week-scope tradeoff for instant, free, offline rendering over multi-second cloud latency.
- No camera or microphone input beyond the opt-in, one-shot voice note (by design — see Privacy below).

## Privacy & ethics

- **Motion sensors only, by default.** No camera, ever.
- **Microphone is opt-in and one-shot** — used only if you choose to add a voice note after a capture. The audio is transcribed and then discarded immediately; only the text is kept.
- **No account required** — an anonymous per-device ID drives the whole experience. Sign-in (magic link) is an optional, additive upgrade for cross-device sync, never a gate.
- Consent is shown before first use, in plain language, with an explicit "stop anytime" statement.

## What's next

- Vocal and drawing input modes (both named explicitly in the Track 3 brief) — feeding pitch/rhythm or stroke data into the same feature pipeline as an alternate to motion
- A dedicated personal glossary view — surfacing saved styles + captions as a standalone growing dictionary
- Duet mode — two people's motion blended into one piece

## License

Built for the IncludAI hackathon. No license specified yet — ask before reuse.
