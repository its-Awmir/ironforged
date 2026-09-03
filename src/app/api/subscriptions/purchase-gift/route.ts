import { NextResponse } from "next/server";
import { db, isDbReady } from "@/lib/db";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth";

const PLAN_DAYS: Record<string, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
  SIX_MONTH: 180,
  YEARLY: 365,
};

const PLAN_PRICES: Record<string, number> = {
  DAILY: 1.99,
  WEEKLY: 9.99,
  MONTHLY: 29.99,
  SIX_MONTH: 149.99,
  YEARLY: 249.99,
};

export async function POST(request: Request) {
  try {
    const buyer = await getSessionUser();
    if (!buyer) return unauthorizedResponse();

    if (!isDbReady()) {
      return NextResponse.json({ success: false, message: "Database unavailable." }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const { recipientEmail, planType, hasPrivateCoach, hasMealPlan } = body;

    if (!recipientEmail || typeof recipientEmail !== "string" || recipientEmail.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: "Recipient email is required." },
        { status: 400 }
      );
    }

    const validPlanType = planType && PLAN_DAYS[planType] ? planType : "MONTHLY";
    const days = PLAN_DAYS[validPlanType];
    const basePrice = PLAN_PRICES[validPlanType];
    const coachPrice = hasPrivateCoach ? 50 : 0;
    const mealPrice = hasMealPlan ? 20 : 0;
    const totalAmount = basePrice + coachPrice + mealPrice;

    const recipient = await db.user.findFirst({
      where: { email: { equals: recipientEmail.trim(), mode: "insensitive" } },
      select: { id: true, name: true, email: true },
    });

    if (!recipient) {
      return NextResponse.json(
        {
          success: false,
          message: "User with this email was not found. Please ask your friend to sign up first.",
        },
        { status: 404 }
      );
    }

    if (recipient.id === buyer.id) {
      return NextResponse.json(
        { success: false, message: "You cannot gift a subscription to yourself." },
        { status: 400 }
      );
    }

    // --- MOCK PAYMENT PROCESSING ---
    // Structure ready for Stripe/ZarinPal integration:
    // const paymentResult = await processPayment(totalAmount, buyer.id);
    // if (!paymentResult.success) { return 402 response }
    const paymentSuccessful = true;
    const mockTransactionId = `GIFT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    // --- END MOCK PAYMENT ---

    if (!paymentSuccessful) {
      return NextResponse.json(
        { success: false, message: "Payment failed. Please try again." },
        { status: 402 }
      );
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);

    const activeSub = await db.subscription.findFirst({
      where: { userId: recipient.id, status: "ACTIVE" },
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
        userId: recipient.id,
        status: "ACTIVE",
        planType: validPlanType as "DAILY" | "WEEKLY" | "MONTHLY" | "SIX_MONTH" | "YEARLY",
        hasPrivateCoach: Boolean(hasPrivateCoach),
        hasMealPlan: Boolean(hasMealPlan),
        startDate,
        endDate,
        amount: totalAmount,
        giftedBy: `${buyer.name} (${buyer.email})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Gift subscription activated successfully for ${recipient.name}!`,
      data: {
        transactionId: mockTransactionId,
        subscriptionId: newSub.id,
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        planType: validPlanType,
        planLabel: validPlanType.replace("_", "-"),
        amount: totalAmount,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        hasPrivateCoach: Boolean(hasPrivateCoach),
        hasMealPlan: Boolean(hasMealPlan),
      },
    });
  } catch (error) {
    console.error("[PURCHASE_GIFT_POST]", error);
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorizedResponse();
    }
    const message = error instanceof Error ? error.message : "Failed to process gift purchase.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
