"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface PermissionStepProps {
  onGranted: () => void;
  onFallback: () => void;
  requestPermission: () => Promise<"granted" | "denied" | "unsupported">;
}

export function PermissionStep({
  onGranted,
  onFallback,
  requestPermission,
}: PermissionStepProps) {
  const [status, setStatus] = useState<"idle" | "asking" | "denied">("idle");

  const handleTap = async () => {
    setStatus("asking");
    const result = await requestPermission();
    if (result === "granted") {
      onGranted();
    } else if (result === "unsupported") {
      onFallback();
    } else {
      setStatus("denied");
    }
  };

  return (
    <div className="flex flex-col items-center text-center gap-7 max-w-md">
      <div className="h-16 w-16 rounded-2xl bg-accent-calm-soft flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"
            stroke="var(--accent-calm)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-3xl tracking-[-0.01em]">
          Let it feel your movement
        </h2>
        <p className="text-ink-soft text-[0.9375rem] leading-relaxed">
          Your phone will ask to share motion &amp; orientation. This lets
          StimuSonic sense your gesture — nothing is stored until you choose
          to save it.
        </p>
      </div>

      <Button size="lg" onClick={handleTap} className="w-full">
        {status === "asking" ? "Requesting..." : "Allow motion access"}
      </Button>

      {status === "denied" && (
        <div className="flex flex-col gap-3 w-full">
          <p className="text-sm text-accent-warm">
            Permission was denied. You can still use tap input instead.
          </p>
          <Button variant="secondary" size="md" onClick={onFallback} className="w-full">
            Continue with tap input
          </Button>
        </div>
      )}
    </div>
  );
}
