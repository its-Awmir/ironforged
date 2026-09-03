"use client";

import { useState, useEffect, useCallback } from "react";

type ToastType = "success" | "error" | "warning";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

let globalId = 0;
const listeners: Array<(toast: Toast) => void> = [];

export function showToast(type: ToastType, message: string) {
  const toast: Toast = { id: ++globalId, type, message };
  listeners.forEach((fn) => fn(toast));
}

function SuccessIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: (id: number) => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDone(toast.id), 300);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onDone]);

  const config: Record<ToastType, { border: string; shadow: string; icon: React.ReactNode; bg: string; iconColor: string }> = {
    success: {
      border: "border-emerald-500/40",
      shadow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
      icon: <SuccessIcon />,
      bg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
    },
    error: {
      border: "border-red-500/40",
      shadow: "shadow-[0_0_20px_rgba(239,68,68,0.15)]",
      icon: <ErrorIcon />,
      bg: "bg-red-500/10",
      iconColor: "text-red-400",
    },
    warning: {
      border: "border-amber-500/40",
      shadow: "shadow-[0_0_20px_rgba(245,158,11,0.15)]",
      icon: <WarningIcon />,
      bg: "bg-amber-500/10",
      iconColor: "text-amber-400",
    },
  };

  const c = config[toast.type];

  return (
    <div
      className={`
        flex items-center gap-3 w-full max-w-sm px-4 py-3 rounded-xl
        bg-[#0f0f14]/95 backdrop-blur-xl border ${c.border} ${c.shadow}
        transition-all duration-300 ease-out
        ${exiting ? "opacity-0 translate-x-8 scale-95" : "opacity-100 translate-x-0 scale-100"}
      `}
    >
      <div className={`${c.bg} ${c.iconColor} p-1.5 rounded-lg`} aria-hidden="true">
        {c.icon}
      </div>
      <p className="text-xs font-semibold text-zinc-200 flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => { setExiting(true); setTimeout(() => onDone(toast.id), 300); }}
        aria-label="Dismiss notification"
        className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const handleNewToast = useCallback((toast: Toast) => {
    setToasts((prev) => [...prev, toast]);
  }, []);

  const handleDone = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    listeners.push(handleNewToast);
    return () => {
      const idx = listeners.indexOf(handleNewToast);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, [handleNewToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDone={handleDone} />
        </div>
      ))}
    </div>
  );
}
