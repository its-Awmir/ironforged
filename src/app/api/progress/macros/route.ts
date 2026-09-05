import { NextResponse } from "next/server";
import { db, isDbReady } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { hasActiveFeature } from "@/lib/subscription";
import { apiError } from "@/lib/apiError";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isDbReady()) {
      return NextResponse.json({ success: false, message: "Database unavailable." }, { status: 503 });
    }

    const user = await requireAuth();

    // Macro guidance is a paid perk (hasMealPlan). Members without an active
    // subscription that includes it are blocked server-side, not just in the
    // UI.
    const mealPlanEnabled = await hasActiveFeature(user.id, "hasMealPlan");
    if (!mealPlanEnabled) {
      return NextResponse.json(
        { success: false, message: "Meal plan access requires an active subscription." },
        { status: 403 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const record = await db.dailyMacros.findFirst({
      where: {
        userId: user.id,
        date: { gte: today, lt: tomorrow },
      },
    });

    return NextResponse.json({
      success: true,
      data: record || { calories: 0, protein: 0, carbs: 0, fat: 0 },
    });
  } catch (error) {
    return apiError(error, "MACROS_GET", {
      data: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    });
  }
}

export async function POST(request: Request) {
  try {
    if (!isDbReady()) {
      return NextResponse.json({ success: false, message: "Database unavailable." }, { status: 503 });
    }

    // The user id ALWAYS comes from the authenticated session — never from the
    // client body — so one member cannot read or write another member's data.
    const user = await requireAuth();

    const mealPlanEnabled = await hasActiveFeature(user.id, "hasMealPlan");
    if (!mealPlanEnabled) {
      return NextResponse.json(
        { success: false, message: "Meal plan access requires an active subscription." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const calories = Math.max(0, parseFloat(String(body.calories)) || 0);
    const protein = Math.max(0, parseFloat(String(body.protein)) || 0);
    const carbs = Math.max(0, parseFloat(String(body.carbs)) || 0);
    const fat = Math.max(0, parseFloat(String(body.fat)) || 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await db.dailyMacros.upsert({
      where: { userId_date: { userId: user.id, date: today } },
      update: { calories, protein, carbs, fat },
      create: { userId: user.id, calories, protein, carbs, fat, date: today },
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    return apiError(error, "MACROS_POST");
  }
}