"use client";

import type { CalibrationBaseline } from "./features";

const BASELINE_KEY = "stimusonic_baseline";
const CONSENT_KEY = "stimusonic_consent_ok";

export function getStoredBaseline(): CalibrationBaseline | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(BASELINE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredBaseline(baseline: CalibrationBaseline) {
  localStorage.setItem(BASELINE_KEY, JSON.stringify(baseline));
}

export function hasAcceptedConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CONSENT_KEY) === "1";
}

export function markConsentAccepted() {
  localStorage.setItem(CONSENT_KEY, "1");
}
