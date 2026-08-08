import { NextRequest, NextResponse } from "next/server";
import { openai, IMAGE_MODEL, CHAT_MODEL, TTS_MODEL, TTS_VOICE } from "@/lib/ai/openai";
import {
  buildImagePrompt,
  buildCaptionMessages,
  buildMoodInterpretationMessages,
  type MoodInterpretation,
} from "@/lib/ai/prompts";
import { supabaseServer, MEDIA_BUCKET } from "@/lib/supabase/server";
import type { MotionFeatures } from "@/lib/motion/features";

interface CaptureRequestBody {
  deviceId: string;
  features: MotionFeatures;
  durationMs?: number;
}

export async function POST(req: NextRequest) {
  let body: CaptureRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { deviceId, features, durationMs = 0 } = body;
  if (!deviceId || !features) {
    return NextResponse.json({ error: "deviceId and features are required" }, { status: 400 });
  }

  const { data: session, error: sessionError } = await supabaseServer
    .from("sessions")
    .insert({ device_id: deviceId, duration_ms: durationMs, feature_summary: features })
    .select()
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: sessionError?.message ?? "Failed to create session" }, { status: 500 });
  }

  const { data: mapping } = await supabaseServer
    .from("mappings")
    .select("prompt_style")
    .eq("device_id", deviceId)
    .eq("classification", features.classification)
    .maybeSingle();

  const { count: sessionCount } = await supabaseServer
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("device_id", deviceId);

  // AI interpretation step: read the raw motion into a mood + style before
  // generating anything, rather than jumping straight from a fixed
  // classification to a fixed prompt template.
  const mood = await interpretMood(features).catch((err) => {
    console.error("Mood interpretation failed:", err);
    return null;
  });

  // A saved personal style always wins (it's the user's own words); otherwise
  // fall back to what the mood step suggested, then the classification default.
  const styleOverride = mapping?.prompt_style ?? mood?.visualStyle ?? null;

  const [imageResult, captionResult] = await Promise.allSettled([
    generateImage(features, session.id as string, styleOverride),
    generateCaption(features, mood?.mood ?? null, sessionCount ?? undefined),
  ]);

  const imageUrl = imageResult.status === "fulfilled" ? imageResult.value : null;
  const captionText = captionResult.status === "fulfilled" ? captionResult.value : null;

  if (imageResult.status === "rejected") {
    console.error("Image generation failed:", imageResult.reason);
  }
  if (captionResult.status === "rejected") {
    console.error("Caption generation failed:", captionResult.reason);
  }

  let ttsAudioUrl: string | null = null;
  if (captionText) {
    try {
      ttsAudioUrl = await generateSpeech(captionText, session.id as string);
    } catch (err) {
      console.error("TTS generation failed:", err);
    }
  }

  const { data: output, error: outputError } = await supabaseServer
    .from("outputs")
    .insert({
      session_id: session.id,
      image_url: imageUrl,
      caption_text: captionText,
      tts_audio_url: ttsAudioUrl,
      audio_config: { classification: features.classification, tempo: features.tempo, mood: mood?.mood ?? null },
    })
    .select()
    .single();

  if (outputError) {
    return NextResponse.json({ error: outputError.message }, { status: 500 });
  }

  return NextResponse.json({
    session,
    output,
    mappingApplied: Boolean(mapping),
    mood: mood?.mood ?? null,
  });
}

async function interpretMood(features: MotionFeatures): Promise<MoodInterpretation | null> {
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: buildMoodInterpretationMessages(features),
    max_tokens: 120,
    temperature: 0.7,
    response_format: { type: "json_object" },
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.mood === "string" && typeof parsed.visualStyle === "string") {
      return { mood: parsed.mood, visualStyle: parsed.visualStyle };
    }
  } catch {
    // fall through to null — capture still proceeds with heuristic defaults
  }
  return null;
}

async function generateImage(
  features: MotionFeatures,
  sessionId: string,
  customStyle: string | null
): Promise<string> {
  const prompt = buildImagePrompt(features, customStyle);
  const result = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt,
    size: "1024x1024",
    n: 1,
  });

  const b64 = result.data?.[0]?.b64_json;
  const url = result.data?.[0]?.url;

  let bytes: Uint8Array;
  if (b64) {
    bytes = Uint8Array.from(Buffer.from(b64, "base64"));
  } else if (url) {
    const res = await fetch(url);
    bytes = new Uint8Array(await res.arrayBuffer());
  } else {
    throw new Error("OpenAI returned no image data");
  }

  const path = `captures/${sessionId}.png`;
  const { error: uploadError } = await supabaseServer.storage
    .from(MEDIA_BUCKET)
    .upload(path, bytes, { contentType: "image/png", upsert: true });

  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabaseServer.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return publicUrl.publicUrl;
}

async function generateCaption(
  features: MotionFeatures,
  mood: string | null,
  sessionCount?: number
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: buildCaptionMessages(features, mood, sessionCount),
    max_tokens: 50,
    temperature: 1.0,
    presence_penalty: 0.4,
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
}

async function generateSpeech(text: string, sessionId: string): Promise<string> {
  const response = await openai.audio.speech.create({
    model: TTS_MODEL,
    voice: TTS_VOICE,
    input: text,
  });

  const bytes = new Uint8Array(await response.arrayBuffer());
  const path = `captures/${sessionId}-caption.mp3`;
  const { error: uploadError } = await supabaseServer.storage
    .from(MEDIA_BUCKET)
    .upload(path, bytes, { contentType: "audio/mpeg", upsert: true });

  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabaseServer.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return publicUrl.publicUrl;
}
