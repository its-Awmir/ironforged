import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold text-slate-primary">404</h1>
      <p className="max-w-md text-sm text-slate-muted">
        The page you are looking for does not exist. It may have been moved, or the
        address may be incorrect.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-verdigris px-4 py-2 text-sm font-medium text-slate-50 transition-colors hover:bg-verdigris/90"
      >
        Return to home
      </Link>
    </div>
  );
}