import { NextResponse } from "next/server";
import { db, isDbReady } from "@/lib/db";
import { requireRole, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";

const PLAN_DAYS: Record<string, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
  SIX_MONTH: 180,
  YEARLY: 365,
};

export async function POST(request: Request) {
  try {
    const admin = await requireRole("admin");
    if (!admin) return unauthorizedResponse();

    if (!isDbReady()) {
      return NextResponse.json({ success: false, message: "Database unavailable." }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const { targetUserId, planType, startDate, hasPrivateCoach, hasMealPlan } = body;

    if (!targetUserId || typeof targetUserId !== "string" || targetUserId.trim().length === 0) {
      return NextResponse.json({ success: false, message: "Target user ID is required." }, { status: 400 });
    }

    const validPlanType = planType && PLAN_DAYS[planType] ? planType : "MONTHLY";
    const days = PLAN_DAYS[validPlanType];

    const targetUser = await db.user.findUnique({
      where: { id: targetUserId.trim() },
      select: { id: true, name: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json({ success: false, message: "Target user not found." }, { status: 404 });
    }

    const start = startDate ? new Date(startDate) : new Date();
    if (isNaN(start.getTime())) {
      return NextResponse.json({ success: false, message: "Invalid start date." }, { status: 400 });
    }

    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + days);

    const activeSub = await db.subscription.findFirst({
      where: { userId: targetUser.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    if (activeSub) {
      await db.subscription.update({
        where: { id: activeSub.id },
        data: { status: "EXPIRED" },
      });
    }

    const newSub = await db.subscription.create({
      data: {
        userId: targetUser.id,
        status: "ACTIVE",
        planType: validPlanType as "DAILY" | "WEEKLY" | "MONTHLY" | "SIX_MONTH" | "YEARLY",
        hasPrivateCoach: Boolean(hasPrivateCoach),
        hasMealPlan: Boolean(hasMealPlan),
        startDate: start,
        endDate,
        amount: 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Gift subscription granted to ${targetUser.name}.`,
      data: {
        subscriptionId: newSub.id,
        userName: targetUser.name,
        userEmail: targetUser.email,
        planType: validPlanType,
        startDate: start.toISOString(),
        endDate: endDate.toISOString(),
        hasPrivateCoach: Boolean(hasPrivateCoach),
        hasMealPlan: Boolean(hasMealPlan),
      },
    });
  } catch (error) {
    console.error("[GRANT_SUBSCRIPTION_POST]", error);
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorizedResponse();
      if (error.message === "FORBIDDEN") return forbiddenResponse();
    }
    const message = error instanceof Error ? error.message : "Failed to grant subscription.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
