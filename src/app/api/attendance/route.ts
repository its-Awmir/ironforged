import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const date = searchParams.get("date");
    const role = user.role.toLowerCase();

    const where: Record<string, unknown> = {};

    if (role === "member") {
      where.studentId = user.id;
    } else if (role === "coach") {
      const coachClasses = await db.gymClass.findMany({
        where: { coachId: user.id },
        select: { id: true },
      });
      where.classId = { in: coachClasses.map((c) => c.id) };
    }

    if (classId && role !== "member") {
      where.classId = classId;
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    const attendance = await db.attendance.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, email: true } },
        gymClass: { select: { id: true, className: true } },
      },
      orderBy: { savedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: attendance });
  } catch (error) {
    console.error("[ATTENDANCE_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorizedResponse();

    const role = user.role.toLowerCase();
    if (role === "member") {
      return NextResponse.json(
        { success: false, message: "Forbidden. Members cannot mark attendance." },
        { status: 403 }
      );
    }

    const { classId, records } = (await request.json()) as {
      classId: string;
      records: { studentId: string; status: "Present" | "Absent" | "Late" }[];
    };

    if (!classId || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { success: false, message: "classId and records array are required." },
        { status: 400 }
      );
    }

    if (role === "coach") {
      const classRecord = await db.gymClass.findUnique({
        where: { id: classId },
        select: { coachId: true },
      });
      if (!classRecord || classRecord.coachId !== user.id) {
        return NextResponse.json(
          { success: false, message: "You can only mark attendance for your own classes." },
          { status: 403 }
        );
      }
    }

    const statusMap: Record<string, "PRESENT" | "ABSENT" | "LATE"> = {
      Present: "PRESENT",
      Absent: "ABSENT",
      Late: "LATE",
    };

    const attendance = await db.attendance.createMany({
      data: records.map((r) => ({
        classId,
        studentId: r.studentId,
        status: statusMap[r.status] || "ABSENT",
        date: new Date(),
        savedAt: new Date(),
      })),
    });

    return NextResponse.json(
      { success: true, data: { count: attendance.count } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[ATTENDANCE_POST_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
