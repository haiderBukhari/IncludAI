export interface MotionSample {
  t: number;
  x: number;
  y: number;
  z: number;
}

export interface MotionFeatures {
  intensity: number; // 0..1, normalized to calibration baseline
  tempo: number; // estimated repetitions per second
  regularity: number; // 0..1, 1 = perfectly steady rhythm
  classification: "still" | "slow-rock" | "steady-wave" | "bouncy" | "jerky";
}

export interface CalibrationBaseline {
  baselineAmplitude: number;
  baselineTempo: number;
}

const magnitude = (s: MotionSample) => Math.sqrt(s.x * s.x + s.y * s.y + s.z * s.z);

/** Light 3-point moving average — sensor jitter otherwise reads as false peaks. */
function smooth(values: number[]): number[] {
  if (values.length < 3) return values;
  return values.map((v, i) => {
    const prev = values[i - 1] ?? v;
    const next = values[i + 1] ?? v;
    return (prev + v + next) / 3;
  });
}

/** Finds local peaks in the magnitude signal above a noise floor, returns their timestamps. */
function findPeaks(samples: MotionSample[], noiseFloor: number): number[] {
  const mags = smooth(samples.map(magnitude));
  const mean = mags.reduce((a, b) => a + b, 0) / (mags.length || 1);
  const centered = mags.map((m) => m - mean);
  const peaks: number[] = [];
  // Refractory gap avoids counting the same physical tap twice as it decays.
  const minGapMs = 90;
  let lastPeakT = -Infinity;
  for (let i = 1; i < centered.length - 1; i++) {
    if (
      centered[i] > centered[i - 1] &&
      centered[i] >= centered[i + 1] &&
      centered[i] > noiseFloor &&
      samples[i].t - lastPeakT > minGapMs
    ) {
      peaks.push(samples[i].t);
      lastPeakT = samples[i].t;
    }
  }
  return peaks;
}

/** Raw baseline from a short natural-gesture calibration window. */
export function computeBaseline(samples: MotionSample[]): CalibrationBaseline {
  if (samples.length < 4) {
    return { baselineAmplitude: 1, baselineTempo: 1 };
  }
  const mags = smooth(samples.map(magnitude));
  const mean = mags.reduce((a, b) => a + b, 0) / mags.length;
  const peakAmp =
    mags.reduce((a, b) => a + Math.abs(b - mean), 0) / mags.length || 0.5;

  const peaks = findPeaks(samples, peakAmp * 0.3);
  const durationSec =
    (samples[samples.length - 1].t - samples[0].t) / 1000 || 1;
  const tempo = peaks.length / durationSec || 1;

  return {
    baselineAmplitude: Math.max(peakAmp, 0.15),
    baselineTempo: Math.max(tempo, 0.5),
  };
}

/**
 * Extracts live features from a rolling window, normalized against the user's
 * calibration. `sensitivity` (0.4–2.5, default 1) scales how readily subtle
 * motion registers — lower values need bigger movement, higher values pick
 * up smaller gestures.
 */
export function extractFeatures(
  samples: MotionSample[],
  baseline: CalibrationBaseline,
  sensitivity = 1
): MotionFeatures {
  if (samples.length < 4) {
    return { intensity: 0, tempo: 0, regularity: 0, classification: "still" };
  }

  const mags = smooth(samples.map(magnitude));
  const mean = mags.reduce((a, b) => a + b, 0) / mags.length;
  const rawAmplitude =
    mags.reduce((a, b) => a + Math.abs(b - mean), 0) / mags.length || 0;

  const scaledAmplitude = rawAmplitude * sensitivity;
  const intensity = Math.min(1, scaledAmplitude / (baseline.baselineAmplitude * 2));

  // Noise floor shrinks as sensitivity rises, so faint motion still finds peaks.
  const peaks = findPeaks(samples, (rawAmplitude * 0.3) / Math.max(sensitivity, 0.4));
  const durationSec =
    (samples[samples.length - 1].t - samples[0].t) / 1000 || 1;
  const rawTempo = peaks.length / durationSec;
  const tempo = rawTempo;

  let regularity = 0;
  if (peaks.length > 2) {
    const intervals = peaks.slice(1).map((p, i) => p - peaks[i]);
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance =
      intervals.reduce((a, b) => a + (b - avgInterval) ** 2, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    regularity = Math.max(0, 1 - stdDev / (avgInterval || 1));
  }

  const tempoRatio = rawTempo / baseline.baselineTempo;

  let classification: MotionFeatures["classification"] = "still";
  if (intensity < 0.08) {
    classification = "still";
  } else if (tempoRatio < 0.7 && intensity < 0.55) {
    classification = "slow-rock";
  } else if (regularity > 0.6 && intensity < 0.7) {
    classification = "steady-wave";
  } else if (regularity > 0.45 && intensity >= 0.55) {
    classification = "bouncy";
  } else {
    classification = "jerky";
  }

  return { intensity, tempo, regularity, classification };
}
