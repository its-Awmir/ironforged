import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";
import { EquipmentStatus } from "@/generated/prisma/enums";

function handleAuthError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return unauthorizedResponse();
    if (error.message === "FORBIDDEN") return forbiddenResponse();
  }
  return null;
}

export async function GET() {
  try {
    await requireRole("MEMBER", "COACH", "ADMIN");
    const equipment = await db.equipment.findMany({
      orderBy: { date: "desc" },
    });

    const mapped = equipment.map((item: (typeof equipment)[number]) => ({
      id: item.id,
      name: item.name,
      status: mapStatusToFrontend(item.status),
      lastCheck: item.date
        ? new Date(item.date).toLocaleDateString("en-GB")
        : null,
      notes: item.notes,
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError) return authError;
    console.error("[EQUIPMENT_GET_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("ADMIN");
    const { name, status, lastCheck, notes } = await request.json();

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Equipment name is required." },
        { status: 400 }
      );
    }

    const equipment = await db.equipment.create({
      data: {
        name: name.trim(),
        status: mapStatusToDb(status),
        notes: notes || null,
        date: lastCheck ? new Date(lastCheck) : new Date(),
      },
    });

    return NextResponse.json(
      { success: true, data: equipment },
      { status: 201 }
    );
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError) return authError;
    console.error("[EQUIPMENT_POST_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

function mapStatusToFrontend(status: EquipmentStatus): string {
  const map: Record<EquipmentStatus, string> = {
    OPERATIONAL: "Operational",
    UNDER_REPAIR: "Under Repair",
    OUT_OF_ORDER: "Out of Order",
  };
  return map[status] || "Operational";
}

function mapStatusToDb(status: string): EquipmentStatus {
  const normalized = status.trim().toLowerCase();
  if (normalized.includes("repair")) return "UNDER_REPAIR";
  if (normalized.includes("out") || normalized.includes("order")) return "OUT_OF_ORDER";
  return "OPERATIONAL";
}