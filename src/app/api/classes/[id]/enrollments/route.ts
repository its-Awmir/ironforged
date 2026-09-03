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
    const { email } = await request.json();

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

    const existing = await db.enrollment.findUnique({
      where: { userId_classId: { userId: user.id, classId } },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "User is already enrolled in this class." },
        { status: 409 }
      );
    }

    const enrollment = await db.enrollment.create({
      data: { userId: user.id, classId },
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
    const { studentId } = await request.json();

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