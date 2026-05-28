import { Skeleton } from "../components/ui/Skeleton";

export default function TimelineLoading() {
  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="h-7 w-24 animate-pulse rounded-lg bg-[#1A1A1E] mb-2" />
        <div className="h-4 w-56 animate-pulse rounded-lg bg-[#1A1A1E]" />
      </div>
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <Skeleton className="h-3 w-3 rounded-full" />
              {i < 4 && <div className="w-px flex-1 bg-[#27272A]" />}
            </div>
            <div className="flex-1 pb-6">
              <Skeleton className="h-4 w-64 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
