/**
 * FloorPlanEditor — drag-and-drop floor plan for restaurant tables
 * Features:
 *  - Explicit CSS Grid placement (tables can span 2×1, 1×2, 2×2 cells)
 *  - Zoom slider (0.5× – 2×)
 *  - Click to select; arrow keys to nudge selected table
 *  - Right-click context menu to resize table span
 *  - Click-on-placed-table toggles shape (rect ↔ circle)
 *  - Supabase Realtime for live status updates
 */
import * as React from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { useTableStore } from "@/stores/tables";
import { useRealtimeStore } from "@/stores/realtime/realtime.store";
import { useRestaurantStore } from "@/stores/restaurant/restaurant.store";
import type { RestaurantTable } from "@/types/table";
import { cn } from "@/lib/utils";
import { Armchair, Circle, Square, Wifi, ZoomIn, ZoomOut, Move } from "lucide-react";
import { Button } from "@/components/ui/button";

const GRID_COLS = 10;
const GRID_ROWS = 8;
const BASE_CELL_PX = 56; // px at zoom 1.0

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 border-emerald-400 text-emerald-800",
  OCCUPIED: "bg-rose-100 border-rose-400 text-rose-800",
  RESERVED: "bg-amber-100 border-amber-400 text-amber-800",
};

interface PlacedTable extends RestaurantTable {
  x_position: number;
  y_position: number;
}

type SpanSize = "1x1" | "2x1" | "1x2" | "2x2";

interface ContextMenu {
  tableId: string;
  x: number;
  y: number;
}

export function FloorPlanEditor() {
  const { tables, fetchTables } = useTableStore();
  const { restaurant } = useRestaurantStore();
  const subscribeToRestaurantOrders = useRealtimeStore((s) => s.subscribeToRestaurantOrders);

  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [realtimeActive, setRealtimeActive] = React.useState(false);
  const [zoom, setZoom] = React.useState(1.0);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [contextMenu, setContextMenu] = React.useState<ContextMenu | null>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);

  const cellPx = Math.round(BASE_CELL_PX * zoom);

  React.useEffect(() => { void fetchTables(); }, [fetchTables]);

  // Realtime: refresh table statuses when orders change
  React.useEffect(() => {
    if (!restaurant?.id) return;
    setRealtimeActive(true);
    const unsub = subscribeToRestaurantOrders(restaurant.id, () => { void fetchTables(); });
    return () => { unsub(); setRealtimeActive(false); };
  }, [restaurant?.id, subscribeToRestaurantOrders, fetchTables]);

  // Close context menu on outside click
  React.useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // Keyboard nudge
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selectedId || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      const table = tables.find(t => t.id === selectedId);
      if (!table || table.x_position == null || table.y_position == null) return;
      e.preventDefault();
      const dx = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      const dy = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
      const nx = Math.max(0, Math.min(GRID_COLS - (table.table_width ?? 1), table.x_position + dx));
      const ny = Math.max(0, Math.min(GRID_ROWS - (table.table_height ?? 1), table.y_position + dy));
      if (nx === table.x_position && ny === table.y_position) return;
      // Check if target cells are free
      const w = table.table_width ?? 1;
      const h = table.table_height ?? 1;
      const blocked = placedTables.some(t => {
        if (t.id === selectedId) return false;
        const tw = t.table_width ?? 1;
        const th = t.table_height ?? 1;
        // Check overlap with new position
        return (
          nx < t.x_position + tw && nx + w > t.x_position &&
          ny < t.y_position + th && ny + h > t.y_position
        );
      });
      if (blocked) { toast.error("Cell occupied"); return; }
      void updatePosition(selectedId, nx, ny);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, tables]);

  const activeTables = tables.filter(t => t.is_active);
  const placedTables: PlacedTable[] = activeTables.filter(
    (t): t is PlacedTable => t.x_position != null && t.y_position != null
  );
  const unplaced = activeTables.filter(t => t.x_position == null || t.y_position == null);

  // Build set of all cells covered by placed tables
  const coveredCells = new Set<string>();
  for (const t of placedTables) {
    const w = t.table_width ?? 1;
    const h = t.table_height ?? 1;
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        coveredCells.add(`${t.x_position + dx},${t.y_position + dy}`);
      }
    }
  }

  const updatePosition = async (
    tableId: string,
    x: number | null,
    y: number | null,
    extra?: { shape?: string | null; table_width?: number; table_height?: number }
  ) => {
    setSaving(tableId);
    try {
      await apiClient.patch(`/tables/${tableId}`, {
        x_position: x,
        y_position: y,
        ...extra,
      });
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
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    const w = table.table_width ?? 1;
    const h = table.table_height ?? 1;
    // Check if any target cell is occupied by a different table
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        const occupant = placedTables.find(
          t => t.id !== tableId &&
            col + dx >= t.x_position && col + dx < t.x_position + (t.table_width ?? 1) &&
            row + dy >= t.y_position && row + dy < t.y_position + (t.table_height ?? 1)
        );
        if (occupant) {
          toast.error(`Cell occupied by Table ${occupant.table_number}`);
          setDraggingId(null);
          return;
        }
      }
    }
    // Clamp to grid bounds
    const clampedCol = Math.min(col, GRID_COLS - w);
    const clampedRow = Math.min(row, GRID_ROWS - h);
    await updatePosition(tableId, clampedCol, clampedRow);
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
    void updatePosition(table.id, table.x_position ?? null, table.y_position ?? null, { shape: newShape });
  };

  const applySpan = (tableId: string, span: SpanSize) => {
    const table = tables.find(t => t.id === tableId);
    if (!table || table.x_position == null || table.y_position == null) return;
    const [w, h] = span.split("x").map(Number);
    // Clamp to grid
    const clampedX = Math.min(table.x_position, GRID_COLS - w);
    const clampedY = Math.min(table.y_position, GRID_ROWS - h);
    void updatePosition(tableId, clampedX, clampedY, { table_width: w, table_height: h });
    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, tableId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ tableId, x: e.clientX, y: e.clientY });
  };

  return (
    <div className="p-4 space-y-3">
      {/* Zoom controls */}
      <div className="flex items-center gap-3">
        <ZoomOut className="h-4 w-4 text-slate-400" />
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={zoom}
          onChange={e => setZoom(parseFloat(e.target.value))}
          className="w-32 accent-primary"
        />
        <ZoomIn className="h-4 w-4 text-slate-400" />
        <span className="text-xs text-slate-400 font-mono w-8">{Math.round(zoom * 100)}%</span>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-slate-400 ml-auto"
          onClick={() => setZoom(1)}
        >
          Reset
        </Button>
      </div>

      <div className="flex items-start gap-4 flex-wrap">
        {/* Grid */}
        <div className="flex-1 min-w-0 overflow-auto">
          <div
            ref={gridRef}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3 select-none relative"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${GRID_COLS}, ${cellPx}px)`,
              gridTemplateRows: `repeat(${GRID_ROWS}, ${cellPx}px)`,
              gap: 4,
              width: "fit-content",
            }}
            onClick={() => setSelectedId(null)}
          >
            {/* Empty drop-target cells */}
            {Array.from({ length: GRID_ROWS }, (_, row) =>
              Array.from({ length: GRID_COLS }, (_, col) => {
                const isCovered = coveredCells.has(`${col},${row}`);
                return (
                  <div
                    key={`cell-${col},${row}`}
                    style={{ gridColumn: col + 1, gridRow: row + 1 }}
                    className={cn(
                      "rounded-xl border-2 border-dashed transition-colors",
                      isCovered
                        ? "border-transparent pointer-events-none"
                        : "border-slate-200 bg-white hover:border-primary/30 hover:bg-primary/5"
                    )}
                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                    onDrop={e => void handleDropOnCell(e, col, row)}
                  />
                );
              })
            )}

            {/* Placed tables — on top of empty cells */}
            {placedTables.map(table => {
              const w = table.table_width ?? 1;
              const h = table.table_height ?? 1;
              const isLoading = saving === table.id;
              const isSelected = selectedId === table.id;
              return (
                <div
                  key={table.id}
                  draggable
                  onDragStart={e => handleDragStart(e, table.id)}
                  onContextMenu={e => handleContextMenu(e, table.id)}
                  onClick={e => { e.stopPropagation(); setSelectedId(table.id); }}
                  onDoubleClick={() => toggleShape(table)}
                  title={`Table ${table.table_number} — ${table.seats} seats\nRight-click to resize\nDbl-click to toggle shape\nArrow keys to nudge`}
                  style={{
                    gridColumn: `${table.x_position + 1} / span ${w}`,
                    gridRow: `${table.y_position + 1} / span ${h}`,
                    zIndex: 1,
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center border-2 font-bold text-xs cursor-grab transition-all",
                    table.shape === "CIRCLE" ? "rounded-full" : "rounded-xl",
                    STATUS_COLORS[table.table_status] ?? "bg-slate-100 border-slate-300",
                    isLoading && "opacity-50",
                    draggingId === table.id && "opacity-40 scale-95",
                    isSelected && "ring-2 ring-primary ring-offset-1"
                  )}
                >
                  <span className="leading-none font-black" style={{ fontSize: Math.max(9, 11 * zoom) }}>{table.table_number}</span>
                  <span className="leading-none mt-0.5 opacity-60" style={{ fontSize: Math.max(8, 9 * zoom) }}>{table.seats}s</span>
                  {(w > 1 || h > 1) && (
                    <span className="leading-none opacity-40" style={{ fontSize: Math.max(7, 8 * zoom) }}>{w}×{h}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-2 px-1">
            <div className="flex gap-3 text-[10px] font-bold text-slate-400">
              {[["AVAILABLE", "emerald"], ["OCCUPIED", "rose"], ["RESERVED", "amber"]].map(([status, color]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <div className={`h-3 w-3 rounded bg-${color}-100 border-2 border-${color}-400`} />
                  {status}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {realtimeActive && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                  <Wifi className="h-3 w-3" /> Live
                </span>
              )}
              {selectedId && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                  <Move className="h-3 w-3" /> Arrow keys to nudge
                </span>
              )}
              <p className="text-[10px] text-slate-400">Dbl-click = shape · Right-click = resize</p>
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

      {placedTables.length === 0 && unplaced.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <Armchair className="h-10 w-10 mx-auto mb-2 text-slate-200" />
          <p className="text-sm">No tables yet. Add tables in the Tables tab first.</p>
        </div>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-xl py-1 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1.5 border-b">
            Table Size
          </p>
          {(["1x1", "2x1", "1x2", "2x2"] as SpanSize[]).map(span => (
            <button
              key={span}
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 font-medium text-slate-700"
              onClick={() => applySpan(contextMenu.tableId, span)}
            >
              {span === "1x1" ? "1×1 — Normal" : span === "2x1" ? "2×1 — Wide" : span === "1x2" ? "1×2 — Tall" : "2×2 — Large"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
