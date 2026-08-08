"use client";

import { useEffect, useState } from "react";

const KEY = "stimusonic_sensitivity";
const DEFAULT = 1;

export function useSensitivity() {
  const [sensitivity, setSensitivityState] = useState(DEFAULT);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored) setSensitivityState(parseFloat(stored));
  }, []);

  const setSensitivity = (value: number) => {
    setSensitivityState(value);
    localStorage.setItem(KEY, String(value));
  };

  return { sensitivity, setSensitivity };
}
