"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LandingPage } from "@/components/landing/LandingPage";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

const SEEN_LANDING_KEY = "stimusonic_seen_landing";

export default function StudioPage() {
  const [started, setStarted] = useState(false);

  useEffect(() => {
    // AuthGate already confirms who this device belongs to, separately from
    // whether they've seen the "what is this" marketing page — a device can
    // be registered on day one and still see the landing copy once.
    if (localStorage.getItem(SEEN_LANDING_KEY) === "1") setStarted(true);
  }, []);

  const handleStart = () => {
    localStorage.setItem(SEEN_LANDING_KEY, "1");
    setStarted(true);
  };

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <AnimatePresence mode="wait">
        {!started ? (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            <LandingPage onStart={handleStart} />
          </motion.div>
        ) : (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full flex justify-center"
          >
            <OnboardingFlow />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
