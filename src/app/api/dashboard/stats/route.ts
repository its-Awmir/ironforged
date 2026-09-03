import { NextResponse } from "next/server";
import { db, isDbReady } from "@/lib/db";
import { requireRole, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatMemory(): string {
  try {
    const used = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const total = (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(1);
    return `${used} MB / ${total} MB`;
  } catch {
    return "N/A";
  }
}

function formatMemoryRaw(): { usedMB: number; totalMB: number } {
  try {
    return {
      usedMB: parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)),
      totalMB: parseFloat((process.memoryUsage().heapTotal / 1024 / 1024).toFixed(1)),
    };
  } catch {
    return { usedMB: 0, totalMB: 0 };
  }
}

function handleAuthError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return unauthorizedResponse();
    if (error.message === "FORBIDDEN") return forbiddenResponse();
  }
  return null;
}

export async function GET() {
  try {
    await requireRole("ADMIN");
    let totalUsers = 0;
    let revenue = 0;
    let dbStatus = "Online";

    if (isDbReady()) {
      try {
        const counts = await Promise.allSettled([
          db.user.count(),
          db.subscription.aggregate({ _sum: { amount: true }, where: { status: "ACTIVE" } }),
        ]);

        if (counts[0].status === "fulfilled") {
          totalUsers = counts[0].value;
        } else {
          console.error("[DASHBOARD_STATS] user.count failed:", counts[0].reason);
        }

        if (counts[1].status === "fulfilled") {
          revenue = counts[1].value._sum.amount || 0;
        } else {
          console.error("[DASHBOARD_STATS] subscription.aggregate failed:", counts[1].reason);
        }
      } catch (dbErr) {
        console.error("[DASHBOARD_STATS] DB query error:", dbErr);
        dbStatus = "Online (Limited)";
      }
    } else {
      dbStatus = "Online (Limited)";
    }

    const uptimeSeconds = process.uptime();
    const mem = formatMemoryRaw();

    return NextResponse.json({
      success: true,
      data: {
        uptime: formatUptime(uptimeSeconds),
        uptimeRaw: Math.floor(uptimeSeconds),
        memory: formatMemory(),
        memoryUsedMB: mem.usedMB,
        memoryTotalMB: mem.totalMB,
        users: totalUsers,
        revenue,
        status: dbStatus,
      },
    });
  } catch (error) {
    const authError = handleAuthError(error);
    if (authError) return authError;
    console.error("[DASHBOARD_STATS_ERROR]", error);

    let fallbackMemory = "N/A";
    let fallbackMemUsed = 0;
    let fallbackMemTotal = 0;
    try {
      fallbackMemory = formatMemory();
      const memRaw = formatMemoryRaw();
      fallbackMemUsed = memRaw.usedMB;
      fallbackMemTotal = memRaw.totalMB;
    } catch { /* use defaults */ }

    return NextResponse.json({
      success: true,
      data: {
        uptime: formatUptime(process.uptime()),
        uptimeRaw: Math.floor(process.uptime()),
        memory: fallbackMemory,
        memoryUsedMB: fallbackMemUsed,
        memoryTotalMB: fallbackMemTotal,
        users: 0,
        revenue: 0,
        status: "Online (Limited)",
      },
    });
  }
}
