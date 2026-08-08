"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDeviceId } from "@/lib/supabase/client";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const deviceId = getDeviceId();
    fetch(`/api/sessions?deviceId=${deviceId}`)
      .then((res) => res.json())
      .then((data) => {
        const hasHistory = Array.isArray(data.sessions) && data.sessions.length > 0;
        router.replace(hasHistory ? "/dashboard" : "/studio");
      })
      .catch(() => router.replace("/studio"));
  }, [router]);

  return null;
}
