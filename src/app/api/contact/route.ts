import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Contact submissions are unauthenticated and public-facing, so they are
// stored with their own MessageType (CONTACT) that is excluded from the
// public/private message queries and only readable through the admin-only
// `?type=contact` query on /api/messages. They never carry a fromId (no user
// session) and never appear on any member/coach message board.

const CONTACT_MAX_SUBMISSIONS_PER_HOUR = 5;
const CONTACT_MAX_MESSAGE_LENGTH = 2000;
const CONTACT_MAX_NAME_LENGTH = 120;
const CONTACT_MAX_EMAIL_LENGTH = 254;
const RATE_WINDOW_MS = 60 * 60 * 1000;

// Simple per-process, in-memory rate limiter keyed by client IP. It resets on
// server restart and is per-instance — enough for this local project; swap for
// a shared store (Redis/DB) before multi-instance production deployment.
const submissionTimes = new Map<string, number[]>();

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const withinWindow = (submissionTimes.get(ip) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS
  );
  if (withinWindow.length >= CONTACT_MAX_SUBMISSIONS_PER_HOUR) {
    submissionTimes.set(ip, withinWindow);
    return true;
  }
  withinWindow.push(now);
  submissionTimes.set(ip, withinWindow);
  return false;
}

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { success: false, message: "Too many messages. Please try again later." },
        { status: 429 }
      );
    }

    const { name, email, message } = await request.json().catch(() => ({}));

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, message: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim();
    const trimmedMessage = String(message).trim();

    if (trimmedName.length > CONTACT_MAX_NAME_LENGTH) {
      return NextResponse.json(
        { success: false, message: `Name must be ${CONTACT_MAX_NAME_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }

    if (trimmedEmail.length > CONTACT_MAX_EMAIL_LENGTH) {
      return NextResponse.json(
        { success: false, message: `Email must be ${CONTACT_MAX_EMAIL_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }

    if (trimmedMessage.length > CONTACT_MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { success: false, message: `Message must be ${CONTACT_MAX_MESSAGE_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }

    await db.message.create({
      data: {
        content: `[Contact Form] ${trimmedMessage}`,
        type: "CONTACT",
        fromName: `${trimmedName} <${trimmedEmail}>`,
      },
    });

    return NextResponse.json(
      { success: true, message: "Message sent successfully." },
      { status: 201 }
    );
  } catch (error) {
    console.error("[CONTACT_POST_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}