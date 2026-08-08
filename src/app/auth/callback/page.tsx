"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabaseBrowser, getDeviceId } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"linking" | "error">("linking");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // supabase-js parses the magic-link tokens from the URL hash automatically.
      const { data } = await supabaseBrowser.auth.getSession();
      const session = data.session;

      if (!session) {
        if (!cancelled) setStatus("error");
        return;
      }

      try {
        await fetch("/api/auth/link-device", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ deviceId: getDeviceId() }),
        });
      } catch {
        // Non-fatal — the account still exists, linking can be retried later.
      }

      if (!cancelled) router.replace("/dashboard");
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <motion.div
          className="h-12 w-12 rounded-full border-2 border-line border-t-accent-warm"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        {status === "linking" && (
          <p className="text-ink-soft text-sm">Saving your progress...</p>
        )}
        {status === "error" && (
          <p className="text-accent-warm text-sm">
            That sign-in link didn&apos;t work — try sending a new one from the dashboard.
          </p>
        )}
      </motion.div>
    </main>
  );
}
