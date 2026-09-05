import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

function handleAuthError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return unauthorizedResponse();
    if (error.message === "FORBIDDEN") return forbiddenResponse();
  }
  return null;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    await requireRole("COACH", "ADMIN");
    const { id: classId } = await params;
    const { email } = await request.json().catch(() => ({}));

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required." },
        { status: 400 }
      );
    }

    const user = await db.user.findFirst({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    const gymClass = await db.gymClass.findUnique({ where: { id: classId } });

    if (!gymClass) {
      return NextResponse.json(
        { success: false, message: "Class not found." },
        { status: 404 }
      );
    }

    // Enforce capacity INSIDE a transaction so two concurrent enrollments
    // cannot both pass the count check and overfill the class.
    try {
      await db.$transaction(async (tx) => {
        const existing = await tx.enrollment.findUnique({
          where: { userId_classId: { userId: user.id, classId } },
        });

        if (existing) {
          throw new Error("ALREADY_ENROLLED");
        }

        const enrolledCount = await tx.enrollment.count({
          where: { classId },
        });

        if (enrolledCount >= gymClass.capacity) {
          throw new Error("CLASS_FULL");
        }

        await tx.enrollment.create({
          data: { userId: user.id, classId },
        });
      });
    } catch (innerError) {
      if (innerError instanceof Error) {
        if (innerError.message === "ALREADY_ENROLLED") {
          return NextResponse.json(
            { success: false, message: "User is already enrolled in this class." },
            { status: 409 }
          );
        }
        if (innerError.message === "CLASS_FULL") {
          return NextResponse.json(
            { success: false, message: "Class is full." },
            { status: 409 }
          );
        }
      }
      throw innerError;
    }

    const enrollment = await db.enrollment.findUnique({
      where: { userId_classId: { userId: user.id, classId } },
    });

    return NextResponse.json(
      { success: true, data: enrollment },
      { status: 201 }
    );
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError) return authError;
    console.error("[ENROLLMENT_POST_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    await requireRole("COACH", "ADMIN");
    const { id: classId } = await params;
    const { studentId } = await request.json().catch(() => ({}));

    if (!studentId) {
      return NextResponse.json(
        { success: false, message: "studentId is required." },
        { status: 400 }
      );
    }

    await db.enrollment.deleteMany({
      where: { classId, userId: studentId },
    });

    return NextResponse.json({ success: true, message: "Student removed from class." });
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError) return authError;
    console.error("[ENROLLMENT_DELETE_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}