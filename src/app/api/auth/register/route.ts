import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSessionCookie, hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { name, email, password, goal } = await request.json().catch(() => ({}));

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email is already registered." },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        goal: goal || "General",
        role: "MEMBER",
        ipAddress: request.headers.get("x-forwarded-for") || null,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    await setSessionCookie(user.id, user.role);

    return NextResponse.json(
      { success: true, data: user },
      { status: 201 }
    );
  } catch (error) {
    console.error("[REGISTER_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
