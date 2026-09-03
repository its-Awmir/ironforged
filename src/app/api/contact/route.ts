import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { name, email, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, message: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    await db.message.create({
      data: {
        content: `[Contact Form] ${message.trim()}`,
        type: "PUBLIC",
        fromId: "00000000-0000-0000-0000-000000000000",
        fromName: `${name.trim()} <${email.trim()}>`,
      },
    });

    return NextResponse.json(
      { success: true, message: "Message sent successfully." },
      { status: 201 }
    );
  } catch (error) {
    console.error("[CONTACT_POST_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
