import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  let userId: string | null = null;
  if (token) {
    const { data } = await supabaseServer.auth.getUser(token);
    userId = data.user?.id ?? null;
  }

  if (!deviceId && !userId) {
    return NextResponse.json({ error: "deviceId query param or a valid session is required" }, { status: 400 });
  }

  let query = supabaseServer
    .from("sessions")
    .select(
      "id, started_at, feature_summary, outputs(id, image_url, caption_text, tts_audio_url, music_url, voice_note_text, export_url, created_at)"
    )
    .order("started_at", { ascending: false })
    .limit(50);

  // Signed-in users see everything ever linked to their account, plus anything
  // still only on this device (covers the moment right after linking).
  if (userId && deviceId) {
    query = query.or(`user_id.eq.${userId},device_id.eq.${deviceId}`);
  } else if (userId) {
    query = query.eq("user_id", userId);
  } else {
    query = query.eq("device_id", deviceId as string);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: data });
}
