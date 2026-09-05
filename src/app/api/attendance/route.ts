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
      // A coach may only view attendance for classes they own. A requested
      // classId must be verified — it never overrides the ownership scope.
      if (classId) {
        const classRecord = await db.gymClass.findUnique({
          where: { id: classId },
          select: { id: true, coachId: true },
        });

        if (!classRecord) {
          return NextResponse.json(
            { success: false, message: "Class not found." },
            { status: 404 }
          );
        }

        if (classRecord.coachId !== user.id) {
          return NextResponse.json(
            { success: false, message: "You can only view attendance for your own classes." },
            { status: 403 }
          );
        }

        where.classId = classId;
      } else {
        const coachClasses = await db.gymClass.findMany({
          where: { coachId: user.id },
          select: { id: true },
        });
        where.classId = { in: coachClasses.map((c) => c.id) };
      }
    } else {
      // Admin may query attendance for any class.
      if (classId) where.classId = classId;
    }

    if (date) {
      const start = new Date(date);
      if (isNaN(start.getTime())) {
        return NextResponse.json(
          { success: false, message: "Invalid date. Use YYYY-MM-DD." },
          { status: 400 }
        );
      }
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

    const { classId, records } = (await request.json().catch(() => ({}))) as {
      classId: string;
      records: { studentId: string; status: "Present" | "Absent" | "Late" }[];
    };

    if (!classId || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { success: false, message: "classId and records array are required." },
        { status: 400 }
      );
    }

    const classRecord = await db.gymClass.findUnique({
      where: { id: classId },
      select: { id: true, coachId: true },
    });

    if (!classRecord) {
      return NextResponse.json(
        { success: false, message: "Class not found." },
        { status: 404 }
      );
    }

    if (role === "coach" && classRecord.coachId !== user.id) {
      return NextResponse.json(
        { success: false, message: "You can only mark attendance for your own classes." },
        { status: 403 }
      );
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
