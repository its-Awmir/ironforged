import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth";

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
    const user = await getSessionUser();
    if (!user) return unauthorizedResponse();

    const role = user.role.toLowerCase();
    if (role === "member") {
      return NextResponse.json(
        { success: false, message: "Forbidden. Members cannot update roles." },
        { status: 403 }
      );
    }

    const { id, newRole } = await request.json();

    if (!id || !newRole) {
      return NextResponse.json(
        { success: false, message: "id and newRole are required." },
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

    const updatedUser = await db.user.update({
      where: { id },
      data: { role: normalizedRole as "ADMIN" | "COACH" | "MEMBER" },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error("[USER_ROLE_UPDATE_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
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

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "User ID is required." },
        { status: 400 }
      );
    }

    await db.user.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "User deleted." });
  } catch (error) {
    console.error("[USER_DELETE_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
