/**
 * FloorPlanEditor — drag-and-drop floor plan for restaurant tables
 * Uses HTML5 drag events. Tables with x/y positions are shown on a grid.
 * Tables without positions appear in the "Unplaced" sidebar.
 */
import * as React from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useTableStore } from "@/stores/tables";
import { useRealtimeStore } from "@/stores/realtime/realtime.store";
import { useRestaurantStore } from "@/stores/restaurant/restaurant.store";
import type { RestaurantTable } from "@/types/table";
import { cn } from "@/lib/utils";
import { Armchair, Circle, Square, Trash2, RotateCcw, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";

const GRID_COLS = 10;
const GRID_ROWS = 8;

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 border-emerald-400 text-emerald-800",
  OCCUPIED: "bg-rose-100 border-rose-400 text-rose-800",
  RESERVED: "bg-amber-100 border-amber-400 text-amber-800",
};

interface PlacedTable extends RestaurantTable {
  x_position: number;
  y_position: number;
}

export function FloorPlanEditor() {
  const { tables, fetchTables } = useTableStore();
  const { restaurant } = useRestaurantStore();
  const subscribeToRestaurantOrders = useRealtimeStore((s) => s.subscribeToRestaurantOrders);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [realtimeActive, setRealtimeActive] = React.useState(false);

  React.useEffect(() => { void fetchTables(); }, [fetchTables]);

  // Realtime: refresh table statuses when any order changes (order → table status linkage)
  React.useEffect(() => {
    if (!restaurant?.id) return;
    setRealtimeActive(true);
    const unsub = subscribeToRestaurantOrders(restaurant.id, () => {
      void fetchTables();
    });
    return () => { unsub(); setRealtimeActive(false); };
  }, [restaurant?.id, subscribeToRestaurantOrders, fetchTables]);

  const activeTables = tables.filter(t => t.is_active);
  const placed: PlacedTable[] = activeTables.filter(
    (t): t is PlacedTable => t.x_position != null && t.y_position != null
  );
  const unplaced = activeTables.filter(t => t.x_position == null || t.y_position == null);

  // Map grid position → table (for occupied-cell check)
  const cellMap = new Map<string, PlacedTable>();
  for (const t of placed) {
    cellMap.set(`${t.x_position},${t.y_position}`, t);
  }

  const updatePosition = async (tableId: string, x: number | null, y: number | null, shape?: string | null) => {
    setSaving(tableId);
    try {
      await apiClient.patch(`/tables/${tableId}`, { x_position: x, y_position: y, ...(shape !== undefined ? { shape } : {}) });
      await fetchTables();
    } catch (e: any) {
      toast.error(e.message || "Failed to update position");
    } finally { setSaving(null); }
  };

  const handleDragStart = (e: React.DragEvent, tableId: string) => {
    setDraggingId(tableId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", tableId);
  };

  const handleDropOnCell = async (e: React.DragEvent, col: number, row: number) => {
    e.preventDefault();
    const tableId = e.dataTransfer.getData("text/plain");
    if (!tableId) return;
    // Check if cell is occupied by a different table
    const occupant = cellMap.get(`${col},${row}`);
    if (occupant && occupant.id !== tableId) {
      toast.error(`Cell occupied by Table ${occupant.table_number}`);
      return;
    }
    await updatePosition(tableId, col, row);
    setDraggingId(null);
  };

  const handleDropToUnplace = async (e: React.DragEvent) => {
    e.preventDefault();
    const tableId = e.dataTransfer.getData("text/plain");
    if (!tableId) return;
    await updatePosition(tableId, null, null);
    setDraggingId(null);
  };

  const toggleShape = (table: RestaurantTable) => {
    const newShape = table.shape === "CIRCLE" ? "RECTANGLE" : "CIRCLE";
    void updatePosition(table.id, table.x_position ?? null, table.y_position ?? null, newShape);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start gap-4 flex-wrap">
        {/* Grid */}
        <div className="flex-1 min-w-0">
          <div
            className="grid gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-3 select-none"
            style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(52px, 1fr))` }}
          >
            {Array.from({ length: GRID_ROWS }, (_, row) =>
              Array.from({ length: GRID_COLS }, (_, col) => {
                const table = cellMap.get(`${col},${row}`);
                const isLoading = table && saving === table.id;
                return (
                  <div
                    key={`${col},${row}`}
                    className={cn(
                      "h-14 rounded-xl border-2 border-dashed flex items-center justify-center transition-colors",
                      table ? "border-transparent" : "border-slate-200 bg-white hover:border-primary/30 hover:bg-primary/5"
                    )}
                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                    onDrop={e => void handleDropOnCell(e, col, row)}
                  >
                    {table ? (
                      <div
                        draggable
                        onDragStart={e => handleDragStart(e, table.id)}
                        title={`Table ${table.table_number} — ${table.seats} seats`}
                        className={cn(
                          "w-full h-full flex flex-col items-center justify-center border-2 font-bold text-xs cursor-grab transition-all",
                          table.shape === "CIRCLE" ? "rounded-full" : "rounded-xl",
                          STATUS_COLORS[table.table_status] ?? "bg-slate-100 border-slate-300",
                          isLoading && "opacity-50",
                          draggingId === table.id && "opacity-40 scale-95"
                        )}
                        onClick={() => toggleShape(table)}
                      >
                        <span className="leading-none text-[11px] font-black">{table.table_number}</span>
                        <span className="text-[9px] leading-none mt-0.5 opacity-60">{table.seats}s</span>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 px-1">
            <div className="flex gap-3 text-[10px] font-bold text-slate-400">
              {[["AVAILABLE", "emerald"], ["OCCUPIED", "rose"], ["RESERVED", "amber"]].map(([status, color]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <div className={`h-3 w-3 rounded bg-${color}-100 border-2 border-${color}-400`} />
                  {status}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              {realtimeActive && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                  <Wifi className="h-3 w-3" />
                  Live
                </span>
              )}
              <p className="text-[10px] text-slate-400">Click table to toggle shape (rect ↔ circle)</p>
            </div>
          </div>
        </div>

        {/* Unplaced sidebar */}
        <div className="w-40 shrink-0">
          <div
            className="rounded-2xl border border-slate-200 bg-white p-3 min-h-48 space-y-1.5"
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
            onDrop={e => void handleDropToUnplace(e)}
          >
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Unplaced</p>
            {unplaced.length === 0 ? (
              <p className="text-[10px] text-slate-300 text-center py-4">All placed!</p>
            ) : unplaced.map(table => (
              <div
                key={table.id}
                draggable
                onDragStart={e => handleDragStart(e, table.id)}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-2 rounded-xl border-2 cursor-grab text-xs font-bold transition-all",
                  STATUS_COLORS[table.table_status] ?? "bg-slate-50 border-slate-200",
                  draggingId === table.id && "opacity-40 scale-95",
                  saving === table.id && "opacity-50"
                )}
              >
                {table.shape === "CIRCLE" ? <Circle className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                <span>T{table.table_number}</span>
                <span className="text-[10px] opacity-50 ml-auto">{table.seats}s</span>
              </div>
            ))}
            <p className="text-[9px] text-slate-300 text-center pt-1">Drop here to unplace</p>
          </div>
        </div>
      </div>

      {placed.length === 0 && unplaced.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <Armchair className="h-10 w-10 mx-auto mb-2 text-slate-200" />
          <p className="text-sm">No tables yet. Add tables in the Tables tab first.</p>
        </div>
      )}
    </div>
  );
}
