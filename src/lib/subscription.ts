import { db } from "@/lib/db";

export const PLAN_DAYS: Record<string, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30,
  SIX_MONTH: 180,
  YEARLY: 365,
};

export const PLAN_PRICES: Record<string, number> = {
  DAILY: 1.99,
  WEEKLY: 9.99,
  MONTHLY: 29.99,
  SIX_MONTH: 149.99,
  YEARLY: 249.99,
};

export const PRIVATE_COACH_ADDON_PRICE = 50;
export const MEAL_PLAN_ADDON_PRICE = 20;

/**
 * Lazy expiry: called wherever a subscription is read or created. Any ACTIVE
 * subscription whose endDate is already in the past is flipped to EXPIRED in
 * the same request, so status is always honest without a background job.
 */
export async function expireLapsedSubscriptions(): Promise<void> {
  try {
    await db.subscription.updateMany({
      where: { status: "ACTIVE", endDate: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });
  } catch (error) {
    console.error("[SUB_EXPIRE]", error);
  }
}

/**
 * The amount is ALWAYS derived server-side from a fixed price table. The client
 * never sends a price.
 * TODO: replace with a real payment gateway before production.
 */
export function computeSubscriptionAmount(
  planType: string,
  hasPrivateCoach: boolean,
  hasMealPlan: boolean
): number {
  const base = PLAN_PRICES[planType] ?? 0;
  return base + (hasPrivateCoach ? PRIVATE_COACH_ADDON_PRICE : 0) + (hasMealPlan ? MEAL_PLAN_ADDON_PRICE : 0);
}

/**
 * Server-side feature gate for subscription perks. Every place where a
 * hasPrivateCoach / hasMealPlan feature is consumed must go through this check —
 * never trust client-side UI to enforce it.
 */
export async function hasActiveFeature(
  userId: string,
  feature: "hasPrivateCoach" | "hasMealPlan"
): Promise<boolean> {
  await expireLapsedSubscriptions();
  const sub = await db.subscription.findFirst({
    where: { userId, status: "ACTIVE", [feature]: true },
    orderBy: { createdAt: "desc" },
  });
  return Boolean(sub);
}