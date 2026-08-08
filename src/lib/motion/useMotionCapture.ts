"use client";

import { useCallback, useRef, useState } from "react";
import type { MotionSample } from "./features";

type PermissionState = "unknown" | "unsupported" | "needed" | "granted" | "denied";

interface DeviceMotionEventWithPermission {
  requestPermission?: () => Promise<"granted" | "denied">;
}

const WINDOW_MS = 3000;

export function useMotionCapture() {
  const [permission, setPermission] = useState<PermissionState>("unknown");
  const bufferRef = useRef<MotionSample[]>([]);
  const listenerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  // Running gravity estimate, only used as a fallback when the browser doesn't
  // give us gravity-excluded acceleration directly (see handleEvent below).
  const gravityRef = useRef({ x: 0, y: 0, z: 0 });

  const handleEvent = useCallback((e: DeviceMotionEvent) => {
    // `acceleration` already excludes gravity — strongly prefer it, since
    // `accelerationIncludingGravity` carries a constant ~9.8 m/s^2 offset that
    // swamps real stim motion and makes peak/tempo detection unreliable.
    const clean = e.acceleration;
    const raw = e.accelerationIncludingGravity;

    let x: number, y: number, z: number;
    if (clean && clean.x !== null) {
      x = clean.x ?? 0;
      y = clean.y ?? 0;
      z = clean.z ?? 0;
    } else if (raw && raw.x !== null) {
      // High-pass via a slow exponential gravity estimate, then subtract it.
      const g = gravityRef.current;
      const alpha = 0.08;
      g.x = g.x + alpha * ((raw.x ?? 0) - g.x);
      g.y = g.y + alpha * ((raw.y ?? 0) - g.y);
      g.z = g.z + alpha * ((raw.z ?? 0) - g.z);
      x = (raw.x ?? 0) - g.x;
      y = (raw.y ?? 0) - g.y;
      z = (raw.z ?? 0) - g.z;
    } else {
      return;
    }

    const now = performance.now();
    bufferRef.current.push({ t: now, x, y, z });
    bufferRef.current = bufferRef.current.filter((s) => now - s.t <= WINDOW_MS);
  }, []);

  const start = useCallback(() => {
    if (listenerRef.current) return;
    listenerRef.current = handleEvent;
    window.addEventListener("devicemotion", handleEvent);

    // Some desktop browsers (notably Chrome/Safari on Mac) expose
    // DeviceMotionEvent and grant "permission" happily, but never actually
    // fire events with real (non-null) acceleration data — there's no
    // accelerometer to read. That's indistinguishable from "unsupported"
    // from the user's side, so if nothing real has landed in the buffer
    // shortly after we start listening, silently drop into tap-fallback
    // mode instead of leaving the user stuck capturing all-zero "still"
    // data forever.
    setTimeout(() => {
      if (bufferRef.current.length === 0) {
        setIsFallback(true);
      }
    }, 1200);
  }, [handleEvent]);

  const stop = useCallback(() => {
    if (listenerRef.current) {
      window.removeEventListener("devicemotion", listenerRef.current);
      listenerRef.current = null;
    }
  }, []);

  /** Must be called directly inside a user click/tap handler on iOS. */
  const requestPermission = useCallback(async () => {
    const DME = window.DeviceMotionEvent as unknown as DeviceMotionEventWithPermission &
      typeof DeviceMotionEvent;

    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) {
      setPermission("unsupported");
      setIsFallback(true);
      return "unsupported" as const;
    }

    if (typeof DME.requestPermission === "function") {
      try {
        const result = await DME.requestPermission();
        setPermission(result === "granted" ? "granted" : "denied");
        if (result === "granted") start();
        return result;
      } catch {
        setPermission("denied");
        return "denied" as const;
      }
    }

    // Non-iOS: no explicit permission gate needed.
    setPermission("granted");
    start();
    return "granted" as const;
  }, [start]);

  /** Fallback path for devices/browsers without motion sensors: synthesize samples from taps. */
  const recordTap = useCallback(() => {
    const now = performance.now();
    const jitter = () => (Math.random() - 0.5) * 2;
    bufferRef.current.push({ t: now, x: 6 + jitter(), y: jitter(), z: jitter() });
    bufferRef.current = bufferRef.current.filter((s) => now - s.t <= WINDOW_MS);
  }, []);

  const getBuffer = useCallback(() => [...bufferRef.current], []);
  const clearBuffer = useCallback(() => {
    bufferRef.current = [];
  }, []);

  return {
    permission,
    isFallback,
    setIsFallback,
    requestPermission,
    start,
    stop,
    recordTap,
    getBuffer,
    clearBuffer,
  };
}
