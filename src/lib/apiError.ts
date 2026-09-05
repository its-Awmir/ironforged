import { NextResponse } from "next/server";

/**
 * Central error handler for API routes.
 *
 * - Logs the real error server-side for debugging.
 * - NEVER returns `error.message` to the client — that can leak internal
 *   details (table names, connection strings, stack traces).
 * - Returns a generic client-safe message ("Something went wrong, please try
 *   again") unless the error is one of the guard errors thrown by the auth
 *   helpers in `@/lib/auth` (UNAUTHORIZED / FORBIDDEN), which map to their
 *   own specific-but-safe messages.
 *
 * `extra` fields are spread into the JSON payload so routes can keep their
 * existing response shape (e.g. default `data` values).
 */
export function apiError(
  error: unknown,
  label: string,
  extra: Record<string, unknown> = {}
): NextResponse {
  console.error(`[${label}]`, error);

  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, message: "Not authorized.", ...extra },
        { status: 401 }
      );
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json(
        { success: false, message: "Forbidden.", ...extra },
        { status: 403 }
      );
    }
  }

  return NextResponse.json(
    { success: false, message: "Something went wrong, please try again.", ...extra },
    { status: 500 }
  );
}