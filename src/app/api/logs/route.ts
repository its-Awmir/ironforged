import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { requireRole, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const logPath = join(process.cwd(), "logs", "server_detail.log");
    const content = await readFile(logPath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());
    const lastLines = lines.slice(-200);

    return NextResponse.json({ success: true, data: lastLines });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") return unauthorizedResponse();
      if (error.message === "FORBIDDEN") return forbiddenResponse();
    }
    console.error("[LOGS_GET_ERROR]", error);
    return NextResponse.json(
      { success: true, data: [] }
    );
  }
}