import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, unauthorizedResponse, requireRole } from "@/lib/auth";
import { apiError } from "@/lib/apiError";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorizedResponse();

    const role = user.role.toLowerCase();

    if (role === "member") {
      const me = await db.user.findUnique({
        where: { id: user.id },
        select: { id: true, name: true, email: true, role: true, goal: true, createdAt: true },
      });
      return NextResponse.json({ success: true, data: me ? [me] : [] });
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        goal: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("[USERS_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Only ADMINS may manage roles at all. COACH and MEMBER are blocked here —
    // they get a FORBIDDEN error thrown by requireRole and never reach the code
    // below, so they have zero role-management ability.
    const user = await requireRole("ADMIN");

    const { id, newRole } = await request.json().catch(() => ({}));

    if (!id || !newRole) {
      return NextResponse.json(
        { success: false, message: "id and newRole are required." },
        { status: 400 }
      );
    }

    // A user can never change their own role, regardless of role. This is
    // enforced even though the caller is already an ADMIN — it prevents an
    // accidental (or malicious) self-demotion/promotion in one request.
    if (id === user.id) {
      return NextResponse.json(
        { success: false, message: "You cannot change your own role." },
        { status: 400 }
      );
    }

    const validRoles = ["ADMIN", "COACH", "MEMBER"];
    const normalizedRole = newRole.toUpperCase();

    if (!validRoles.includes(normalizedRole)) {
      return NextResponse.json(
        { success: false, message: "Invalid role. Must be admin, coach, or member." },
        { status: 400 }
      );
    }

    // Only an ADMIN may grant the ADMIN role. requireRole("ADMIN") above
    // already guarantees the caller is an admin, so this is a defense-in-depth
    // guard that makes the invariant explicit and prevents regressions if the
    // endpoint's auth gate is ever changed.
    if (normalizedRole === "ADMIN" && user.role.toUpperCase() !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Forbidden. Only admins can grant the admin role." },
        { status: 403 }
      );
    }

    const target = await db.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: { role: normalizedRole as "ADMIN" | "COACH" | "MEMBER" },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    return apiError(error, "USER_ROLE_UPDATE_ERROR");
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorizedResponse();

    if (user.role.toLowerCase() !== "admin") {
      return NextResponse.json(
        { success: false, message: "Forbidden. Only admins can delete users." },
        { status: 403 }
      );
    }

    const { id } = await request.json().catch(() => ({}));

    if (!id) {
      return NextResponse.json(
        { success: false, message: "User ID is required." },
        { status: 400 }
      );
    }

    const target = await db.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!target) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404 }
      );
    }

    const activeClassCount = await db.gymClass.count({
      where: { coachId: id, isArchived: false },
    });
    if (activeClassCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Reassign or delete this coach's classes first.",
        },
        { status: 409 }
      );
    }

    // Detach any archived classes so the coach relation (onDelete: Restrict)
    // does not block the user deletion. Archived classes are soft-deleted and
    // cannot be reassigned, so clearing coachId is safe.
    await db.gymClass.updateMany({
      where: { coachId: id, isArchived: true },
      data: { coachId: null },
    });

    await db.user.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "User deleted." });
  } catch (error) {
    return apiError(error, "USER_DELETE_ERROR");
  }
}
