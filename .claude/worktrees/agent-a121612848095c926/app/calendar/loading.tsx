import { Skeleton } from "../components/ui/Skeleton";

export default function CalendarLoading() {
  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-7 w-28 animate-pulse rounded-lg bg-[#1A1A1E] mb-2" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-[#1A1A1E]" />
      </div>

      {/* Nav bar skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-16 ml-2" />
        </div>
      </div>

      {/* Calendar grid skeleton */}
      <div className="rounded-xl border border-[#27272A] overflow-hidden bg-[#0F0F11]">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[#27272A]">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="px-2 py-2.5 flex justify-center">
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>

        {/* Day cells - 5 rows */}
        {Array.from({ length: 5 }).map((_, row) => (
          <div key={row} className="grid grid-cols-7">
            {Array.from({ length: 7 }).map((_, col) => (
              <div
                key={col}
                className="min-h-[90px] border-b border-r border-[#27272A]/50 p-1.5"
              >
                <Skeleton className="h-5 w-5 rounded-full mb-2" />
                {(row + col) % 3 === 0 && <Skeleton className="h-3.5 w-full rounded mb-0.5" />}
                {(row + col) % 4 === 0 && <Skeleton className="h-3.5 w-3/4 rounded" />}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend skeleton */}
      <div className="mt-6 flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
