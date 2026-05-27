import { Skeleton } from "../components/ui/Skeleton";

export default function NotesLoading() {
  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="h-7 w-20 animate-pulse rounded-lg bg-[#1A1A1E] mb-2" />
        <div className="h-4 w-48 animate-pulse rounded-lg bg-[#1A1A1E]" />
      </div>
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
