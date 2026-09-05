"use client";

import { useSyncExternalStore } from "react";

export interface LocalUser {
  id: string;
  name: string;
  email: string;
  role: string;
  goal?: string;
}

export const LS_USER_KEY = "currentUser";
export const LS_LOGIN_KEY = "isLoggedIn";

const LS_EVENT = "local-user-change";

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  window.addEventListener(LS_EVENT, listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
    window.removeEventListener(LS_EVENT, listener);
  };
}

let cachedUserRaw: string | null = null;
let cachedUser: LocalUser | null = null;

export function readLocalUser(): LocalUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_USER_KEY);
    if (raw === cachedUserRaw) return cachedUser;
    cachedUserRaw = raw;
    cachedUser = raw ? (JSON.parse(raw) as LocalUser) : null;
    return cachedUser;
  } catch {
    return null;
  }
}

export function readLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(LS_LOGIN_KEY) === "true";
  } catch {
    return false;
  }
}

function readHydrated(): boolean {
  return typeof window !== "undefined";
}

/**
 * Writes the current user + login flag to localStorage and notifies every
 * subscriber so all components reading the store stay in sync.
 */
export function setLocalUser(user: LocalUser | null) {
  if (user) {
    localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
    localStorage.setItem(LS_LOGIN_KEY, "true");
  } else {
    localStorage.removeItem(LS_USER_KEY);
    localStorage.removeItem(LS_LOGIN_KEY);
  }
  notify();
}

/**
 * React 19 + React Compiler compliant access to the localStorage-backed
 * session. `getServerSnapshot` (null/false) makes SSR + hydration render the
 * logged-out shell; the real client snapshot is applied right after hydration,
 * which keeps server/client HTML identical (no hydration mismatch).
 */
export function useLocalUser() {
  const user = useSyncExternalStore(subscribe, readLocalUser, () => null);
  const isLoggedIn = useSyncExternalStore(subscribe, readLoggedIn, () => false);
  const isHydrated = useSyncExternalStore(subscribe, readHydrated, () => false);
  return { user, isLoggedIn, isHydrated };
}