"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { getDeviceId, getAccessToken } from "@/lib/supabase/client";

interface DashboardData {
  totalSessions: number;
  totalCaptures: number;
  classificationCounts: Record<string, number>;
  comfort: {
    avgBefore: number | null;
    avgAfter: number | null;
    delta: number | null;
    sampleCount: number;
  };
}

const CLASS_LABELS: Record<string, string> = {
  still: "Still",
  "slow-rock": "Slow & steady",
  "steady-wave": "Flowing",
  bouncy: "Bright & bouncy",
  jerky: "Quick & sharp",
};

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    (async () => {
      const deviceId = getDeviceId();
      const token = await getAccessToken();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        const res = await fetch(`/api/dashboard?deviceId=${deviceId}`, { headers });
        const json = await res.json();
        if (!json.error) setData(json);
      } catch {
        // Dashboard is a bonus view — fail silently, gallery below still works.
      }
    })();
  }, []);

  if (!data || data.totalSessions === 0) return null;

  const maxClassCount = Math.max(1, ...Object.values(data.classificationCounts));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card className="p-4 flex flex-col gap-1">
        <span className="text-2xl font-display">{data.totalSessions}</span>
        <span className="text-xs text-ink-faint">sessions</span>
      </Card>
      <Card className="p-4 flex flex-col gap-1">
        <span className="text-2xl font-display">{data.totalCaptures}</span>
        <span className="text-xs text-ink-faint">pieces made</span>
      </Card>
      <Card className="p-4 flex flex-col gap-1">
        <span className="text-2xl font-display">
          {data.comfort.delta !== null
            ? `${data.comfort.delta > 0 ? "+" : ""}${data.comfort.delta.toFixed(1)}`
            : "—"}
        </span>
        <span className="text-xs text-ink-faint">
          comfort shift {data.comfort.sampleCount > 0 ? `(${data.comfort.sampleCount})` : ""}
        </span>
      </Card>
      <Card className="p-4 flex flex-col gap-2 col-span-2 sm:col-span-1">
        <span className="text-xs text-ink-faint">movement mix</span>
        <div className="flex flex-col gap-1">
          {Object.entries(data.classificationCounts).map(([cls, count]) => (
            <div key={cls} className="flex items-center gap-2">
              <span className="text-[0.6875rem] text-ink-soft w-20 shrink-0 truncate">
                {CLASS_LABELS[cls] ?? cls}
              </span>
              <div className="h-1.5 flex-1 bg-line rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-calm rounded-full"
                  style={{ width: `${(count / maxClassCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
