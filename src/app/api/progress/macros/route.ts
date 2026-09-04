import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, isDbReady } from "@/lib/db";
import { resolveUserIdFromToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function resolveUserId(request: Request | undefined, bodyUserId?: string): Promise<string | null> {
  // 1) The session cookie is the authoritative source. It holds a
  //    "userId.role.signature" token — parse it to recover the real user id.
  try {
    const cookieStore = await cookies();
    const sessionVal = cookieStore.get("session")?.value;
    if (sessionVal && sessionVal.trim().length > 0) {
      const userId = await resolveUserIdFromToken(sessionVal);
      if (userId) return userId;
    }
  } catch { /* cookies unavailable */ }

  if (request) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(/session=([^;]+)/);
      if (match && match[1].trim().length > 0) {
        const userId = await resolveUserIdFromToken(match[1]);
        if (userId) return userId;
      }
    }
  }

  // 2) Fallback to the body-provided id (development / sessionless clients).
  if (bodyUserId && typeof bodyUserId === "string" && bodyUserId.trim().length > 0) {
    return bodyUserId.trim();
  }

  return null;
}

async function validateUser(userId: string): Promise<boolean> {
  if (!isDbReady()) return false;
  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
    return user !== null;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    if (!isDbReady()) {
      return NextResponse.json({ success: false, message: "Database unavailable." }, { status: 503 });
    }

    const userId = await resolveUserId(request);
    if (!userId) {
      return NextResponse.json({ success: false, data: { calories: 0, protein: 0, carbs: 0, fat: 0 }, message: "Unauthorized. No session found." }, { status: 401 });
    }

    if (!(await validateUser(userId))) {
      return NextResponse.json({ success: false, data: { calories: 0, protein: 0, carbs: 0, fat: 0 }, message: "User session invalid or user not found." }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const record = await db.dailyMacros.findFirst({
      where: {
        userId,
        date: { gte: today, lt: tomorrow },
      },
    });

    return NextResponse.json({
      success: true,
      data: record || { calories: 0, protein: 0, carbs: 0, fat: 0 },
    });
  } catch (error) {
    console.error("[MACROS_GET]", error);
    const msg = error instanceof Error ? error.message : "Server error.";
    return NextResponse.json({ success: false, data: { calories: 0, protein: 0, carbs: 0, fat: 0 }, message: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isDbReady()) {
      return NextResponse.json({ success: false, message: "Database unavailable. Please try again later." }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));

    const userId = await resolveUserId(request, body.userId);
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized. No session found." }, { status: 401 });
    }

    if (!(await validateUser(userId))) {
      return NextResponse.json({ success: false, message: "User session invalid or user not found." }, { status: 401 });
    }

    const calories = Math.max(0, parseFloat(String(body.calories)) || 0);
    const protein = Math.max(0, parseFloat(String(body.protein)) || 0);
    const carbs = Math.max(0, parseFloat(String(body.carbs)) || 0);
    const fat = Math.max(0, parseFloat(String(body.fat)) || 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existing = await db.dailyMacros.findFirst({
      where: {
        userId,
        date: { gte: today, lt: tomorrow },
      },
    });

    let record;
    if (existing) {
      record = await db.dailyMacros.update({
        where: { id: existing.id },
        data: { calories, protein, carbs, fat },
      });
    } else {
      record = await db.dailyMacros.create({
        data: { userId, calories, protein, carbs, fat },
      });
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error("[MACROS_POST]", error);
    const msg = error instanceof Error ? error.message : "Server error.";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
