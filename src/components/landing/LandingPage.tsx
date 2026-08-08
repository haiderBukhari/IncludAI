"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const VALUE_PROPS = [
  {
    title: "Not something to suppress",
    body: "Flapping, tapping, rocking — the movements you're often told to hide become the input. There's no wrong way to move.",
  },
  {
    title: "Feels it back in real time",
    body: "Live sound and visuals react to your motion the instant you move, no waiting, no AI delay in the moment.",
  },
  {
    title: "Learns your gestures",
    body: "A 5-second calibration and your own saved styles mean it responds to your movement, not a generic average.",
  },
  {
    title: "Gives you something to keep",
    body: "Turn any moment into an image, a spoken reflection, or a short video you can look back on or share.",
  },
];

const FLOW_STEPS = [
  {
    n: "01",
    title: "Calibrate",
    body: "A quick 5-second natural gesture teaches the app your baseline — your subtle is not someone else's subtle.",
  },
  {
    n: "02",
    title: "Move",
    body: "Flap, tap, rock — however you naturally stim. A live particle visual and sound respond instantly.",
  },
  {
    n: "03",
    title: "Capture",
    body: "Turn any moment into AI-generated art and a short spoken reflection in plain, non-clinical language.",
  },
  {
    n: "04",
    title: "Make it yours",
    body: "Save a personal style, add a voice note, export a video, or just keep moving — your gallery holds it all.",
  },
];

export function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-20 px-6 py-16">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center text-center gap-6"
      >
        <div className="relative h-16 w-16">
          <motion.div
            className="absolute inset-0 rounded-full bg-accent-warm-soft"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-2.5 rounded-full bg-accent-calm-soft"
            animate={{ scale: [1, 0.85, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          />
          <div className="absolute inset-5 rounded-full bg-ink" />
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="font-display text-[2.5rem] sm:text-[3rem] leading-[1.05] tracking-[-0.02em]">
            StimuSonic
          </h1>
          <p className="text-ink-soft text-lg leading-relaxed max-w-xl">
            Turns the way you naturally move — flapping, tapping, rocking — into
            your own live music and art. Stimming, reframed as creative
            expression, not something to manage.
          </p>
        </div>

        <Button size="lg" onClick={onStart} className="mt-2 px-10">
          Get started
        </Button>
        <p className="text-xs text-ink-faint">
          No account needed. Works on your phone or right here in the browser.
        </p>
      </motion.div>

      {/* How it helps */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full flex flex-col gap-6"
      >
        <div className="flex flex-col gap-1 text-center">
          <span className="text-xs uppercase tracking-[0.14em] text-ink-faint">
            How it helps
          </span>
          <h2 className="font-display text-2xl tracking-[-0.01em]">
            Your movement, taken seriously
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {VALUE_PROPS.map((v) => (
            <Card key={v.title} className="p-5">
              <p className="font-medium text-[0.9375rem]">{v.title}</p>
              <p className="text-ink-soft text-sm mt-1.5 leading-relaxed">{v.body}</p>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* End-to-end flow */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full flex flex-col gap-6"
      >
        <div className="flex flex-col gap-1 text-center">
          <span className="text-xs uppercase tracking-[0.14em] text-ink-faint">
            How it works
          </span>
          <h2 className="font-display text-2xl tracking-[-0.01em]">
            From a gesture to something you made
          </h2>
        </div>
        <div className="flex flex-col gap-3">
          {FLOW_STEPS.map((step) => (
            <div key={step.n} className="flex gap-4 items-start">
              <span className="font-display text-2xl text-ink-faint w-10 shrink-0">
                {step.n}
              </span>
              <div className="flex flex-col gap-0.5 pb-3 border-b border-line w-full">
                <p className="font-medium text-[0.9375rem]">{step.title}</p>
                <p className="text-ink-soft text-sm leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-3 w-full max-w-xs"
      >
        <Button size="lg" onClick={onStart} className="w-full">
          Get started
        </Button>
        <a
          href="/dashboard"
          className="text-sm text-ink-soft hover:text-ink transition-colors"
        >
          View dashboard
        </a>
      </motion.div>
    </div>
  );
}
