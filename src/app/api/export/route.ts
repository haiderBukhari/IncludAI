import { NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { supabaseServer, MEDIA_BUCKET } from "@/lib/supabase/server";

const run = promisify(execFile);

export async function POST(req: NextRequest) {
  let body: { outputId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const outputId = body.outputId;
  if (!outputId) {
    return NextResponse.json({ error: "outputId is required" }, { status: 400 });
  }

  const { data: output, error } = await supabaseServer
    .from("outputs")
    .select("id, image_url, tts_audio_url, music_url")
    .eq("id", outputId)
    .single();

  if (error || !output) {
    return NextResponse.json({ error: error?.message ?? "Output not found" }, { status: 404 });
  }

  if (!output.image_url) {
    return NextResponse.json({ error: "This capture has no image to export" }, { status: 400 });
  }

  if (!ffmpegPath) {
    return NextResponse.json({ error: "ffmpeg binary not available on this server" }, { status: 500 });
  }

  const dir = await mkdtemp(path.join(tmpdir(), "stimusonic-export-"));
  const imagePath = path.join(dir, "image.png");
  const audioPath = path.join(dir, "audio.bin");
  const outPath = path.join(dir, "export.mp4");

  // Prefer the generated music clip over the spoken caption — a piece of art
  // paired with the actual generative music it produced is the real
  // "shareable creative output," not art paired with narration about it.
  const audioSourceUrl = output.music_url ?? output.tts_audio_url ?? null;

  try {
    const imageBytes = new Uint8Array(await (await fetch(output.image_url)).arrayBuffer());
    await writeFile(imagePath, imageBytes);

    const hasAudio = Boolean(audioSourceUrl);
    if (hasAudio) {
      const audioBytes = new Uint8Array(await (await fetch(audioSourceUrl!)).arrayBuffer());
      await writeFile(audioPath, audioBytes);
    }

    const args = hasAudio
      ? [
          "-y",
          "-loop", "1",
          "-i", imagePath,
          "-i", audioPath,
          "-c:v", "libx264",
          "-tune", "stillimage",
          "-c:a", "aac",
          "-b:a", "192k",
          "-pix_fmt", "yuv420p",
          "-shortest",
          outPath,
        ]
      : [
          "-y",
          "-loop", "1",
          "-i", imagePath,
          "-t", "5",
          "-c:v", "libx264",
          "-tune", "stillimage",
          "-pix_fmt", "yuv420p",
          outPath,
        ];

    await run(ffmpegPath as string, args);

    const videoBytes = await readFile(outPath);
    const storagePath = `exports/${outputId}.mp4`;
    const { error: uploadError } = await supabaseServer.storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, videoBytes, { contentType: "video/mp4", upsert: true });

    if (uploadError) throw uploadError;

    const { data: publicUrl } = supabaseServer.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);

    const { data: updated, error: updateError } = await supabaseServer
      .from("outputs")
      .update({ export_url: publicUrl.publicUrl })
      .eq("id", outputId)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ output: updated });
  } catch (err) {
    console.error("Export failed:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
