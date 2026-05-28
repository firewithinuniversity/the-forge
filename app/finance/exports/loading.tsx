import { Skeleton } from "@/app/components/ui/Skeleton";

export default function ExportsLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-5 w-80 mb-8" />
      <div className="space-y-6">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
