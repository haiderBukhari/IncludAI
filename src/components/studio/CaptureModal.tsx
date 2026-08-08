"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { getDeviceId } from "@/lib/supabase/client";
import type { MotionFeatures } from "@/lib/motion/features";

interface CaptureModalProps {
  status: "loading" | "done" | "error";
  outputId: string | null;
  imageUrl: string | null;
  caption: string | null;
  ttsAudioUrl: string | null;
  musicUrl: string | null;
  classification: MotionFeatures["classification"] | null;
  mappingApplied?: boolean;
  mood?: string | null;
  onClose: () => void;
}

type RecordingState = "idle" | "recording" | "uploading" | "done" | "error";
type SaveState = "idle" | "editing" | "saving" | "saved" | "error";
type ExportState = "idle" | "exporting" | "done" | "error";

const LOADING_STEPS = [
  "Reading the mood in your motion (GPT)...",
  "Painting your art (DALL·E)...",
  "Composing a music clip from your rhythm...",
  "Writing a reflection in your voice (GPT)...",
  "Recording that reflection aloud (TTS)...",
  "Almost there — saving your piece...",
];

export function CaptureModal({
  status,
  outputId,
  imageUrl,
  caption,
  ttsAudioUrl,
  musicUrl,
  classification,
  mappingApplied,
  mood,
  onClose,
}: CaptureModalProps) {
  const [recording, setRecording] = useState<RecordingState>("idle");
  const [transcript, setTranscript] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [presetLabel, setPresetLabel] = useState("");

  const [exportState, setExportState] = useState<ExportState>("idle");
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  const [loadingStep, setLoadingStep] = useState(0);
  useEffect(() => {
    if (status !== "loading") return;
    setLoadingStep(0);
    const interval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 2200);
    return () => clearInterval(interval);
  }, [status]);

  const startVoiceNote = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => uploadVoiceNote(stream);
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording("recording");
    } catch {
      setRecording("error");
    }
  };

  const stopVoiceNote = () => {
    mediaRecorderRef.current?.stop();
  };

  const uploadVoiceNote = async (stream: MediaStream) => {
    setRecording("uploading");
    stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });

    try {
      const formData = new FormData();
      formData.append("outputId", outputId ?? "");
      formData.append("audio", blob, "voice-note.webm");
      const res = await fetch("/api/voice-note", { method: "POST", body: formData });
      if (!res.ok) throw new Error("upload failed");
      const data = await res.json();
      setTranscript(data.transcript);
      setRecording("done");
    } catch {
      setRecording("error");
    }
  };

  const savePreset = async () => {
    if (!classification || !presetLabel.trim()) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: getDeviceId(),
          classification,
          label: presetLabel.trim(),
          promptStyle: presetLabel.trim(),
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const exportVideo = async () => {
    setExportState("exporting");
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputId }),
      });
      if (!res.ok) throw new Error("export failed");
      const data = await res.json();
      setExportUrl(data.output?.export_url ?? null);
      setExportState("done");
    } catch {
      setExportState("error");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm px-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="bg-paper-raised rounded-[1.5rem] border border-line shadow-[var(--shadow-soft)] max-w-sm w-full p-6 flex flex-col items-center gap-5 max-h-[90vh] overflow-y-auto"
        >
          {status === "loading" && (
            <>
              <motion.div
                className="h-16 w-16 rounded-full border-2 border-line border-t-accent-warm"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <div className="flex flex-col items-center gap-3 w-full">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingStep}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25 }}
                    className="text-ink-soft text-sm text-center"
                  >
                    {LOADING_STEPS[loadingStep]}
                  </motion.p>
                </AnimatePresence>
                <div className="flex items-center gap-1.5">
                  {LOADING_STEPS.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        i <= loadingStep ? "w-5 bg-accent-warm" : "w-1.5 bg-line"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {status === "done" && (
            <>
              {mappingApplied && (
                <span className="text-xs uppercase tracking-[0.1em] text-accent-calm">
                  made with your saved style
                </span>
              )}
              {!mappingApplied && mood && (
                <span className="text-xs uppercase tracking-[0.1em] text-ink-faint">
                  read as &ldquo;{mood}&rdquo;
                </span>
              )}

              {imageUrl && (
                <div className="relative w-full aspect-square rounded-[1rem] overflow-hidden bg-paper">
                  <Image src={imageUrl} alt="Generated artwork from your movement" fill className="object-cover" unoptimized />
                </div>
              )}
              {caption && (
                <p className="font-display text-lg text-center leading-snug">
                  &ldquo;{caption}&rdquo;
                </p>
              )}

              {musicUrl && (
                <div className="w-full flex flex-col gap-1.5">
                  <span className="text-[0.6875rem] uppercase tracking-[0.1em] text-ink-faint">
                    Your music
                  </span>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio src={musicUrl} controls autoPlay className="w-full h-9" />
                </div>
              )}

              {ttsAudioUrl && (
                <div className="w-full flex flex-col gap-1.5">
                  <span className="text-[0.6875rem] uppercase tracking-[0.1em] text-ink-faint">
                    Spoken reflection
                  </span>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio src={ttsAudioUrl} controls className="w-full h-9" />
                </div>
              )}

              {/* Voice note */}
              <div className="w-full border-t border-line pt-4 flex flex-col items-center gap-2">
                {recording === "idle" && (
                  <button
                    onClick={startVoiceNote}
                    className="text-sm text-ink-soft hover:text-ink transition-colors"
                  >
                    Want to say anything about that moment? Add a voice note
                  </button>
                )}
                {recording === "recording" && (
                  <Button size="md" variant="secondary" onClick={stopVoiceNote}>
                    Recording... tap to stop
                  </Button>
                )}
                {recording === "uploading" && (
                  <p className="text-sm text-ink-faint">Listening back...</p>
                )}
                {recording === "done" && transcript && (
                  <p className="text-sm text-ink-soft text-center italic">
                    &ldquo;{transcript}&rdquo; — saved with this piece
                  </p>
                )}
                {recording === "error" && (
                  <p className="text-sm text-accent-warm text-center">
                    Couldn&apos;t record that — mic access may be blocked.
                  </p>
                )}
              </div>

              {/* Save as personal preset */}
              {classification && classification !== "still" && (
                <div className="w-full border-t border-line pt-4 flex flex-col items-center gap-2">
                  {saveState === "idle" && (
                    <button
                      onClick={() => setSaveState("editing")}
                      className="text-sm text-ink-soft hover:text-ink transition-colors"
                    >
                      Save this style for next time
                    </button>
                  )}
                  {saveState === "editing" && (
                    <div className="w-full flex flex-col gap-2">
                      <input
                        autoFocus
                        value={presetLabel}
                        onChange={(e) => setPresetLabel(e.target.value)}
                        placeholder="e.g. calm blue landscape"
                        className="w-full rounded-[0.75rem] border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink-faint"
                      />
                      <Button size="md" onClick={savePreset} disabled={!presetLabel.trim()}>
                        Save as my &ldquo;{classification}&rdquo; style
                      </Button>
                    </div>
                  )}
                  {saveState === "saving" && <p className="text-sm text-ink-faint">Saving...</p>}
                  {saveState === "saved" && (
                    <p className="text-sm text-accent-calm text-center">
                      Saved — future &ldquo;{classification}&rdquo; moments will use this style.
                    </p>
                  )}
                  {saveState === "error" && (
                    <p className="text-sm text-accent-warm text-center">Couldn&apos;t save that preset.</p>
                  )}
                </div>
              )}

              {/* Export as shareable video */}
              <div className="w-full border-t border-line pt-4 flex flex-col items-center gap-2">
                {exportState === "idle" && imageUrl && (
                  <button
                    onClick={exportVideo}
                    className="text-sm text-ink-soft hover:text-ink transition-colors"
                  >
                    Export as a shareable video
                  </button>
                )}
                {exportState === "exporting" && (
                  <p className="text-sm text-ink-faint">Putting it together...</p>
                )}
                {exportState === "done" && exportUrl && (
                  <a
                    href={exportUrl}
                    download
                    className="text-sm text-accent-calm underline underline-offset-2"
                  >
                    Download your video
                  </a>
                )}
                {exportState === "error" && (
                  <p className="text-sm text-accent-warm text-center">Export didn&apos;t go through.</p>
                )}
              </div>

              <Button size="md" onClick={onClose} className="w-full">
                Back to studio
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <p className="text-sm text-accent-warm text-center">
                That capture didn&apos;t make it through. Your live session is
                still going — try again anytime.
              </p>
              <Button size="md" variant="secondary" onClick={onClose} className="w-full">
                Close
              </Button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
