import * as React from "react";
import { Skeleton } from "./base";
import {
  CardSkeleton,
  DashboardStatsSkeleton,
  FormSkeleton,
  ListSkeleton,
  TableSkeleton,
} from "./variants";

export const AuthLayoutSkeleton = React.memo(() => (
  <div className="min-h-screen bg-background p-4">
    <div className="mx-auto flex min-h-screen max-w-md items-center">
      <FormSkeleton rows={3} />
    </div>
  </div>
));
AuthLayoutSkeleton.displayName = "AuthLayoutSkeleton";

export const AdminLayoutSkeleton = React.memo(() => (
  <div className="min-h-screen bg-background">
    <div className="flex min-h-screen">
      <aside className="hidden w-72 border-r border-border/60 bg-card p-4 lg:block">
        <Skeleton className="mb-6 h-10 w-10" rounded="full" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, idx) => (
            <Skeleton key={idx} className="h-9 w-full" rounded="lg" />
          ))}
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <DashboardStatsSkeleton />
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <TableSkeleton rows={5} />
          </div>
          <CardSkeleton rows={4} />
        </div>
      </main>
    </div>
  </div>
));
AdminLayoutSkeleton.displayName = "AdminLayoutSkeleton";

export const ManagerLayoutSkeleton = React.memo(() => (
  <div className="min-h-screen bg-slate-50">
    <div className="flex min-h-screen">
      <aside className="hidden w-72 border-r border-slate-200 bg-white p-4 lg:block">
        <Skeleton className="mb-6 h-10 w-32" rounded="lg" />
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, idx) => (
            <Skeleton key={idx} className="h-9 w-full" rounded="lg" />
          ))}
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-6">
        <DashboardStatsSkeleton />
        <div className="mt-6">
          <TableSkeleton rows={5} />
        </div>
      </main>
    </div>
  </div>
));
ManagerLayoutSkeleton.displayName = "ManagerLayoutSkeleton";

export const WaiterLayoutSkeleton = React.memo(() => (
  <div className="min-h-screen bg-slate-50">
    <header className="border-b border-slate-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <Skeleton className="h-8 w-40" rounded="lg" />
        <div className="hidden gap-2 md:flex">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-9 w-24" rounded="lg" />
          ))}
        </div>
        <Skeleton className="h-9 w-24" rounded="lg" />
      </div>
    </header>
    <main className="mx-auto max-w-7xl p-4 md:p-6">
      <ListSkeleton rows={6} />
    </main>
  </div>
));
WaiterLayoutSkeleton.displayName = "WaiterLayoutSkeleton";

export const CustomerLayoutSkeleton = React.memo(() => (
  <div className="min-h-screen bg-background p-4 sm:p-6">
    <div className="mx-auto max-w-6xl space-y-6">
      <Skeleton className="h-10 w-48" rounded="lg" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <CardSkeleton key={idx} rows={2} />
        ))}
      </div>
    </div>
  </div>
));
CustomerLayoutSkeleton.displayName = "CustomerLayoutSkeleton";
