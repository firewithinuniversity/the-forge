import { SkeletonCard, SkeletonTable } from "../components/ui/Skeleton";

export default function FinanceLoading() {
  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="h-7 w-24 animate-pulse rounded-lg bg-[#1A1A1E] mb-2" />
        <div className="h-4 w-64 animate-pulse rounded-lg bg-[#1A1A1E]" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-5 mb-8">
        <div className="h-4 w-32 animate-pulse rounded bg-[#1A1A1E] mb-4" />
        <div className="h-[280px] animate-pulse rounded bg-[#1A1A1E]" />
      </div>
      <SkeletonTable rows={6} cols={5} />
    </div>
  );
}
