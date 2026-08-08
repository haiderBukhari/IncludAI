"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { getDeviceId } from "@/lib/supabase/client";

const FACES = ["😖", "😕", "😐", "🙂", "😄"];

interface ComfortRatingProps {
  stage: "before" | "after";
  sessionId?: string | null;
  title: string;
  subtitle?: string;
  onDone: (rating: number) => void;
}

export function ComfortRating({ stage, sessionId, title, subtitle, onDone }: ComfortRatingProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (rating: number) => {
    setSelected(rating);
    setSubmitting(true);
    try {
      await fetch("/api/comfort-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: getDeviceId(), sessionId, stage, rating }),
      });
    } catch {
      // Non-blocking — the rating is a nice-to-have data point, not a gate.
    }
    setTimeout(() => onDone(rating), 350);
  };

  return (
    <div className="flex flex-col items-center text-center gap-7 max-w-md">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-3xl tracking-[-0.01em]">{title}</h2>
        {subtitle && <p className="text-ink-soft text-[0.9375rem] leading-relaxed">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {FACES.map((face, i) => {
          const value = i + 1;
          return (
            <button
              key={value}
              onClick={() => !submitting && submit(value)}
              disabled={submitting}
              className="flex flex-col items-center gap-1.5 disabled:opacity-40"
            >
              <motion.span
                className="text-4xl"
                animate={selected === value ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.35 }}
              >
                {face}
              </motion.span>
              <span className="text-xs text-ink-faint">{value}</span>
            </button>
          );
        })}
      </div>

      {!submitting && (
        <button
          onClick={() => onDone(0)}
          className="text-sm text-ink-faint hover:text-ink-soft transition-colors"
        >
          Skip
        </button>
      )}
    </div>
  );
}
