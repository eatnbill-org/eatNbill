import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "eatnbill:dark-mode";

type DarkModePreference = "light" | "dark" | "system";

function getSystemPreference(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getStoredPreference(): DarkModePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as DarkModePreference | null;
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch { /* ignore */ }
  return "system";
}

function applyDark(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function useDarkMode() {
  const [preference, setPreference] = useState<DarkModePreference>(getStoredPreference);
  const [isDark, setIsDark] = useState(() => {
    const pref = getStoredPreference();
    if (pref === "dark") return true;
    if (pref === "light") return false;
    return getSystemPreference();
  });

  // Apply on mount and when preference changes
  useEffect(() => {
    let dark: boolean;
    if (preference === "dark") dark = true;
    else if (preference === "light") dark = false;
    else dark = getSystemPreference();
    setIsDark(dark);
    applyDark(dark);
  }, [preference]);

  // Listen to system preference changes when in "system" mode
  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
      applyDark(e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  const setDarkMode = useCallback((pref: DarkModePreference) => {
    try { localStorage.setItem(STORAGE_KEY, pref); } catch { /* ignore */ }
    setPreference(pref);
  }, []);

  const toggle = useCallback(() => {
    const next = isDark ? "light" : "dark";
    setDarkMode(next);
  }, [isDark, setDarkMode]);

  return { isDark, preference, setDarkMode, toggle };
}
