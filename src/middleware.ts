import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "session";
const HMAC_SECRET = process.env.SESSION_SECRET || "meridian-dev-fallback-secret-change-in-production";

const ROLE_MAP: Record<string, string[]> = {
  "/admin-panel": ["ADMIN"],
  "/coach-dashboard": ["COACH", "ADMIN"],
  "/dashboard": ["MEMBER", "COACH", "ADMIN"],
};

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

async function parseSessionToken(
  token: string
): Promise<{ userId: string; role: string } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [userId, role, signature] = parts;
  const expectedSig = await hmacSign(`${userId}.${role}`);
  if (signature !== expectedSig) return null;

  return { userId, role };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;

  const isProtected = Object.keys(ROLE_MAP).some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (!isProtected) return NextResponse.next();

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const session = await parseSessionToken(sessionCookie);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  const matchedPrefix = Object.keys(ROLE_MAP).find(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (matchedPrefix) {
    const allowedRoles = ROLE_MAP[matchedPrefix];
    if (!allowedRoles.includes(session.role)) {
      const dashboardUrl = new URL("/dashboard", request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin-panel/:path*", "/coach-dashboard/:path*", "/dashboard/:path*"],
};
