"use client";

import { useEffect, useState } from "react";
import { sendMagicLink, getCurrentUserEmail, signOut } from "@/lib/supabase/client";

type State = "idle" | "checking" | "signed-in" | "sending" | "sent" | "error";

export function SignInWidget({ onSignedOut }: { onSignedOut?: () => void }) {
  const [state, setState] = useState<State>("checking");
  const [email, setEmail] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getCurrentUserEmail().then((e) => {
      setUserEmail(e);
      setState(e ? "signed-in" : "idle");
    });
  }, []);

  const submit = async () => {
    if (!email.trim()) return;
    setState("sending");
    const { error } = await sendMagicLink(email.trim());
    setState(error ? "error" : "sent");
  };

  const handleSignOut = async () => {
    await signOut();
    setUserEmail(null);
    setState("idle");
    onSignedOut?.();
  };

  if (state === "checking") return null;

  if (state === "signed-in") {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-ink-soft">Signed in as {userEmail}</span>
        <button onClick={handleSignOut} className="text-ink-faint hover:text-ink transition-colors">
          Sign out
        </button>
      </div>
    );
  }

  if (state === "sent") {
    return <p className="text-sm text-accent-calm">Check your email for a sign-in link.</p>;
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="text-sm text-ink-soft hover:text-ink transition-colors underline underline-offset-2"
      >
        Save this permanently — sign in with email
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="rounded-[0.75rem] border border-line bg-paper px-3 py-1.5 text-sm outline-none focus:border-ink-faint"
      />
      <button
        onClick={submit}
        disabled={state === "sending" || !email.trim()}
        className="text-sm text-ink font-medium hover:text-accent-calm transition-colors disabled:opacity-40"
      >
        {state === "sending" ? "Sending..." : "Send link"}
      </button>
      {state === "error" && <span className="text-xs text-accent-warm">Couldn&apos;t send that</span>}
    </div>
  );
}
