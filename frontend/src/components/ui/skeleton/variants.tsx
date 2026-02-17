import * as React from "react";
import { Skeleton } from "./base";

interface RepeatedProps {
  rows?: number;
}

export const CardSkeleton = React.memo(({ rows = 3 }: RepeatedProps) => (
  <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
    <Skeleton className="mb-4 h-5 w-1/3" />
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-4 w-full" />
      ))}
    </div>
  </div>
));
CardSkeleton.displayName = "CardSkeleton";

export const ListSkeleton = React.memo(({ rows = 6 }: RepeatedProps) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3">
        <Skeleton className="h-10 w-10" rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <Skeleton className="h-6 w-16" rounded="full" />
      </div>
    ))}
  </div>
));
ListSkeleton.displayName = "ListSkeleton";

export const FormSkeleton = React.memo(({ rows = 4 }: RepeatedProps) => (
  <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
    <Skeleton className="mb-6 h-6 w-1/2" />
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" rounded="lg" />
        </div>
      ))}
    </div>
    <div className="mt-6 flex justify-end gap-3">
      <Skeleton className="h-10 w-24" rounded="lg" />
      <Skeleton className="h-10 w-28" rounded="lg" />
    </div>
  </div>
));
FormSkeleton.displayName = "FormSkeleton";

export const TableSkeleton = React.memo(({ rows = 6 }: RepeatedProps) => (
  <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
    <div className="grid grid-cols-4 gap-4 border-b border-border/60 px-4 py-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-14" />
    </div>
    <div className="divide-y divide-border/60">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="grid grid-cols-4 gap-4 px-4 py-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  </div>
));
TableSkeleton.displayName = "TableSkeleton";

export const DashboardStatsSkeleton = React.memo(() => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
        <Skeleton className="mb-3 h-3 w-24" />
        <Skeleton className="mb-2 h-8 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
    ))}
  </div>
));
DashboardStatsSkeleton.displayName = "DashboardStatsSkeleton";
