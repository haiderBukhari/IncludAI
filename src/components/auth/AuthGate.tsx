"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { getDeviceId } from "@/lib/supabase/client";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/profile?deviceId=${getDeviceId()}`)
      .then((res) => res.json())
      .then((data) => setRegistered(Boolean(data.displayName && data.email)))
      .catch(() => setRegistered(false))
      .finally(() => setChecking(false));
  }, []);

  const submit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      setError("Both fields are needed to continue.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: getDeviceId(), displayName: trimmedName, email: trimmedEmail }),
      });
      if (!res.ok) throw new Error("save failed");
      setRegistered(true);
    } catch {
      setError("Couldn't save that — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (checking) return null;

  if (!registered) {
    return (
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center text-center gap-7 max-w-sm w-full"
        >
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-full bg-accent-warm-soft" />
            <div className="absolute inset-4 rounded-full bg-ink" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl tracking-[-0.01em]">Welcome to StimuSonic</h1>
            <p className="text-ink-soft text-[0.9375rem] leading-relaxed">
              Just your name and email, once — so your dashboard and studio always know it&apos;s you.
              No password, no verification email to click.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-[0.875rem] border border-line bg-paper-raised px-4 py-3 text-base outline-none focus:border-ink-faint"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="your@email.com"
              className="w-full rounded-[0.875rem] border border-line bg-paper-raised px-4 py-3 text-base outline-none focus:border-ink-faint"
            />
            {error && <p className="text-sm text-accent-warm">{error}</p>}
            <Button size="lg" onClick={submit} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Continue"}
            </Button>
          </div>

          <p className="text-xs text-ink-faint">
            This just labels your device — nothing is emailed to you.
          </p>
        </motion.div>
      </main>
    );
  }

  return <>{children}</>;
}
