"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import type { CalibrationBaseline, MotionSample } from "@/lib/motion/features";
import { computeBaseline } from "@/lib/motion/features";

const DURATION_MS = 5000;

interface CalibrationStepProps {
  isFallback: boolean;
  getBuffer: () => MotionSample[];
  clearBuffer: () => void;
  recordTap: () => void;
  onComplete: (baseline: CalibrationBaseline) => void;
}

export function CalibrationStep({
  isFallback,
  getBuffer,
  clearBuffer,
  recordTap,
  onComplete,
}: CalibrationStepProps) {
  const [phase, setPhase] = useState<"ready" | "recording" | "done">("ready");
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const startRecording = () => {
    clearBuffer();
    setPhase("recording");
    const start = performance.now();

    const tick = () => {
      const elapsed = performance.now() - start;
      setProgress(Math.min(1, elapsed / DURATION_MS));
      if (elapsed < DURATION_MS) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        const baseline = computeBaseline(getBuffer());
        setPhase("done");
        setTimeout(() => onComplete(baseline), 500);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  return (
    <div className="flex flex-col items-center text-center gap-8 max-w-md">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-3xl tracking-[-0.01em]">
          Show it your natural gesture
        </h2>
        <p className="text-ink-soft text-[0.9375rem] leading-relaxed">
          {isFallback
            ? "Tap the circle below at whatever pace feels like you, for five seconds."
            : "Do your gesture the way you normally would — flap, tap, rock — for five seconds. There's no target to hit."}
        </p>
      </div>

      <button
        onClick={() => {
          if (phase === "ready") startRecording();
          else if (isFallback && phase === "recording") recordTap();
        }}
        onTouchStart={() => {
          if (isFallback && phase === "recording") recordTap();
        }}
        disabled={phase === "done"}
        className="relative h-44 w-44 rounded-full flex items-center justify-center select-none disabled:opacity-100"
      >
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="var(--line)"
            strokeWidth="3"
          />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="var(--accent-warm)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 46}
            strokeDashoffset={2 * Math.PI * 46 * (1 - progress)}
            style={{ transition: "stroke-dashoffset 80ms linear" }}
          />
        </svg>
        <motion.div
          className="h-28 w-28 rounded-full bg-accent-warm-soft flex items-center justify-center text-sm font-medium text-ink"
          animate={
            phase === "recording"
              ? { scale: [1, 1.08, 1] }
              : { scale: 1 }
          }
          transition={{ duration: 0.6, repeat: phase === "recording" ? Infinity : 0 }}
        >
          {phase === "ready" && "Tap to start"}
          {phase === "recording" && `${Math.ceil((1 - progress) * 5)}s`}
          {phase === "done" && "Got it"}
        </motion.div>
      </button>

      {phase === "ready" && (
        <Button size="lg" onClick={startRecording} className="w-full">
          Start calibration
        </Button>
      )}
    </div>
  );
}
