import { NextResponse } from "next/server";
import { db, isDbReady } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiError } from "@/lib/apiError";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isDbReady()) {
      return NextResponse.json({ success: false, message: "Database unavailable." }, { status: 503 });
    }

    const user = await requireAuth();

    const records = await db.weightHistory.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
      take: 90,
    });

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    return apiError(error, "WEIGHT_HISTORY_GET", { data: [] });
  }
}

export async function POST(request: Request) {
  try {
    if (!isDbReady()) {
      return NextResponse.json({ success: false, message: "Database unavailable." }, { status: 503 });
    }

    // The user id ALWAYS comes from the authenticated session — never from the
    // client body — so one member cannot read or write another member's data.
    const user = await requireAuth();

    const body = await request.json().catch(() => ({}));

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

    const record = await db.weightHistory.upsert({
      where: { userId_date: { userId: user.id, date: logDate } },
      update: { weight },
      create: { userId: user.id, weight, date: logDate },
    });

    await db.user.update({ where: { id: user.id }, data: { weight } });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    return apiError(error, "WEIGHT_HISTORY_POST");
  }
}