"use client";

import { createClient } from "@supabase/supabase-js";

export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DEVICE_ID_KEY = "stimusonic_device_id";

/** Anonymous identity for users who never sign in — lets us key rows without auth. */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/** Sends a passwordless sign-in link. Signing in is always optional — device_id keeps working regardless. */
export async function sendMagicLink(email: string) {
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
  return supabaseBrowser.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabaseBrowser.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function getCurrentUserEmail(): Promise<string | null> {
  const { data } = await supabaseBrowser.auth.getUser();
  return data.user?.email ?? null;
}

export async function signOut() {
  await supabaseBrowser.auth.signOut();
}
