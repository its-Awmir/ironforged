import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const studentId = searchParams.get("studentId");
    const role = user.role.toLowerCase();

    if (role === "admin") {
      if (classId) {
        const workouts = await db.groupWorkout.findMany({
          where: { classId },
          include: { gymClass: { select: { id: true, className: true } } },
          orderBy: { date: "desc" },
        });
        return NextResponse.json({ success: true, data: workouts });
      }
      if (studentId) {
        const workouts = await db.individualWorkout.findMany({
          where: { studentId },
          orderBy: { date: "desc" },
        });
        return NextResponse.json({ success: true, data: workouts });
      }
      const [groupWorkouts, individualWorkouts] = await Promise.all([
        db.groupWorkout.findMany({
          include: { gymClass: { select: { id: true, className: true } } },
          orderBy: { date: "desc" },
          take: 50,
        }),
        db.individualWorkout.findMany({ orderBy: { date: "desc" }, take: 50 }),
      ]);
      return NextResponse.json({ success: true, data: { groupWorkouts, individualWorkouts } });
    }

    if (role === "coach") {
      const coachClasses = await db.gymClass.findMany({
        where: { coachId: user.id },
        select: { id: true },
      });
      const classIds = coachClasses.map((c) => c.id);

      const groupWorkouts = await db.groupWorkout.findMany({
        where: { classId: { in: classIds } },
        include: { gymClass: { select: { id: true, className: true } } },
        orderBy: { date: "desc" },
        take: 50,
      });

      const enrolledStudentIds = (
        await db.enrollment.findMany({
          where: { classId: { in: classIds } },
          select: { userId: true },
        })
      ).map((e) => e.userId);

      const individualWorkouts = enrolledStudentIds.length > 0
        ? await db.individualWorkout.findMany({
            where: { studentId: { in: enrolledStudentIds } },
            orderBy: { date: "desc" },
            take: 50,
          })
        : [];

      return NextResponse.json({ success: true, data: { groupWorkouts, individualWorkouts } });
    }

    const groupWorkouts = await db.groupWorkout.findMany({
      where: {
        gymClass: {
          enrollments: {
            some: { userId: user.id },
          },
        },
      },
      include: { gymClass: { select: { id: true, className: true } } },
      orderBy: { date: "desc" },
    });

    const individualWorkouts = await db.individualWorkout.findMany({
      where: { studentId: user.id },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ success: true, data: { groupWorkouts, individualWorkouts } });
  } catch (error) {
    console.error("[WORKOUTS_GET_ERROR]", error);
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
        { success: false, message: "Forbidden. Members cannot assign workouts." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, classId, studentId, date, workoutJson } = body;

    if (!type || !workoutJson) {
      return NextResponse.json(
        { success: false, message: "type and workoutJson are required." },
        { status: 400 }
      );
    }

    if (type === "group") {
      if (!classId) {
        return NextResponse.json(
          { success: false, message: "classId is required for group workouts." },
          { status: 400 }
        );
      }

      if (role === "coach") {
        const classRecord = await db.gymClass.findUnique({ where: { id: classId }, select: { coachId: true } });
        if (!classRecord || classRecord.coachId !== user.id) {
          return NextResponse.json(
            { success: false, message: "You can only assign workouts to your own classes." },
            { status: 403 }
          );
        }
      }

      const workout = await db.groupWorkout.create({
        data: { classId, date: date ? new Date(date) : new Date(), workoutJson },
      });
      return NextResponse.json({ success: true, data: workout }, { status: 201 });
    }

    if (type === "individual") {
      if (!studentId) {
        return NextResponse.json(
          { success: false, message: "studentId is required for individual workouts." },
          { status: 400 }
        );
      }

      if (role === "coach") {
        const isEnrolled = await db.enrollment.findFirst({
          where: {
            userId: studentId,
            gymClass: { coachId: user.id },
          },
        });
        if (!isEnrolled) {
          return NextResponse.json(
            { success: false, message: "You can only assign workouts to students in your classes." },
            { status: 403 }
          );
        }
      }

      const workout = await db.individualWorkout.create({
        data: { studentId, date: date ? new Date(date) : new Date(), workoutJson },
      });
      return NextResponse.json({ success: true, data: workout }, { status: 201 });
    }

    return NextResponse.json(
      { success: false, message: "Invalid type. Must be 'group' or 'individual'." },
      { status: 400 }
    );
  } catch (error) {
    console.error("[WORKOUTS_POST_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
