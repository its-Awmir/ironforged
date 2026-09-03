import { NextResponse } from "next/server";
import { db, isDbReady } from "@/lib/db";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorizedResponse();

    if (!isDbReady()) {
      return NextResponse.json({ success: false, message: "Database unavailable." }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email || typeof email !== "string" || email.trim().length === 0) {
      return NextResponse.json({ success: false, message: "Email is required." }, { status: 400 });
    }

    const found = await db.user.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
      select: { id: true, name: true, email: true },
    });

    if (!found) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: found });
  } catch (error) {
    console.error("[USER_LOOKUP_GET]", error);
    return NextResponse.json({ success: false, message: "Internal server error." }, { status: 500 });
  }
}
