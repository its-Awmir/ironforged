"use client";

import { useEffect, useRef, useState } from "react";

interface EditRoleModalProps {
  open: boolean;
  userName: string;
  currentRole: string;
  onConfirm: (newRole: string) => void;
  onCancel: () => void;
}

const ROLES = ["Member", "Coach", "Admin"];

export default function EditRoleModal({
  open,
  userName,
  currentRole,
  onConfirm,
  onCancel,
}: EditRoleModalProps) {
  const [selected, setSelected] = useState(currentRole);

  useEffect(() => {
    setSelected(currentRole);
  }, [currentRole, open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-[#0b0b0e] border border-zinc-800 p-6 space-y-5 animate-fadeIn">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-500/10 border border-blue-500/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-1">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            Edit Role
          </h3>
          <p className="text-xs text-zinc-400">
            Change role for <span className="text-white font-bold">{userName}</span>
          </p>
        </div>

        {/* Role buttons */}
        <div className="flex gap-2 justify-center">
          {ROLES.map((role) => (
            <button
              key={role}
              onClick={() => setSelected(role.toLowerCase())}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                selected === role.toLowerCase()
                  ? role === "Admin"
                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                    : role === "Coach"
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:text-zinc-300"
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-center pt-1">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selected)}
            className="px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 transition-all"
          >
            Save Role
          </button>
        </div>
      </div>
    </div>
  );
}
