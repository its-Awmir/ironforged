import { NextResponse } from "next/server";
import { db, isDbReady } from "@/lib/db";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth";

export async function GET() {
  try {
    if (!isDbReady()) {
      return NextResponse.json({ success: false, message: "Database unavailable." }, { status: 503 });
    }

    const user = await getSessionUser();
    if (!user) return unauthorizedResponse();

    const records = await db.attendance.findMany({
      where: { studentId: user.id, status: "PRESENT" },
      orderBy: { date: "desc" },
      select: { date: true },
    });

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    const sortedDates = records.map((r) => {
      const d = new Date(r.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    });

    const uniqueDates = [...new Set(sortedDates)].sort((a, b) => b - a);

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayMs = now.getTime();
    const oneDayMs = 86400000;

    if (uniqueDates.length > 0) {
      if (todayMs - uniqueDates[0] <= oneDayMs * 2) {
        tempStreak = 1;
        lastDate = new Date(uniqueDates[0]);

        for (let i = 1; i < uniqueDates.length; i++) {
          const diff = (new Date(uniqueDates[i - 1]).getTime() - uniqueDates[i]) / oneDayMs;
          if (diff <= 1.5) {
            tempStreak++;
          } else {
            break;
          }
        }
        currentStreak = tempStreak;
      }
    }

    tempStreak = 0;
    for (let i = 0; i < uniqueDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const diff = (new Date(uniqueDates[i - 1]).getTime() - uniqueDates[i]) / oneDayMs;
        if (diff <= 1.5) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    }

    await db.userStats.upsert({
      where: { userId: user.id },
      update: { currentStreak, longestStreak, lastAttendance: lastDate },
      create: { userId: user.id, currentStreak, longestStreak, lastAttendance: lastDate },
    });

    return NextResponse.json({
      success: true,
      data: { currentStreak, longestStreak, lastAttendance: lastDate?.toISOString() },
    });
  } catch (error) {
    console.error("[STREAK_GET]", error);
    const msg = error instanceof Error ? error.message : "Server error.";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
