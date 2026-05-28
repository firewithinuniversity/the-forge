import { SkeletonCard, SkeletonTable } from "../../components/ui/Skeleton";

export default function TaxCenterLoading() {
  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="h-7 w-28 animate-pulse rounded-lg bg-[#1A1A1E] mb-2" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-[#1A1A1E]" />
      </div>
      <div className="rounded-xl border border-[#27272A] p-4 mb-6 animate-pulse bg-[#1A1A1E] h-20" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-64" />
      </div>
      <SkeletonTable rows={4} cols={6} />
    </div>
  );
}
