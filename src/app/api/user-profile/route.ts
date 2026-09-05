import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, unauthorizedResponse } from "@/lib/auth";
import { apiError } from "@/lib/apiError";
import type { Prisma } from "@/generated/prisma/client";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorizedResponse();

    const profile = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        goal: true,
        weight: true,
        height: true,
        age: true,
        role: true,
      },
    });

    if (!profile) return unauthorizedResponse();

    const isProfileComplete = profile.weight != null && profile.height != null && profile.age != null;

    return NextResponse.json({
      success: true,
      data: { ...profile, isProfileComplete },
    });
  } catch (error) {
    return apiError(error, "USER_PROFILE_GET");
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json().catch(() => ({}));
    const { weight, height, age, goal } = body;

    if (
      weight === undefined &&
      height === undefined &&
      age === undefined &&
      goal === undefined
    ) {
      return NextResponse.json(
        { success: false, message: "At least one profile field is required." },
        { status: 400 }
      );
    }

    const rawWeight = weight != null ? parseFloat(String(weight)) : null;
    let rawHeight = height != null ? parseFloat(String(height)) : null;
    const rawAge = age != null ? parseInt(String(age), 10) : null;

    if (rawHeight !== null && rawHeight > 3) {
      rawHeight = rawHeight / 100;
    }

    if (rawWeight !== null && (isNaN(rawWeight) || rawWeight <= 0 || rawWeight > 500)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid weight (1-500 kg)." },
        { status: 400 }
      );
    }

    if (rawHeight !== null && (isNaN(rawHeight) || rawHeight <= 0 || rawHeight > 3)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid height (0.5-3.0 m or 50-300 cm)." },
        { status: 400 }
      );
    }

    if (rawAge !== null && (isNaN(rawAge) || rawAge <= 0 || rawAge > 150)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid age (1-150)." },
        { status: 400 }
      );
    }

    // Only the fields actually sent are updated, so a partial update can
    // never wipe the profile fields the client did not include.
    const data: Prisma.UserUpdateInput = {
      ...(weight !== undefined && { weight: rawWeight }),
      ...(height !== undefined && { height: rawHeight }),
      ...(age !== undefined && { age: rawAge }),
      ...(goal !== undefined && goal !== null && { goal: String(goal) }),
    };

    const updated = await db.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        goal: true,
        weight: true,
        height: true,
        age: true,
        role: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return apiError(error, "USER_PROFILE_PUT");
  }
}
