import type { MotionFeatures } from "@/lib/motion/features";

const STYLE_BY_CLASS: Record<MotionFeatures["classification"], string> = {
  still: "a quiet, empty pale canvas, minimal, calm negative space",
  "slow-rock":
    "soft flowing abstract art in cool blues and teals, gentle waves, watercolor texture, slow undulating curves",
  "steady-wave":
    "rhythmic abstract art with repeating flowing ribbons, balanced composition, warm sky tones",
  bouncy:
    "vibrant playful abstract art, bright oranges and yellows, bouncy circular shapes, energetic swirls of color",
  jerky:
    "bold abstract art with sharp angular strokes, contrasting saturated colors, dynamic chaotic energy",
};

export function buildImagePrompt(features: MotionFeatures, customStyle?: string | null): string {
  const style = customStyle?.trim() || STYLE_BY_CLASS[features.classification];
  const intensityWord =
    features.intensity > 0.7 ? "high-energy" : features.intensity > 0.35 ? "moderate-energy" : "gentle";
  return [
    `Abstract generative art representing a person's natural stimming motion.`,
    style,
    `${intensityWord}, tempo of about ${Math.round(features.tempo * 10) / 10} beats per second.`,
    `No text, no words, no human figures. Digital art, soft lighting, high quality.`,
  ].join(" ");
}

export function buildCaptionMessages(
  features: MotionFeatures,
  mood?: string | null,
  sessionCount?: number
) {
  return [
    {
      role: "system" as const,
      content: [
        "You write a single short, plain-language line (max 20 words, one sentence) reflecting a person's movement back to them.",
        "Ground it in the actual numbers you're given — reference the real tempo, intensity, or how many times they've done this — instead of generic poetic metaphor.",
        "Never use flowery imagery like storms, painters, brushes, canvases holding breath, or anything a greeting card would say.",
        "Never use clinical, therapeutic, or 'calming down' language. Frame it as creative expression, not regulation.",
        "Vary your sentence structure and word choice every time — do not default to the same opening phrase.",
        "No emojis, no metaphor unless it's concrete and specific to the actual data.",
      ].join(" "),
    },
    {
      role: "user" as const,
      content: `classification: ${features.classification}. intensity: ${features.intensity.toFixed(
        2
      )} (0-1 scale). tempo: ${features.tempo.toFixed(1)} movements/sec. regularity: ${features.regularity.toFixed(
        2
      )} (0-1, higher = steadier).${mood ? ` mood reading: "${mood}".` : ""}${
        sessionCount ? ` this is capture #${sessionCount} for this person.` : ""
      } Write the one-sentence reflection now, grounded in these specifics.`,
    },
  ];
}

export interface MoodInterpretation {
  mood: string;
  visualStyle: string;
}

/**
 * The explicit "AI interpretation" step: rather than jumping straight from
 * heuristic classification to a prompt template, an LLM reads the raw motion
 * features and names a mood + describes a matching visual style in its own
 * words. This is what makes the mapping adaptive instead of a fixed lookup
 * table — the same "bouncy" classification can read as excited, urgent, or
 * playful depending on the actual numbers, and the art style follows that.
 */
export function buildMoodInterpretationMessages(features: MotionFeatures) {
  return [
    {
      role: "system" as const,
      content:
        'You interpret raw motion-sensor data from a person\'s stimming gesture (hand-flapping, tapping, rocking) into a short creative mood reading. Respond with strict JSON: {"mood": "one or two words, plain language, never clinical (e.g. \'excited\', \'unwinding\', \'restless energy\')", "visualStyle": "one vivid sentence describing an abstract art style and color palette that matches this mood and energy, suitable as a text-to-image prompt fragment"}. Never use words like calm-down, regulation, meltdown, or therapy. Frame everything as creative energy, not a problem state.',
    },
    {
      role: "user" as const,
      content: `classification: ${features.classification}, intensity: ${features.intensity.toFixed(
        2
      )} (0-1 scale), tempo: ${features.tempo.toFixed(
        1
      )} repetitions/sec, regularity: ${features.regularity.toFixed(2)} (0-1, higher = steadier rhythm).`,
    },
  ];
}
