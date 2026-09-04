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
      return NextResponse.json({ success: false, data: [], message: "Unauthorized. No session found." }, { status: 401 });
    }

    if (!(await validateUser(userId))) {
      return NextResponse.json({ success: false, data: [], message: "User session invalid or user not found." }, { status: 401 });
    }

    const records = await db.weightHistory.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      take: 90,
    });

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error("[WEIGHT_HISTORY_GET]", error);
    const msg = error instanceof Error ? error.message : "Server error.";
    return NextResponse.json({ success: false, data: [], message: msg }, { status: 500 });
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

    if (body.weight == null || body.weight === "" || body.weight === undefined) {
      return NextResponse.json({ success: false, message: "Weight is required." }, { status: 400 });
    }

    const rawWeight = typeof body.weight === "string" ? body.weight.trim() : String(body.weight);
    const weight = parseFloat(rawWeight);

    if (isNaN(weight) || weight <= 0 || weight > 500) {
      return NextResponse.json({ success: false, message: "Invalid weight. Please enter a value between 0.1 and 500 kg." }, { status: 400 });
    }

    let logDate: Date;
    if (body.date && typeof body.date === "string") {
      const parsed = new Date(body.date);
      if (!isNaN(parsed.getTime())) {
        logDate = new Date(parsed);
        logDate.setHours(0, 0, 0, 0);
      } else {
        logDate = new Date();
        logDate.setHours(0, 0, 0, 0);
      }
    } else {
      logDate = new Date();
      logDate.setHours(0, 0, 0, 0);
    }

    const dayEnd = new Date(logDate);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const existing = await db.weightHistory.findFirst({
      where: {
        userId,
        date: { gte: logDate, lt: dayEnd },
      },
    });

    let record;
    if (existing) {
      record = await db.weightHistory.update({
        where: { id: existing.id },
        data: { weight },
      });
    } else {
      record = await db.weightHistory.create({
        data: { userId, weight, date: logDate },
      });
    }

    await db.user.update({ where: { id: userId }, data: { weight } });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error("[WEIGHT_HISTORY_POST]", error);
    const msg = error instanceof Error ? error.message : "Failed to log weight.";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
