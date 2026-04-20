import { Skeleton } from "@/components/ui/skeleton";

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card">
      <Skeleton className="aspect-square w-full" />
      <div className="flex flex-1 flex-col p-4">
        <Skeleton className="mb-2 h-3 w-1/4" />
        <Skeleton className="mb-1 h-5 w-3/4" />
        <Skeleton className="mt-1 h-3 w-1/2" />
        <div className="mt-6 flex items-center justify-between">
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
      <Skeleton className="h-full w-full" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
