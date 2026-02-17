import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Printer,
  Download,
  RefreshCw,
  QrCode as QrIcon,
  Database,
  ExternalLink,
  Copy,
  Link as LinkIcon,
  MapPin,
  TableProperties,
  AlertTriangle,
  Trash2,
  CheckSquare,
} from "lucide-react";
import { deleteTableQRCodes, getTableQRCode, regenerateAllQRCodes } from "@/services/qrcode.service";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Table {
  id: string;
  name: string;
  tableNumber?: string;
  hallName?: string;
}

interface QRCodesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tables: Table[];
  storeName: string;
  slug: string;
  onDeleted?: () => void;
}

interface TableQRCode {
  table_id: string;
  menu_url: string;
  qr_png_url: string;
  qr_pdf_url: string;
  table_number?: string;
  hall_name?: string | null;
}

const PROD_BASE_URL = "https://eatnbill.com";

function resolveLiveLink(url: string) {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const isLocal = /localhost|127\.0\.0\.1/i.test(parsed.hostname);
    const isProdUi = window.location.hostname === "eatnbill.com" || window.location.hostname.endsWith(".eatnbill.com");

    if (isProdUi && isLocal) {
      const prod = new URL(PROD_BASE_URL);
      parsed.protocol = prod.protocol;
      parsed.host = prod.host;
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

export function QRCodesSheet({ open, onOpenChange, tables, storeName, slug, onDeleted }: QRCodesSheetProps) {
  const [qrCodes, setQrCodes] = React.useState<Map<string, TableQRCode>>(new Map());
  const [loading, setLoading] = React.useState(false);
  const [regenerating, setRegenerating] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteMode, setDeleteMode] = React.useState<'ALL' | 'HALL' | 'RANGE' | 'SELECTED'>('ALL');
  const [selectedHall, setSelectedHall] = React.useState<string>("");
  const [rangeStart, setRangeStart] = React.useState<string>("");
  const [rangeEnd, setRangeEnd] = React.useState<string>("");
  const [selectedTableIds, setSelectedTableIds] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (open && tables.length > 0) {
      void fetchQRCodes();
    }
  }, [open, tables]);

  React.useEffect(() => {
    if (!deleteOpen) return;
    setDeleteMode('ALL');
    setSelectedHall("");
    setRangeStart("");
    setRangeEnd("");
    setSelectedTableIds(new Set());
  }, [deleteOpen]);

  const fetchQRCodes = async () => {
    setLoading(true);
    try {
      const qrMap = new Map<string, TableQRCode>();

      await Promise.all(
        tables.map(async (table) => {
          try {
            const qrCode = await getTableQRCode(table.id);
            qrMap.set(table.id, {
              ...qrCode,
              menu_url: resolveLiveLink(qrCode.menu_url),
            });
          } catch (error) {
            console.error(`Failed to fetch QR code for table ${table.name}:`, error);
          }
        })
      );

      setQrCodes(qrMap);
    } catch (error) {
      console.error("Failed to fetch QR codes:", error);
      toast.error("Failed to load QR codes");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateAll = async () => {
    setRegenerating(true);
    try {
      const result = await regenerateAllQRCodes();
      toast.success(`Regenerated ${result.regenerated} QR codes`);
      await fetchQRCodes();
    } catch (error) {
      console.error("Failed to regenerate QR codes:", error);
      toast.error("Failed to regenerate QR codes");
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownloadPDF = (table: Table) => {
    const qrCode = qrCodes.get(table.id);
    if (qrCode?.qr_pdf_url) {
      window.open(qrCode.qr_pdf_url, "_blank");
    }
  };

  const handleOpenLiveLink = (table: Table) => {
    const qrCode = qrCodes.get(table.id);
    if (qrCode?.menu_url) {
      window.open(qrCode.menu_url, "_blank");
    }
  };

  const handleCopyLiveLink = async (table: Table) => {
    const qrCode = qrCodes.get(table.id);
    if (!qrCode?.menu_url) return;

    try {
      await navigator.clipboard.writeText(qrCode.menu_url);
      toast.success("Live link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const qrRows = React.useMemo(() => {
    return tables
      .map((table) => {
        const qrCode = qrCodes.get(table.id);
        if (!qrCode) return null;

        const hallName = qrCode.hall_name || table.hallName || "Unassigned";
        const tableNumber = qrCode.table_number || table.tableNumber || table.name;
        const sequenceMatch = tableNumber.match(/(\d+)(?!.*\d)/);
        const sequence = sequenceMatch ? Number(sequenceMatch[1]) : null;

        return {
          tableId: table.id,
          tableNumber,
          hallName,
          sequence,
        };
      })
      .filter((row): row is { tableId: string; tableNumber: string; hallName: string; sequence: number | null } => Boolean(row));
  }, [tables, qrCodes]);

  const hallOptions = React.useMemo(() => {
    return Array.from(new Set(qrRows.map((row) => row.hallName))).sort((a, b) => a.localeCompare(b));
  }, [qrRows]);

  const toggleSelectedTable = (tableId: string) => {
    setSelectedTableIds((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) {
        next.delete(tableId);
      } else {
        next.add(tableId);
      }
      return next;
    });
  };

  const handleDeleteQRCodes = async () => {
    const payload: {
      mode: 'ALL' | 'HALL' | 'RANGE' | 'SELECTED';
      hall_id?: string;
      range_start?: number;
      range_end?: number;
      table_ids?: string[];
    } = { mode: deleteMode };

    if (deleteMode === 'HALL') {
      const hallRow = qrRows.find((row) => row.hallName === selectedHall);
      if (!selectedHall || !hallRow) {
        toast.error("Select a valid hall");
        return;
      }
      const tableInHall = tables.find((t) => t.id === hallRow.tableId);
      if (!tableInHall?.hall_id) {
        toast.error("Could not resolve hall id");
        return;
      }
      payload.hall_id = tableInHall.hall_id;
    }

    if (deleteMode === 'RANGE') {
      const start = Number(rangeStart);
      const end = Number(rangeEnd);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end <= 0 || start > end) {
        toast.error("Enter a valid range");
        return;
      }
      payload.range_start = start;
      payload.range_end = end;
    }

    if (deleteMode === 'SELECTED') {
      if (selectedTableIds.size === 0) {
        toast.error("Select at least one table");
        return;
      }
      payload.table_ids = Array.from(selectedTableIds);
    }

    setDeleting(true);
    try {
      const result = await deleteTableQRCodes(payload);
      toast.success(`Deleted ${result.deleted_count} QR code(s)`);
      if (result.failed_count > 0) {
        toast.warning(`${result.failed_count} QR code(s) could not be deleted`);
      }
      setDeleteOpen(false);
      await fetchQRCodes();
      onDeleted?.();
    } catch (error) {
      console.error("Failed to delete QR codes:", error);
      toast.error("Failed to delete QR codes");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-5xl overflow-y-auto border-l border-slate-100 bg-slate-50/30 backdrop-blur-xl p-0 shadow-2xl">
        <style>{`@media print { body * { visibility: hidden !important; } #printable-qr, #printable-qr * { visibility: visible !important; } #printable-qr { position: absolute; left: 0; top: 0; width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 24px; background: white; } .no-print { display: none !important; } .print-card { break-inside: avoid; page-break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; box-shadow: none !important; } }`}</style>

        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 no-print">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <SheetHeader className="space-y-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 rounded-lg bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20">
                  <QrIcon className="w-3.5 h-3.5" />
                </div>
                <SheetTitle className="text-lg font-bold text-slate-800 tracking-tight uppercase">Table QR Codes</SheetTitle>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Hall, Table and Live Links</p>
            </SheetHeader>

            <div className="flex w-full sm:w-auto flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                className="h-10 rounded-xl px-4 border-rose-200 text-rose-600 font-bold uppercase tracking-widest text-[9px] hover:bg-rose-50 transition-all shadow-sm w-full sm:w-auto"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Delete QRs
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerateAll}
                disabled={regenerating}
                className="h-10 rounded-xl px-4 border-slate-200 text-slate-500 font-bold uppercase tracking-widest text-[9px] hover:bg-slate-50 transition-all shadow-sm w-full sm:w-auto"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 mr-2 text-primary", regenerating && "animate-spin")} />
                {regenerating ? "Syncing..." : "Regenerate All"}
              </Button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <RefreshCw className="w-10 h-10 animate-spin text-primary opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Database className="w-4 h-4 text-primary" />
                </div>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] animate-pulse">Loading QR Data...</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div
                id="printable-qr"
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {tables.map((t, idx) => {
                  const qrCode = qrCodes.get(t.id);
                  const hallName = qrCode?.hall_name || t.hallName || "Unassigned";
                  const tableNumber = qrCode?.table_number || t.tableNumber || t.name;
                  const fallbackLink = resolveLiveLink(`${window.location.origin}/${slug}/menu?table=${encodeURIComponent(tableNumber)}`);
                  const liveLink = qrCode?.menu_url || fallbackLink;

                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.04 }}
                      className="print-card group relative bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-lg transition-all"
                    >
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#0f766e_1px,transparent_1px)] [background-size:12px_12px] rounded-2xl" />

                      <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400 text-center">{storeName}</p>
                        <h3 className="text-xl font-black tracking-tight text-slate-900 text-center mt-1">Welcome</h3>

                        {qrCode ? (
                          <div className="grid grid-cols-1 sm:grid-cols-[150px,1fr] gap-4 mt-4 items-start">
                            <div className="mx-auto w-[150px] h-[150px] p-2 bg-slate-50 rounded-xl border border-slate-100">
                              <img src={qrCode.qr_png_url} alt={`QR for ${tableNumber}`} className="w-full h-full object-contain" />
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-slate-700">
                                <TableProperties className="w-4 h-4 text-primary" />
                                <span className="text-sm font-bold">Table: {tableNumber}</span>
                              </div>

                              <div className="flex items-center gap-2 text-slate-700">
                                <MapPin className="w-4 h-4 text-primary" />
                                <span className="text-sm font-semibold">Hall: {hallName}</span>
                              </div>

                              <div>
                                <div className="flex items-center gap-2 text-slate-700 mb-1">
                                  <LinkIcon className="w-4 h-4 text-primary" />
                                  <span className="text-sm font-semibold">Live Link</span>
                                </div>
                                <p className="text-xs text-slate-500 break-all line-clamp-3 sm:line-clamp-2">{liveLink || "-"}</p>
                              </div>

                              <div className="flex flex-wrap gap-2 no-print">
                                <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold" onClick={() => handleOpenLiveLink(t)}>
                                  <ExternalLink className="w-3 h-3 mr-1" /> Open
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold" onClick={() => handleCopyLiveLink(t)}>
                                  <Copy className="w-3 h-3 mr-1" /> Copy
                                </Button>
                                <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold" onClick={() => handleDownloadPDF(t)}>
                                  <Download className="w-3 h-3 mr-1" /> PDF
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 w-full h-44 bg-slate-50 rounded-xl flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200">
                            <RefreshCw className="w-5 h-5 animate-spin text-slate-300" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Generating...</p>
                          </div>
                        )}

                        <p className="mt-4 text-center text-[11px] font-semibold text-slate-500">Powered by eatnbill.com</p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          )}

          {!loading && tables.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-10 sticky bottom-8 flex justify-center w-full px-4 md:px-0 no-print">
              <Button
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 h-12 px-10 rounded-2xl font-bold uppercase tracking-widest text-[11px] text-white shadow-2xl shadow-primary/20 transition-all flex items-center gap-3 active:scale-95"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" />
                Print All Tables
              </Button>
            </motion.div>
          )}
        </div>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="h-5 w-5" />
                Delete Generated QR Codes
              </DialogTitle>
              <DialogDescription>
                This action is permanent. QR metadata and stored PNG/PDF files will be deleted and cannot be recovered.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(['ALL', 'HALL', 'RANGE', 'SELECTED'] as const).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    variant={deleteMode === mode ? "default" : "outline"}
                    className="h-9 text-[11px] font-bold"
                    onClick={() => setDeleteMode(mode)}
                  >
                    {mode}
                  </Button>
                ))}
              </div>

              {deleteMode === 'HALL' && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Select hall</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {hallOptions.map((hall) => (
                      <Button
                        key={hall}
                        type="button"
                        variant={selectedHall === hall ? "default" : "outline"}
                        className="h-8 text-[11px] justify-start"
                        onClick={() => setSelectedHall(hall)}
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        {hall}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {deleteMode === 'RANGE' && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600">
                    Delete by numeric table range (uses trailing number, e.g. `table-12`)
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Start"
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                    />
                    <span className="text-sm text-slate-500 text-center">to</span>
                    <Input
                      type="number"
                      placeholder="End"
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {deleteMode === 'SELECTED' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-600">Choose tables</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px]"
                      onClick={() => setSelectedTableIds(new Set(qrRows.map((row) => row.tableId)))}
                    >
                      <CheckSquare className="h-3 w-3 mr-1" />
                      Select All
                    </Button>
                  </div>
                  <div className="max-h-52 overflow-y-auto border rounded-md p-2 space-y-1">
                    {qrRows.map((row) => (
                      <label key={row.tableId} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedTableIds.has(row.tableId)}
                          onChange={() => toggleSelectedTable(row.tableId)}
                        />
                        <span className="font-medium">{row.tableNumber}</span>
                        <span className="text-xs text-slate-500">({row.hallName})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteQRCodes}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Permanently"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
