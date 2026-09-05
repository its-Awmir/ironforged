import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth";
import { PLAN_DAYS, computeSubscriptionAmount, expireLapsedSubscriptions } from "@/lib/subscription";
import { apiError } from "@/lib/apiError";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorizedResponse();
    await expireLapsedSubscriptions();

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
    return apiError(error, "SUBSCRIPTION_GET");
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorizedResponse();

    const paymentsEnabled = process.env.PAYMENTS_ENABLED === "true";
    if (!paymentsEnabled) {
      return NextResponse.json(
        {
          success: false,
          message: "Payments not yet configured — contact an admin.",
        },
        { status: 501 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { planType, hasPrivateCoach, hasMealPlan } = body;

    const validPlanType = PLAN_DAYS[planType] ? planType : "MONTHLY";
    const days = PLAN_DAYS[validPlanType];
    // Amount is derived server-side from the fixed price table; the client
    // never supplies a price.
    const finalAmount = computeSubscriptionAmount(validPlanType, Boolean(hasPrivateCoach), Boolean(hasMealPlan));

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

    // TODO: replace with a real payment gateway before production. This is a
    // DEMO flow: no money is charged, and the amount above is informational.
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

    return NextResponse.json({
      success: true,
      message: "Demo mode: no real payment was charged. A payment gateway must be wired in before production.",
      demoMode: true,
      data: newSub,
    });
  } catch (error) {
    return apiError(error, "SUBSCRIPTION_POST");
  }
}
