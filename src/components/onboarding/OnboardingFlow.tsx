"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ConsentStep } from "./ConsentStep";
import { PermissionStep } from "./PermissionStep";
import { CalibrationStep } from "./CalibrationStep";
import { StudioView } from "@/components/studio/StudioView";
import { StepDots } from "@/components/ui/StepDots";
import { ComfortRating } from "@/components/ui/ComfortRating";
import { Button } from "@/components/ui/Button";
import { useMotionCapture } from "@/lib/motion/useMotionCapture";
import {
  getStoredBaseline,
  setStoredBaseline,
  hasAcceptedConsent,
  markConsentAccepted,
} from "@/lib/motion/persistedSetup";
import type { CalibrationBaseline } from "@/lib/motion/features";

type Stage =
  | "consent"
  | "permission"
  | "calibration"
  | "comfort-before"
  | "studio"
  | "comfort-after"
  | "done";

const STAGE_ORDER: Stage[] = [
  "consent",
  "permission",
  "calibration",
  "comfort-before",
  "studio",
];

const fade = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
};

export function OnboardingFlow() {
  // AuthGate already guarantees name+email exist before this ever renders,
  // so setup here only covers consent/permission/calibration.
  const [stage, setStage] = useState<Stage>(hasAcceptedConsent() ? "permission" : "consent");
  const [baseline, setBaseline] = useState<CalibrationBaseline | null>(getStoredBaseline());
  const [returningSetup] = useState(() => Boolean(getStoredBaseline()));
  const motionCapture = useMotionCapture();

  const stageIndex = STAGE_ORDER.indexOf(stage);
  const showDots = !["studio", "comfort-after", "done"].includes(stage);

  return (
    <div className="flex flex-col items-center gap-10 w-full">
      {showDots && <StepDots total={4} current={stageIndex} />}

      <AnimatePresence mode="wait">
        {stage === "consent" && (
          <motion.div key="consent" {...fade}>
            <ConsentStep
              onNext={() => {
                markConsentAccepted();
                setStage("permission");
              }}
            />
          </motion.div>
        )}

        {stage === "permission" && (
          <motion.div key="permission" {...fade}>
            <PermissionStep
              requestPermission={motionCapture.requestPermission}
              onGranted={() => setStage(returningSetup ? "comfort-before" : "calibration")}
              onFallback={() => {
                motionCapture.setIsFallback(true);
                setStage(returningSetup ? "comfort-before" : "calibration");
              }}
            />
          </motion.div>
        )}

        {stage === "calibration" && (
          <motion.div key="calibration" {...fade}>
            <CalibrationStep
              isFallback={motionCapture.isFallback}
              getBuffer={motionCapture.getBuffer}
              clearBuffer={motionCapture.clearBuffer}
              recordTap={motionCapture.recordTap}
              onComplete={(b) => {
                setBaseline(b);
                setStoredBaseline(b);
                setStage("comfort-before");
              }}
            />
          </motion.div>
        )}

        {stage === "comfort-before" && (
          <motion.div key="comfort-before" {...fade}>
            <ComfortRating
              stage="before"
              title="Quick check-in"
              subtitle="Before you start, how are you feeling right now?"
              onDone={() => setStage("studio")}
            />
          </motion.div>
        )}

        {stage === "studio" && baseline && (
          <motion.div
            key="studio"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full flex justify-center"
          >
            <StudioView
              baseline={baseline}
              isFallback={motionCapture.isFallback}
              getBuffer={motionCapture.getBuffer}
              recordTap={motionCapture.recordTap}
              onEndSession={() => setStage("comfort-after")}
            />
          </motion.div>
        )}

        {stage === "comfort-after" && (
          <motion.div key="comfort-after" {...fade}>
            <ComfortRating
              stage="after"
              title="And now?"
              subtitle="How are you feeling after that?"
              onDone={() => setStage("done")}
            />
          </motion.div>
        )}

        {stage === "done" && (
          <motion.div key="done" {...fade} className="flex flex-col items-center text-center gap-6 max-w-md">
            <h2 className="font-display text-3xl tracking-[-0.01em]">
              That&apos;s your session
            </h2>
            <p className="text-ink-soft text-[0.9375rem]">
              Everything you made is saved in your dashboard, whenever you want it.
            </p>
            <div className="flex flex-col gap-3 w-full">
              <Button size="lg" onClick={() => setStage("studio")} className="w-full">
                Keep going
              </Button>
              <a
                href="/dashboard"
                className="text-center text-sm text-ink-soft hover:text-ink transition-colors"
              >
                View your dashboard →
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
