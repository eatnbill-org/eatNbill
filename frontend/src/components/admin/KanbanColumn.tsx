import * as React from "react";

import { cn } from "@/lib/utils";

export function KanbanColumn({
  title,
  count,
  className,
  children,
}: {
  title: string;
  count: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex min-w-[280px] flex-1 flex-col", className)} aria-label={title}>
      <header className="flex items-center justify-between rounded-xl border bg-card px-3 py-2 shadow-elev-1">
        <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
        <span className="rounded-full border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{count}</span>
      </header>

      <div className="mt-3 flex flex-1 flex-col gap-3">{children}</div>
    </section>
  );
}
