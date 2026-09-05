import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSessionCookie, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json().catch(() => ({}));

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, name: true, email: true, role: true, password: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 }
      );
    }

    await setSessionCookie(user.id, user.role);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    return NextResponse.json({
      success: true,
      id: safeUser.id,
      name: safeUser.name,
      email: safeUser.email,
      role: safeUser.role,
    });
  } catch (error) {
    console.error("[LOGIN_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
