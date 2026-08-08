"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const POINTS = [
  {
    title: "Motion drives everything, by default",
    body: "We read your phone's motion sensors — no camera, and the microphone is never used to watch or listen to you passively.",
  },
  {
    title: "The mic is opt-in, one recording at a time",
    body: "After you capture a moment, you can choose to add a short voice note. We transcribe it to text and discard the audio immediately — the recording itself is never saved or replayed by us.",
  },
  {
    title: "No wrong way to move",
    body: "Whatever your gesture looks like is the right input. There's nothing to get right.",
  },
  {
    title: "Stop anytime",
    body: "You can pause or skip an output the moment it feels like too much, no explanation needed.",
  },
];

export function ConsentStep({
  onNext,
  isMinor,
}: {
  onNext: () => void;
  isMinor?: boolean;
}) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="flex flex-col gap-6 max-w-2xl w-full">
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-3xl tracking-[-0.01em]">
          Before we start
        </h2>
        <p className="text-ink-soft text-[0.9375rem]">
          Quick and honest — here's exactly what happens.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {POINTS.map((p) => (
          <Card key={p.title} className="p-4">
            <p className="font-medium text-[0.9375rem]">{p.title}</p>
            <p className="text-ink-soft text-sm mt-1 leading-relaxed">{p.body}</p>
          </Card>
        ))}
      </div>

      {isMinor && (
        <Card className="p-4 bg-accent-warm-soft/40 border-accent-warm/20">
          <p className="text-sm leading-relaxed">
            A parent or guardian should review and agree to this before a
            minor uses the app.
          </p>
        </Card>
      )}

      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-line accent-ink"
        />
        <span className="text-sm text-ink-soft leading-relaxed">
          I understand and agree to how my motion data is used.
        </span>
      </label>

      <Button size="lg" disabled={!checked} onClick={onNext} className="w-full">
        Continue
      </Button>
    </div>
  );
}
