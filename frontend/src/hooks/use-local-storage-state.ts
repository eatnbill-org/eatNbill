import * as React from "react";

/**
 * Small localStorage-backed state hook with safe JSON parsing.
 * Keeps UI metadata persistent without touching the demo-store schema.
 */
export function useLocalStorageState<T>(key: string, initialValue: T) {
  const [value, setValue] = React.useState<T>(() => {
    const raw = localStorage.getItem(key);
    if (!raw) return initialValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return initialValue;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota / serialization errors
    }
  }, [key, value]);

  return [value, setValue] as const;
}
