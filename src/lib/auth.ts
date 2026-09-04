import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const SESSION_COOKIE = "session";
const BCRYPT_ROUNDS = 10;
const HMAC_SECRET = process.env.SESSION_SECRET || "meridian-dev-fallback-secret-change-in-production";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

async function hmacSign(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(HMAC_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(
  userId: string,
  role: string
): Promise<string> {
  const signature = await hmacSign(`${userId}.${role}`);
  return `${userId}.${role}.${signature}`;
}

export async function parseSessionToken(
  token: string
): Promise<{ userId: string; role: string } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [userId, role, signature] = parts;
  const expectedSig = await hmacSign(`${userId}.${role}`);
  if (signature !== expectedSig) return null;

  return { userId, role };
}

export async function setSessionCookie(userId: string, role: string) {
  const token = await createSessionToken(userId, role);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Extracts the real user id from a session token string ("userId.role.signature").
 * Returns the userId only when the HMAC signature is valid; otherwise returns null.
 */
export async function resolveUserIdFromToken(
  token: string | null | undefined
): Promise<string | null> {
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return null;
  }
  const parsed = await parseSessionToken(token.trim());
  return parsed ? parsed.userId : null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const parsed = await parseSessionToken(token);
    if (!parsed) return null;

    const user = await db.user.findUnique({
      where: { id: parsed.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    return user as SessionUser | null;
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireRole(...roles: string[]): Promise<SessionUser> {
  const user = await requireAuth();
  const normalizedRole = user.role.toLowerCase();
  if (!roles.map((r) => r.toLowerCase()).includes(normalizedRole)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export function unauthorizedResponse() {
  return Response.json(
    { success: false, message: "Unauthorized. Please log in." },
    { status: 401 }
  );
}

export function forbiddenResponse() {
  return Response.json(
    { success: false, message: "Forbidden. Insufficient permissions." },
    { status: 403 }
  );
}
