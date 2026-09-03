"use client";

import { useEffect, useRef } from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmClasses =
    variant === "danger"
      ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20"
      : "bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20";

  const glowBorder =
    variant === "danger"
      ? "border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.08)]"
      : "border-amber-500/20 shadow-[0_0_40px_rgba(245,158,11,0.08)]";

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={`relative z-10 w-full max-w-sm rounded-2xl bg-[#0b0b0e] border ${glowBorder} p-6 space-y-4 animate-fadeIn`}
      >
        {/* Icon */}
        <div className="flex justify-center">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              variant === "danger"
                ? "bg-red-500/10 border border-red-500/20"
                : "bg-amber-500/10 border border-amber-500/20"
            }`}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={
                variant === "danger" ? "text-red-400" : "text-amber-400"
              }
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-1">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            {title}
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">{message}</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-center pt-1">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-400 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all ${confirmClasses}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
