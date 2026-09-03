import { NextResponse } from "next/server";
import { db, isDbReady } from "@/lib/db";
import { requireRole, forbiddenResponse, unauthorizedResponse } from "@/lib/auth";

const PLAN_DAYS: Record<string, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
  SIX_MONTH: 180,
  YEARLY: 365,
};

export async function GET() {
  try {
    const user = await requireRole("admin");
    if (!user) return unauthorizedResponse();

    if (!isDbReady()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const allUsers = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = allUsers.map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      subscription: u.subscriptions[0]
        ? {
            id: u.subscriptions[0].id,
            status: u.subscriptions[0].status,
            planType: u.subscriptions[0].planType,
            hasPrivateCoach: u.subscriptions[0].hasPrivateCoach,
            hasMealPlan: u.subscriptions[0].hasMealPlan,
            startDate: u.subscriptions[0].startDate.toISOString(),
            endDate: u.subscriptions[0].endDate.toISOString(),
            amount: u.subscriptions[0].amount,
          }
        : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[ADMIN_SUBSCRIPTIONS_GET]", error);
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return error.message === "UNAUTHORIZED" ? unauthorizedResponse() : forbiddenResponse();
    }
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("admin");
    if (!user) return unauthorizedResponse();

    if (!isDbReady()) {
      return NextResponse.json({ success: false, message: "Database unavailable." }, { status: 503 });
    }

    const body = await request.json();
    const { userId, planType, hasPrivateCoach, hasMealPlan, customDays, endDate: customEndDate } = body;

    if (!userId) {
      return NextResponse.json({ success: false, message: "User ID is required." }, { status: 400 });
    }

    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }

    const now = new Date();

    let newEndDate: Date;

    if (customEndDate) {
      newEndDate = new Date(customEndDate);
      if (isNaN(newEndDate.getTime()) || newEndDate <= now) {
        return NextResponse.json({ success: false, message: "Invalid custom end date." }, { status: 400 });
      }
    } else if (customDays && typeof customDays === "number" && customDays > 0) {
      const existingActive = await db.subscription.findFirst({
        where: { userId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      });

      const baseDate = existingActive && new Date(existingActive.endDate) > now
        ? new Date(existingActive.endDate)
        : now;

      newEndDate = new Date(baseDate);
      newEndDate.setDate(newEndDate.getDate() + customDays);
    } else if (planType && planType !== "CUSTOM") {
      const days = PLAN_DAYS[planType];
      if (!days) {
        return NextResponse.json({ success: false, message: "Invalid plan type." }, { status: 400 });
      }

      const existingActive = await db.subscription.findFirst({
        where: { userId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      });

      const baseDate = existingActive && new Date(existingActive.endDate) > now
        ? new Date(existingActive.endDate)
        : now;

      newEndDate = new Date(baseDate);
      newEndDate.setDate(newEndDate.getDate() + days);
    } else {
      return NextResponse.json({ success: false, message: "Must provide planType, customDays, or endDate." }, { status: 400 });
    }

    const activeSub = await db.subscription.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    if (activeSub) {
      await db.subscription.update({
        where: { id: activeSub.id },
        data: { status: "EXPIRED" },
      });
    }

    const resolvedPlanType = planType && planType !== "CUSTOM" && PLAN_DAYS[planType]
      ? planType
      : "MONTHLY";

    const newSub = await db.subscription.create({
      data: {
        userId,
        status: "ACTIVE",
        planType: resolvedPlanType as "DAILY" | "WEEKLY" | "MONTHLY" | "SIX_MONTH" | "YEARLY",
        hasPrivateCoach: Boolean(hasPrivateCoach),
        hasMealPlan: Boolean(hasMealPlan),
        startDate: now,
        endDate: newEndDate,
        amount: 0,
      },
    });

    return NextResponse.json({ success: true, data: newSub });
  } catch (error) {
    console.error("[ADMIN_SUBSCRIPTIONS_POST]", error);
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return error.message === "UNAUTHORIZED" ? unauthorizedResponse() : forbiddenResponse();
    }
    const message = error instanceof Error ? error.message : "Failed to update subscription.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
