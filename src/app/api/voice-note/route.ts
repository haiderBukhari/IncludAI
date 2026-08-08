import { NextRequest, NextResponse } from "next/server";
import { openai, STT_MODEL } from "@/lib/ai/openai";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const outputId = formData.get("outputId");
  const audio = formData.get("audio");

  if (typeof outputId !== "string" || !(audio instanceof Blob)) {
    return NextResponse.json({ error: "outputId and audio file are required" }, { status: 400 });
  }

  // Whisper's SDK wrapper needs a File-like object with a name; audio itself
  // is never persisted to storage or the DB — only the resulting transcript is.
  const file = new File([audio], "voice-note.webm", { type: audio.type || "audio/webm" });

  let transcript: string;
  try {
    const result = await openai.audio.transcriptions.create({
      model: STT_MODEL,
      file,
    });
    transcript = result.text.trim();
  } catch (err) {
    console.error("Transcription failed:", err);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }

  const { data, error } = await supabaseServer
    .from("outputs")
    .update({ voice_note_text: transcript })
    .eq("id", outputId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ output: data, transcript });
}
