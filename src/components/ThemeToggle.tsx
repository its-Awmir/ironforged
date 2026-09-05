"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const THEME_EVENT = "themechange";

type Theme = "dark" | "light";

function getTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

function subscribe(listener: () => void): () => void {
  window.addEventListener("storage", listener);
  window.addEventListener(THEME_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(THEME_EVENT, listener);
  };
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "dark");

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.classList.toggle("light", next === "light");
    try {
      localStorage.setItem("theme", next);
    } catch { /* storage unavailable */ }
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center justify-center p-2 rounded-xl border border-border bg-bg-panel/80 text-slate-muted hover:text-verdigris-light hover:border-verdigris/40 transition-colors"
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}