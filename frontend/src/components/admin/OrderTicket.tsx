import * as React from "react";
import { ArrowRight, Flame } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Order } from "@/types/demo";

type TicketAction = {
  label: string;
  variant: React.ComponentProps<typeof Button>["variant"];
  onClick: () => void;
};

function agoLabel(minutes: number) {
  if (minutes <= 0) return "just now";
  if (minutes === 1) return "1 min ago";
  return `${minutes} mins ago`;
}

export function OrderTicket({
  order,
  minutesAgo,
  isOverdue,
  onOpenDetails,
  action,
}: {
  order: Order;
  minutesAgo: number;
  isOverdue: boolean;
  onOpenDetails: () => void;
  action: TicketAction | null;
}) {
  const isZomato = order.source === "zomato";

  return (
    <article
      className={cn(
        "group rounded-2xl border bg-card shadow-elev-1",
        isOverdue ? "ring-1 ring-destructive/30" : "",
      )}
    >
      <button
        type="button"
        onClick={onOpenDetails}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-t-2xl px-3 py-2 text-left",
          isZomato ? "bg-destructive text-destructive-foreground" : "bg-info text-info-foreground",
        )}
        aria-label={`Open details for ${order.id}`}
      >
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold tracking-wide">
            {order.id} <span className="opacity-90">• {agoLabel(minutesAgo)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isOverdue && <Flame className="h-4 w-4" aria-label="Overdue" />}
          {isZomato && (
            <span
              className="grid h-5 w-5 place-items-center rounded-full bg-destructive-foreground/15 text-[10px] font-bold"
              aria-label="Zomato"
              title="Zomato"
            >
              Z
            </span>
          )}
        </div>
      </button>

      <div className="space-y-3 px-3 py-3">
        <div className="space-y-1">
          {order.items.map((it) => (
            <div key={it.id} className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-sm font-semibold leading-snug">
                <span className="mr-2 font-bold">{it.qty}x</span>
                <span className="break-words">{it.name}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t pt-3">
          <p className="min-w-0 truncate text-xs text-muted-foreground">{order.customerName}</p>
          {action ? (
            <Button size="sm" variant={action.variant} onClick={action.onClick} className="shrink-0">
              {action.label}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </div>
    </article>
  );
}
