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

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    await requireRole("COACH", "ADMIN");
    const { id } = await params;
    const { title, coach, coachId, time, capacity } = await request.json();

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

    const gymClass = await db.gymClass.update({
      where: { id },
      data: {
        ...(title && { className: title.trim() }),
        ...(resolvedCoachId && { coachId: resolvedCoachId }),
        ...(time && { timeSlots: time }),
        ...(capacity && { capacity: Number(capacity) }),
      },
    });

    return NextResponse.json({ success: true, data: gymClass });
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError) return authError;
    console.error("[CLASS_UPDATE_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    await requireRole("COACH", "ADMIN");
    const { id } = await params;

    await db.gymClass.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Class deleted." });
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError) return authError;
    console.error("[CLASS_DELETE_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}