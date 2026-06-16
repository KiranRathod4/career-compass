import { useEffect, useState } from "react";

const STORAGE_KEY = "taiyaar_reduce_motion";

function getInitialReduceMotion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === "true";
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function useReduceMotion() {
  const [reduceMotion, setState] = useState(getInitialReduceMotion);
  const [systemPrefersReduced, setSystemPrefersReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => {
      setSystemPrefersReduced(mq.matches);
      if (localStorage.getItem(STORAGE_KEY) === null) {
        setState(mq.matches);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setReduceMotion = (value: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // storage may be unavailable in private mode
    }
    setState(value);
  };

  return { reduceMotion, setReduceMotion, systemPrefersReduced };
}
