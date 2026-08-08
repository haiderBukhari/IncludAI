import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, MEDIA_BUCKET } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const outputId = formData.get("outputId");
  const audio = formData.get("audio");

  if (typeof outputId !== "string" || !(audio instanceof Blob)) {
    return NextResponse.json({ error: "outputId and audio file are required" }, { status: 400 });
  }

  const bytes = new Uint8Array(await audio.arrayBuffer());
  const path = `captures/${outputId}-music.wav`;

  const { error: uploadError } = await supabaseServer.storage
    .from(MEDIA_BUCKET)
    .upload(path, bytes, { contentType: "audio/wav", upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrl } = supabaseServer.storage.from(MEDIA_BUCKET).getPublicUrl(path);

  const { data, error } = await supabaseServer
    .from("outputs")
    .update({ music_url: publicUrl.publicUrl })
    .eq("id", outputId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ output: data });
}
