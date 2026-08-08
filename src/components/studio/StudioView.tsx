"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ParticleCanvas } from "./ParticleCanvas";
import { CaptureModal } from "./CaptureModal";
import { Button } from "@/components/ui/Button";
import { extractFeatures, type CalibrationBaseline, type MotionFeatures } from "@/lib/motion/features";
import { SoundEngine, isAudioUnlocked } from "@/lib/audio/soundEngine";
import { renderMusicClip } from "@/lib/audio/renderMusicClip";
import { getDeviceId, getAccessToken } from "@/lib/supabase/client";
import { useSensitivity } from "@/lib/motion/useSensitivity";

interface RecentOutput {
  id: string;
  image_url: string | null;
}

const LABELS: Record<MotionFeatures["classification"], string> = {
  still: "waiting for movement",
  "slow-rock": "slow & steady",
  "steady-wave": "flowing",
  bouncy: "bright & bouncy",
  jerky: "quick & sharp",
};

// How long sustained high-intensity motion has to hold before we gently
// soften the live output (self-soothe / de-escalation, ~1.4s at 60fps).
const HIGH_INTENSITY_FRAMES = 85;
const HIGH_INTENSITY_THRESHOLD = 0.88;

interface StudioViewProps {
  baseline: CalibrationBaseline;
  isFallback: boolean;
  getBuffer: () => { t: number; x: number; y: number; z: number }[];
  recordTap: () => void;
  onEndSession: () => void;
}

export function StudioView({ baseline, isFallback, getBuffer, recordTap, onEndSession }: StudioViewProps) {
  const featuresRef = useRef<MotionFeatures>({
    intensity: 0,
    tempo: 0,
    regularity: 0,
    classification: "still",
  });
  const soundRef = useRef<SoundEngine | null>(null);
  const [audioOn, setAudioOn] = useState(false);
  const [label, setLabel] = useState("waiting for movement");
  const rafRef = useRef<number | undefined>(undefined);
  const { sensitivity, setSensitivity } = useSensitivity();
  const [showSensitivity, setShowSensitivity] = useState(false);

  const highFramesRef = useRef(0);
  const [softened, setSoftened] = useState(false);
  const softenDismissedRef = useRef(false);

  const [capture, setCapture] = useState<{
    status: "loading" | "done" | "error";
    outputId: string | null;
    imageUrl: string | null;
    caption: string | null;
    ttsAudioUrl: string | null;
    musicUrl: string | null;
    classification: MotionFeatures["classification"] | null;
    mappingApplied: boolean;
    mood: string | null;
  } | null>(null);

  const [recent, setRecent] = useState<RecentOutput[]>([]);

  const loadRecent = async () => {
    const deviceId = getDeviceId();
    const token = await getAccessToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const res = await fetch(`/api/sessions?deviceId=${deviceId}`, { headers });
      const data = await res.json();
      const outputs: RecentOutput[] = (data.sessions ?? [])
        .flatMap((s: { outputs: RecentOutput[] }) => s.outputs)
        .filter((o: RecentOutput) => o.image_url)
        .slice(0, 6);
      setRecent(outputs);
    } catch {
      // Recent strip is a bonus view — the live loop still works without it.
    }
  };

  useEffect(() => {
    loadRecent();
    if (isAudioUnlocked()) {
      const engine = new SoundEngine();
      engine.init().then(() => {
        soundRef.current = engine;
        setAudioOn(true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loop = () => {
      const raw = extractFeatures(getBuffer(), baseline, sensitivity);

      // Self-soothe: sustained very-high intensity gently dampens live output
      // (not the capture pipeline) until the user dismisses it or it settles.
      if (raw.intensity > HIGH_INTENSITY_THRESHOLD) {
        highFramesRef.current += 1;
      } else {
        highFramesRef.current = Math.max(0, highFramesRef.current - 2);
      }
      if (!softenDismissedRef.current && highFramesRef.current > HIGH_INTENSITY_FRAMES) {
        setSoftened(true);
      }
      if (softened && highFramesRef.current === 0) {
        setSoftened(false);
      }

      const f = softened ? { ...raw, intensity: raw.intensity * 0.45 } : raw;
      featuresRef.current = f;
      soundRef.current?.update(f);
      setLabel(LABELS[raw.classification]);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [baseline, getBuffer, sensitivity, softened]);

  const enableAudio = async () => {
    soundRef.current = new SoundEngine();
    await soundRef.current.init();
    setAudioOn(true);
  };

  const dismissSoften = () => {
    softenDismissedRef.current = true;
    setSoftened(false);
    highFramesRef.current = 0;
  };

  const handleCapture = async () => {
    const featuresAtCapture = { ...featuresRef.current };
    const classification = featuresAtCapture.classification;
    setCapture({
      status: "loading",
      outputId: null,
      imageUrl: null,
      caption: null,
      ttsAudioUrl: null,
      musicUrl: null,
      classification,
      mappingApplied: false,
      mood: null,
    });
    try {
      // Render the music clip client-side (fast, no network) at the same
      // time as the slower server-side image/caption call, instead of
      // stacking the two waits on top of each other.
      const musicClipPromise = renderMusicClip(featuresAtCapture).catch((err) => {
        console.error("Music render failed:", err);
        return null;
      });

      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: getDeviceId(),
          features: featuresAtCapture,
        }),
      });
      if (!res.ok) throw new Error("capture failed");
      const data = await res.json();
      const outputId: string | null = data.output?.id ?? null;

      let musicUrl: string | null = null;
      const musicClip = await musicClipPromise;
      if (outputId && musicClip) {
        try {
          const formData = new FormData();
          formData.append("outputId", outputId);
          formData.append("audio", musicClip, "music.wav");
          const musicRes = await fetch("/api/music", { method: "POST", body: formData });
          if (musicRes.ok) {
            const musicData = await musicRes.json();
            musicUrl = musicData.output?.music_url ?? null;
          }
        } catch (err) {
          console.error("Music upload failed:", err);
        }
      }

      setCapture({
        status: "done",
        outputId,
        imageUrl: data.output?.image_url ?? null,
        caption: data.output?.caption_text ?? null,
        ttsAudioUrl: data.output?.tts_audio_url ?? null,
        musicUrl,
        classification,
        mappingApplied: Boolean(data.mappingApplied),
        mood: data.mood ?? null,
      });
      loadRecent();
    } catch {
      setCapture({
        status: "error",
        outputId: null,
        imageUrl: null,
        caption: null,
        ttsAudioUrl: null,
        musicUrl: null,
        classification,
        mappingApplied: false,
        mood: null,
      });
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md">
      <div className="flex flex-col items-center gap-1 relative w-full">
        <span className="text-xs uppercase tracking-[0.14em] text-ink-faint">live</span>
        <span className="font-display text-2xl tracking-[-0.01em]">{label}</span>
        <button
          onClick={() => setShowSensitivity((s) => !s)}
          className="absolute right-0 top-0 text-xs text-ink-faint hover:text-ink-soft transition-colors"
        >
          Sensitivity
        </button>
      </div>

      <AnimatePresence>
        {showSensitivity && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full flex flex-col gap-2 overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs text-ink-faint shrink-0">Subtle</span>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                className="w-full accent-ink"
              />
              <span className="text-xs text-ink-faint shrink-0">Big</span>
            </div>
            <p className="text-xs text-ink-faint text-center">
              Turn this up if your movement is subtle, down if it's large.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full aspect-square" onClick={isFallback ? recordTap : undefined}>
        <ParticleCanvas featuresRef={featuresRef} />
      </div>

      {isFallback && (
        <p className="text-xs text-ink-faint -mt-3">Tap anywhere on the circle above</p>
      )}

      <AnimatePresence>
        {softened && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="w-full bg-accent-calm-soft/50 border border-accent-calm/20 rounded-[0.875rem] px-4 py-3 flex items-center justify-between gap-3"
          >
            <p className="text-xs text-ink-soft leading-snug">
              That got big — softening things for a moment.
            </p>
            <button
              onClick={dismissSoften}
              className="text-xs font-medium text-ink shrink-0 hover:text-ink-soft transition-colors"
            >
              I&apos;m okay
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!audioOn ? (
        <Button size="lg" onClick={enableAudio} className="w-full">
          Turn on sound
        </Button>
      ) : (
        <div className="flex flex-col gap-4 w-full">
          <Button size="lg" variant="secondary" className="w-full" onClick={handleCapture}>
            Capture this moment
          </Button>

          {recent.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.6875rem] uppercase tracking-[0.1em] text-ink-faint">
                Recent pieces
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {recent.map((o) => (
                  <Link
                    key={o.id}
                    href="/dashboard"
                    className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden border border-line"
                  >
                    <Image src={o.image_url!} alt="" fill className="object-cover" unoptimized />
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-4">
            <Link href="/dashboard" className="text-sm text-ink-soft hover:text-ink transition-colors">
              View your dashboard →
            </Link>
            <span className="text-ink-faint">·</span>
            <button
              onClick={onEndSession}
              className="text-sm text-ink-soft hover:text-ink transition-colors"
            >
              End session
            </button>
          </div>
        </div>
      )}

      {capture && (
        <CaptureModal
          status={capture.status}
          outputId={capture.outputId}
          imageUrl={capture.imageUrl}
          caption={capture.caption}
          ttsAudioUrl={capture.ttsAudioUrl}
          musicUrl={capture.musicUrl}
          classification={capture.classification}
          mappingApplied={capture.mappingApplied}
          mood={capture.mood}
          onClose={() => setCapture(null)}
        />
      )}
    </div>
  );
}
