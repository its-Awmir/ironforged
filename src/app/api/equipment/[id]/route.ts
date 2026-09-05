import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";
import { EquipmentStatus } from "@/generated/prisma/enums";

type RouteContext = { params: Promise<{ id: string }> };

function handleAuthError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return unauthorizedResponse();
    if (error.message === "FORBIDDEN") return forbiddenResponse();
  }
  return null;
}

function mapStatusToDb(status: string): EquipmentStatus {
  const normalized = status.trim().toLowerCase();
  if (normalized.includes("repair")) return "UNDER_REPAIR";
  if (normalized.includes("out") || normalized.includes("order")) return "OUT_OF_ORDER";
  return "OPERATIONAL";
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    await requireRole("ADMIN");
    const { id } = await params;
    const { name, status, notes } = await request.json().catch(() => ({}));

    const existing = await db.equipment.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Equipment not found." },
        { status: 404 }
      );
    }

    const equipment = await db.equipment.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(status && { status: mapStatusToDb(status) }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json({ success: true, data: equipment });
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError) return authError;
    console.error("[EQUIPMENT_UPDATE_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    await requireRole("ADMIN");
    const { id } = await params;

    const existing = await db.equipment.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Equipment not found." },
        { status: 404 }
      );
    }

    await db.equipment.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Equipment deleted." });
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError) return authError;
    console.error("[EQUIPMENT_DELETE_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}