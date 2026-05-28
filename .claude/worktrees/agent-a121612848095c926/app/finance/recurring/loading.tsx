import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";

export default function RecurringLoading() {
  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="h-7 w-48 animate-pulse rounded-lg bg-[#1A1A1E] mb-2" />
        <div className="h-4 w-80 animate-pulse rounded-lg bg-[#1A1A1E]" />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonTable rows={6} cols={6} />
    </div>
  );
}
