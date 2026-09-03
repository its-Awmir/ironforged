"use client";

interface SkeletonProps {
  className?: string;
  rounded?: string;
}

export function Skeleton({ className = "", rounded = "rounded-xl" }: SkeletonProps) {
  return (
    <div
      className={`bg-zinc-800/60 animate-pulse ${rounded} ${className}`}
    />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`premium-glow-card rounded-2xl p-4 ${className}`}>
      <Skeleton className="h-2.5 w-16 mb-3" rounded="rounded" />
      <Skeleton className="h-7 w-24" />
    </div>
  );
}

export function SkeletonTableRows({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-zinc-900/40">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="py-3">
              <Skeleton
                className={`h-3.5 ${j === 0 ? "w-28" : j === cols - 1 ? "w-16" : "w-20"}`}
                rounded="rounded"
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonChatBubble({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 bg-[#121216] p-3 rounded-xl border border-zinc-900/60">
          <Skeleton className="h-5 w-14 shrink-0" rounded="rounded-md" />
          <Skeleton className="h-3.5 flex-1" rounded="rounded" />
          <Skeleton className="h-3.5 w-16 shrink-0" rounded="rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonFullPage({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-[#070709] flex flex-col">
      {/* Sidebar skeleton */}
      <aside className="w-64 border-r border-zinc-900/60 bg-[#0b0b0e]/95 lg:bg-[#0b0b0e]/80 backdrop-blur-xl p-6 flex flex-col justify-between fixed h-screen z-30">
        <div>
          <Skeleton className="h-9 w-28 mb-10" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" rounded="rounded-xl" />
            ))}
          </div>
        </div>
        <Skeleton className="h-8 w-20" rounded="rounded-xl" />
      </aside>

      {/* Main content skeleton */}
      <main className="flex-1 lg:pl-64 min-h-screen flex flex-col">
        <header className="px-4 lg:px-8 pt-6 lg:pt-8 pb-4">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-3 w-44" rounded="rounded" />
        </header>
        <div className="p-4 lg:p-8 flex-1 space-y-6">
          {/* Stat cards skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          {/* Table skeleton */}
          <div className="premium-glow-card rounded-2xl p-4 lg:p-6">
            <Skeleton className="h-4 w-32 mb-4" rounded="rounded" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" rounded="rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Centered loading text */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[200]">
        <div className="flex flex-col items-center gap-3 bg-[#0b0b0e]/90 backdrop-blur-xl border border-zinc-800/60 rounded-2xl px-8 py-6 shadow-2xl">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-red-500 animate-spin" />
          </div>
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
            {message}
          </span>
        </div>
      </div>
    </div>
  );
}
