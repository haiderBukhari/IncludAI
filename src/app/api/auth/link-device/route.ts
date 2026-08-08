import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const LINKABLE_TABLES = ["sessions", "calibrations", "mappings", "comfort_ratings"] as const;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseServer.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }
  const userId = userData.user.id;

  let body: { deviceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const deviceId = body.deviceId;
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
  }

  const results: Record<string, number> = {};
  for (const table of LINKABLE_TABLES) {
    const { data, error } = await supabaseServer
      .from(table)
      .update({ user_id: userId })
      .eq("device_id", deviceId)
      .is("user_id", null)
      .select("id");

    if (error) {
      console.error(`Failed to link ${table}:`, error.message);
      continue;
    }
    results[table] = data?.length ?? 0;
  }

  return NextResponse.json({ linked: results, userId });
}
