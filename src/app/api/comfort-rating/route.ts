import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

interface ComfortRatingBody {
  deviceId: string;
  sessionId?: string | null;
  stage: "before" | "after";
  rating: number;
}

export async function POST(req: NextRequest) {
  let body: ComfortRatingBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { deviceId, sessionId, stage, rating } = body;
  if (!deviceId || !["before", "after"].includes(stage) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "deviceId, stage ('before'|'after'), and rating (1-5) are required" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("comfort_ratings")
    .insert({ device_id: deviceId, session_id: sessionId ?? null, stage, rating })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rating: data });
}
