import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { MotionFeatures } from "@/lib/motion/features";

interface SaveMappingBody {
  deviceId: string;
  classification: MotionFeatures["classification"];
  label: string;
  promptStyle: string;
}

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
    .from("mappings")
    .select("id, label, classification, prompt_style, created_at")
    .order("created_at", { ascending: false });

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

  return NextResponse.json({ mappings: data });
}

export async function POST(req: NextRequest) {
  let body: SaveMappingBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { deviceId, classification, label, promptStyle } = body;
  if (!deviceId || !classification || !label || !promptStyle) {
    return NextResponse.json(
      { error: "deviceId, classification, label, and promptStyle are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseServer
    .from("mappings")
    .upsert(
      {
        device_id: deviceId,
        classification,
        label,
        prompt_style: promptStyle,
        feature_range: { classification },
      },
      { onConflict: "device_id,classification" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ mapping: data });
}
