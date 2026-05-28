import { SkeletonCard } from "./components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="h-7 w-32 animate-pulse rounded-lg bg-[#1A1A1E] mb-2" />
        <div className="h-4 w-56 animate-pulse rounded-lg bg-[#1A1A1E]" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
          <SkeletonCard className="h-40" />
          <SkeletonCard className="h-40" />
        </div>
        <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-[#27272A]/50 last:border-0">
              <div className="h-2 w-2 rounded-full animate-pulse bg-[#1A1A1E]" />
              <div className="flex-1">
                <div className="h-4 w-36 animate-pulse rounded bg-[#1A1A1E] mb-1" />
                <div className="h-3 w-24 animate-pulse rounded bg-[#1A1A1E]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
