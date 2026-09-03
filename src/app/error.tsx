"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PAGE_ERROR]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold text-slate-primary">
        Something went wrong
      </h1>
      <p className="max-w-md text-sm text-slate-muted">
        An unexpected error occurred. Please try again, or contact support if the
        problem persists.
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-lg bg-verdigris px-4 py-2 text-sm font-medium text-slate-50 transition-colors hover:bg-verdigris/90"
      >
        Try again
      </button>
    </div>
  );
}