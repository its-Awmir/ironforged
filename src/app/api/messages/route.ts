import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const targetId = searchParams.get("targetId");
    const role = user.role.toLowerCase();

    if (type === "public") {
      const messages = await db.message.findMany({
        where: { type: "PUBLIC" },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json({ success: true, data: messages });
    }

    if (type === "contact") {
      // Contact-form submissions are admin-only; they are never shown in the
      // public/private message feeds. (No admin inbox UI exists yet — the
      // dedicated admin view is a future improvement.)
      if (role !== "admin") {
        return NextResponse.json(
          { success: false, message: "Forbidden. Contact messages are admin-only." },
          { status: 403 }
        );
      }
      const messages = await db.message.findMany({
        where: { type: "CONTACT" },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json({ success: true, data: messages });
    }

    if (type === "private" && targetId) {
      if (role === "member") {
        if (targetId !== user.id) {
          return NextResponse.json(
            { success: false, message: "Forbidden. You can only view your own messages." },
            { status: 403 }
          );
        }
      }

      const messages = await db.message.findMany({
        where: {
          type: "PRIVATE",
          OR: [
            { fromId: user.id, targetId },
            { fromId: targetId, targetId: user.id },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json({ success: true, data: messages });
    }

    if (role === "member") {
      const messages = await db.message.findMany({
        where: {
          OR: [
            { targetId: user.id },
            { fromId: user.id },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json({ success: true, data: messages });
    }

    const messages = await db.message.findMany({
      // Coaches/admins see the general board + their messages, but never the
      // admin-only CONTACT submissions.
      where: { type: { not: "CONTACT" } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    console.error("[MESSAGES_GET_ERROR]", error);
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

    const { content, type, targetId, targetName } = await request.json().catch(() => ({}));

    if (!content) {
      return NextResponse.json(
        { success: false, message: "content is required." },
        { status: 400 }
      );
    }

    if (targetId) {
      const target = await db.user.findUnique({
        where: { id: String(targetId) },
        select: { id: true },
      });
      if (!target) {
        return NextResponse.json(
          { success: false, message: "Recipient not found." },
          { status: 404 }
        );
      }
    }

    const message = await db.message.create({
      data: {
        content: content.trim(),
        type: type === "private" ? "PRIVATE" : "PUBLIC",
        fromId: user.id,
        fromName: user.name,
        targetId: targetId || null,
        targetName: targetName?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error) {
    console.error("[MESSAGES_POST_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
