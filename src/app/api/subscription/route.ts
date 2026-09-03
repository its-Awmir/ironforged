import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth";

const PLAN_DAYS: Record<string, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
  SIX_MONTH: 180,
  YEARLY: 365,
};

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorizedResponse();

    const subscription = await db.subscription.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    const expired = await db.subscription.findFirst({
      where: { userId: user.id, status: "EXPIRED" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: subscription || expired || { status: "EXPIRED", endDate: null, amount: 0, planType: "MONTHLY", hasPrivateCoach: false, hasMealPlan: false },
    });
  } catch (error) {
    console.error("[SUBSCRIPTION_GET]", error);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const { planType, hasPrivateCoach, hasMealPlan, amount } = body;

    const validPlanType = PLAN_DAYS[planType] ? planType : "MONTHLY";
    const days = PLAN_DAYS[validPlanType];
    const finalAmount = typeof amount === "number" && amount > 0 ? amount : 0;

    const activeSub = await db.subscription.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });

    let startDate = new Date();

    let endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    if (activeSub && new Date(activeSub.endDate) > new Date()) {
      startDate = new Date(activeSub.endDate);
      endDate = new Date(activeSub.endDate);
      endDate.setDate(endDate.getDate() + days);
    }

    if (activeSub) {
      await db.subscription.update({
        where: { id: activeSub.id },
        data: { status: "EXPIRED" },
      });
    }

    const newSub = await db.subscription.create({
      data: {
        userId: user.id,
        status: "ACTIVE",
        planType: validPlanType as "DAILY" | "WEEKLY" | "MONTHLY" | "SIX_MONTH" | "YEARLY",
        hasPrivateCoach: Boolean(hasPrivateCoach),
        hasMealPlan: Boolean(hasMealPlan),
        startDate,
        endDate,
        amount: finalAmount,
      },
    });

    return NextResponse.json({ success: true, data: newSub });
  } catch (error) {
    console.error("[SUBSCRIPTION_POST]", error);
    const message = error instanceof Error ? error.message : "Payment failed.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
