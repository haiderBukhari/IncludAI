import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

async function resolveUserId(req: NextRequest): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await supabaseServer.auth.getUser(token);
  return data.user?.id ?? null;
}

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  const userId = await resolveUserId(req);
  if (!deviceId && !userId) {
    return NextResponse.json({ error: "deviceId query param or a valid session is required" }, { status: 400 });
  }

  let query = supabaseServer.from("profiles").select("display_name, email");
  query = userId ? query.eq("user_id", userId) : query.eq("device_id", deviceId as string);

  const { data, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    displayName: data?.display_name ?? null,
    email: data?.email ?? null,
  });
}

export async function POST(req: NextRequest) {
  let body: { deviceId?: string; displayName?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { deviceId, displayName, email } = body;
  if (!deviceId || !displayName?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "deviceId, displayName, and email are required" }, { status: 400 });
  }

  const userId = await resolveUserId(req);

  const { data, error } = await supabaseServer
    .from("profiles")
    .upsert(
      {
        device_id: deviceId,
        user_id: userId,
        display_name: displayName.trim().slice(0, 40),
        email: email.trim().slice(0, 200),
        updated_at: new Date().toISOString(),
      },
      { onConflict: userId ? "user_id" : "device_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
