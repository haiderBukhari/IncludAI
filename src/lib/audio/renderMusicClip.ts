"use client";

import * as Tone from "tone";
import type { MotionFeatures } from "@/lib/motion/features";

const SCALES: Record<MotionFeatures["classification"], string[]> = {
  still: ["C4", "E4", "G4"],
  "slow-rock": ["C3", "Eb3", "F3", "G3", "Bb3", "C4"],
  "steady-wave": ["C4", "D4", "E4", "G4", "A4", "C5"],
  bouncy: ["C5", "D5", "E5", "G5", "A5", "C6"],
  jerky: ["C4", "Db4", "E4", "Gb4", "Ab4", "B4"],
};

/**
 * Renders an actual, savable music clip using the same mapping logic as the
 * live Tone.js synth (see soundEngine.ts) — the difference is this runs
 * through Tone's offline renderer so it produces a real audio buffer instead
 * of ephemeral speaker output, which is what's uploaded and kept as part of
 * the capture. Without this, "music" only ever existed live and disappeared
 * the moment the user left the Studio screen.
 */
export async function renderMusicClip(
  features: MotionFeatures,
  durationSec = 6
): Promise<Blob> {
  const scale = SCALES[features.classification] ?? SCALES.still;
  const tempo = Math.max(0.6, Math.min(features.tempo || 1.5, 6));
  const interval = 1 / tempo;
  const intensity = features.intensity || 0.3;
  const regularity = features.regularity ?? 0.5;

  const buffer = await Tone.Offline(() => {
    const reverb = new Tone.Reverb({ decay: 3, wet: 0.35 }).toDestination();
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 1.2 },
    }).connect(reverb);

    let t = 0.15;
    while (t < durationSec - 0.4) {
      const note = scale[Math.floor(Math.random() * scale.length)];
      const velocity = 0.2 + intensity * 0.55;
      const dur = features.classification === "slow-rock" ? "2n" : "8n";
      synth.triggerAttackRelease(note, dur, t, velocity);
      const jitter = (1 - regularity) * interval * 0.4 * (Math.random() - 0.5);
      t += interval + jitter;
    }
  }, durationSec);

  const raw = buffer.get();
  if (!raw) throw new Error("Offline render produced no audio buffer");
  return audioBufferToWavBlob(raw);
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = buffer.length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);

  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) channels.push(buffer.getChannelData(i));

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}
