import { Skeleton, SkeletonCard } from "../../components/ui/Skeleton";

export default function ProjectDetailLoading() {
  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Back link + title */}
      <div className="mb-6">
        <Skeleton className="h-4 w-24 mb-4" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-72 mt-2" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#27272A] pb-3">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, col) => (
          <div key={col} className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-3">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-5 rounded" />
            </div>
            {Array.from({ length: col === 0 ? 3 : col === 1 ? 2 : 1 }).map(
              (_, card) => (
                <SkeletonCard key={card} className="mb-2 last:mb-0" />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
