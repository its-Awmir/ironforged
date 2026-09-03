import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorizedResponse();

    const role = user.role.toLowerCase();

    if (role === "member") {
      const enrollments = await db.enrollment.findMany({
        where: { userId: user.id },
        include: {
          gymClass: {
            include: {
              coach: { select: { id: true, name: true, email: true } },
              enrollments: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
        },
      });

      const mapped = enrollments.map((e) => ({
        id: e.gymClass.id,
        title: e.gymClass.className,
        coach: e.gymClass.coach.name,
        coachId: e.gymClass.coachId,
        time: e.gymClass.timeSlots,
        capacity: e.gymClass.capacity,
        enrolled: e.gymClass.enrollments.length,
        students: e.gymClass.enrollments.map((en) => ({
          id: en.user.id,
          name: en.user.name,
          email: en.user.email,
        })),
      }));

      return NextResponse.json({ success: true, data: mapped });
    }

    const classes = await db.gymClass.findMany({
      include: {
        coach: { select: { id: true, name: true, email: true } },
        enrollments: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let filtered = classes;
    if (role === "coach") {
      filtered = classes.filter((c) => c.coachId === user.id);
    }

    const mapped = filtered.map((c) => ({
      id: c.id,
      title: c.className,
      coach: c.coach.name,
      coachId: c.coachId,
      time: c.timeSlots,
      capacity: c.capacity,
      enrolled: c.enrollments.length,
      students: c.enrollments.map((e) => ({
        id: e.user.id,
        name: e.user.name,
        email: e.user.email,
      })),
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (error) {
    console.error("[CLASSES_GET_ERROR]", error);
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
        { success: false, message: "Forbidden. Members cannot create classes." },
        { status: 403 }
      );
    }

    const { title, coach, coachId, time, capacity } = await request.json();

    if (!title) {
      return NextResponse.json(
        { success: false, message: "Class title is required." },
        { status: 400 }
      );
    }

    let resolvedCoachId = coachId;

    if (!resolvedCoachId && coach) {
      const coachUser = await db.user.findFirst({
        where: {
          OR: [
            { name: { equals: coach, mode: "insensitive" } },
            { email: { equals: coach, mode: "insensitive" } },
          ],
        },
      });
      if (coachUser) resolvedCoachId = coachUser.id;
    }

    if (!resolvedCoachId) {
      const fallbackCoach = await db.user.findFirst({ where: { role: "COACH" } });
      resolvedCoachId = fallbackCoach?.id;
    }

    if (!resolvedCoachId) {
      return NextResponse.json(
        { success: false, message: "No coach found. Please provide a valid coachId." },
        { status: 400 }
      );
    }

    if (role === "coach" && resolvedCoachId !== user.id) {
      return NextResponse.json(
        { success: false, message: "Coaches can only create classes assigned to themselves." },
        { status: 403 }
      );
    }

    const gymClass = await db.gymClass.create({
      data: {
        className: title.trim(),
        timeSlots: time || "TBD",
        capacity: capacity || 20,
        coachId: resolvedCoachId,
      },
    });

    return NextResponse.json({ success: true, data: gymClass }, { status: 201 });
  } catch (error) {
    console.error("[CLASSES_POST_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
