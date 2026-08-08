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

  const sessionsQuery = supabaseServer
    .from("sessions")
    .select("id, feature_summary, outputs(id)");
  const ratingsQuery = supabaseServer
    .from("comfort_ratings")
    .select("stage, rating, created_at")
    .order("created_at", { ascending: true });

  if (userId && deviceId) {
    sessionsQuery.or(`user_id.eq.${userId},device_id.eq.${deviceId}`);
    ratingsQuery.or(`user_id.eq.${userId},device_id.eq.${deviceId}`);
  } else if (userId) {
    sessionsQuery.eq("user_id", userId);
    ratingsQuery.eq("user_id", userId);
  } else {
    sessionsQuery.eq("device_id", deviceId as string);
    ratingsQuery.eq("device_id", deviceId as string);
  }

  const [{ data: sessions, error: sessionsError }, { data: ratings, error: ratingsError }] =
    await Promise.all([sessionsQuery, ratingsQuery]);

  if (sessionsError || ratingsError) {
    return NextResponse.json(
      { error: sessionsError?.message ?? ratingsError?.message },
      { status: 500 }
    );
  }

  const totalSessions = sessions?.length ?? 0;
  const totalCaptures =
    sessions?.reduce((sum, s) => sum + (Array.isArray(s.outputs) ? s.outputs.length : 0), 0) ?? 0;

  const classificationCounts: Record<string, number> = {};
  for (const s of sessions ?? []) {
    const c = (s.feature_summary as { classification?: string } | null)?.classification;
    if (c) classificationCounts[c] = (classificationCounts[c] ?? 0) + 1;
  }

  const before = (ratings ?? []).filter((r) => r.stage === "before").map((r) => r.rating);
  const after = (ratings ?? []).filter((r) => r.stage === "after").map((r) => r.rating);
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const avgBefore = avg(before);
  const avgAfter = avg(after);

  return NextResponse.json({
    totalSessions,
    totalCaptures,
    classificationCounts,
    comfort: {
      avgBefore,
      avgAfter,
      delta: avgBefore !== null && avgAfter !== null ? avgAfter - avgBefore : null,
      sampleCount: Math.min(before.length, after.length),
      recent: (ratings ?? []).slice(-10),
    },
  });
}
