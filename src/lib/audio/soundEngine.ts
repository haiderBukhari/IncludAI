"use client";

import * as Tone from "tone";
import type { MotionFeatures } from "@/lib/motion/features";

const SCALES: Record<MotionFeatures["classification"], string[]> = {
  still: [],
  "slow-rock": ["C3", "Eb3", "F3", "G3", "Bb3", "C4"],
  "steady-wave": ["C4", "D4", "E4", "G4", "A4", "C5"],
  bouncy: ["C5", "D5", "E5", "G5", "A5", "C6"],
  jerky: ["C4", "Db4", "E4", "Gb4", "Ab4", "B4"],
};

// Browser audio contexts stay "unlocked" for the tab's lifetime once a user
// gesture has started one — track that so we don't ask for the same tap
// again every time the user re-enters the Studio within the same session.
let audioUnlockedThisTab = false;
export function isAudioUnlocked() {
  return audioUnlockedThisTab;
}

export class SoundEngine {
  private synth: Tone.PolySynth | null = null;
  private reverb: Tone.Reverb | null = null;
  private loop: Tone.Loop | null = null;
  private lastNoteAt = 0;
  private ready = false;
  private muted = false;

  async init() {
    if (this.ready) return;
    await Tone.start();
    audioUnlockedThisTab = true;
    this.reverb = new Tone.Reverb({ decay: 3, wet: 0.35 }).toDestination();
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 1.2 },
    }).connect(this.reverb);
    this.ready = true;
  }

  /** Pauses the live background synth without tearing it down — used while
   * the capture modal's own music/TTS players are up, so they don't overlap. */
  setMuted(muted: boolean) {
    this.muted = muted;
  }

  update(features: MotionFeatures) {
    if (!this.ready || !this.synth || this.muted) return;
    if (features.classification === "still") return;

    const now = Tone.now();
    const minInterval = Math.max(0.12, 1 / Math.max(features.tempo, 0.5));
    if (now - this.lastNoteAt < minInterval) return;
    this.lastNoteAt = now;

    const scale = SCALES[features.classification];
    if (!scale.length) return;
    const note = scale[Math.floor(Math.random() * scale.length)];
    const velocity = 0.15 + features.intensity * 0.5;
    const duration = features.classification === "slow-rock" ? "2n" : "8n";
    this.synth.triggerAttackRelease(note, duration, now, velocity);
  }

  dispose() {
    this.loop?.dispose();
    this.synth?.dispose();
    this.reverb?.dispose();
    this.ready = false;
  }
}
