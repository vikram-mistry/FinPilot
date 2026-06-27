import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/skeleton";

type SkeletonVariant = "card" | "stat-card" | "table-row" | "chart" | "list-item";

export interface LoadingSkeletonProps {
  variant: SkeletonVariant;
  count?: number;
  className?: string;
}

function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-5", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </div>
  );
}

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-6 space-y-4", className)}>
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

function TableRowSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 py-3 px-4", className)}>
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border bg-card p-6", className)}>
      <div className="space-y-2 mb-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="flex items-end gap-2 h-40">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-md"
            style={{ height: `${30 + Math.random() * 70}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  );
}

function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 py-2.5", className)}>
      <Skeleton className="h-9 w-9 rounded-lg" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

const variantMap: Record<SkeletonVariant, React.FC<{ className?: string }>> = {
  card: CardSkeleton,
  "stat-card": StatCardSkeleton,
  "table-row": TableRowSkeleton,
  chart: ChartSkeleton,
  "list-item": ListItemSkeleton,
};

export function LoadingSkeleton({
  variant,
  count = 1,
  className,
}: LoadingSkeletonProps) {
  const Component = variantMap[variant];

  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} />
      ))}
    </div>
  );
}
