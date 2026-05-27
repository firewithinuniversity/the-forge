import { SkeletonCard } from "../components/ui/Skeleton";

export default function ProjectsLoading() {
  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="h-7 w-24 animate-pulse rounded-lg bg-[#1A1A1E] mb-2" />
        <div className="h-4 w-40 animate-pulse rounded-lg bg-[#1A1A1E]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="h-44" />
        ))}
      </div>
    </div>
  );
}
