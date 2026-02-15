import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Printer, Download, RefreshCw, QrCode as QrIcon, Database, ArrowRight } from "lucide-react";
import { getTableQRCode, regenerateAllQRCodes } from "@/services/qrcode.service";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Table {
  id: string;
  name: string;
}

interface QRCodesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tables: Table[];
  storeName: string;
  slug: string;
}

interface TableQRCode {
  table_id: string;
  menu_url: string;
  qr_png_url: string;
  qr_pdf_url: string;
}

export function QRCodesSheet({ open, onOpenChange, tables, storeName, slug }: QRCodesSheetProps) {
  const [qrCodes, setQrCodes] = React.useState<Map<string, TableQRCode>>(new Map());
  const [loading, setLoading] = React.useState(false);
  const [regenerating, setRegenerating] = React.useState(false);

  // Fetch QR codes for all tables when sheet opens
  React.useEffect(() => {
    if (open && tables.length > 0) {
      fetchQRCodes();
    }
  }, [open, tables]);

  const fetchQRCodes = async () => {
    setLoading(true);
    try {
      const qrMap = new Map<string, TableQRCode>();

      // Fetch QR codes for each table
      await Promise.all(
        tables.map(async (table) => {
          try {
            const qrCode = await getTableQRCode(table.id);
            qrMap.set(table.id, qrCode);
          } catch (error) {
            console.error(`Failed to fetch QR code for table ${table.name}:`, error);
          }
        })
      );

      setQrCodes(qrMap);
    } catch (error) {
      console.error('Failed to fetch QR codes:', error);
      toast.error('Failed to load QR codes');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateAll = async () => {
    setRegenerating(true);
    try {
      const result = await regenerateAllQRCodes();
      toast.success(`Regenerated ${result.regenerated} QR codes`);
      await fetchQRCodes(); // Refresh the display
    } catch (error) {
      console.error('Failed to regenerate QR codes:', error);
      toast.error('Failed to regenerate QR codes');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownloadPDF = (table: Table) => {
    const qrCode = qrCodes.get(table.id);
    if (qrCode?.qr_pdf_url) {
      window.open(qrCode.qr_pdf_url, '_blank');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto border-l border-slate-100 bg-slate-50/30 backdrop-blur-xl p-0 shadow-2xl">
        <style>{`@media print { body * { visibility: hidden; } #printable-qr, #printable-qr * { visibility: visible; } #printable-qr { position: absolute; left: 0; top: 0; width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 20px; } }`}</style>

        {/* High-End Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
                  <QrIcon className="w-3.5 h-3.5" />
                </div>
                <SheetTitle className="text-lg font-black text-slate-800 tracking-tight uppercase">Node Activation</SheetTitle>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 italic">QR Deployment Matrix</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerateAll}
              disabled={regenerating}
              className="h-10 rounded-xl px-4 border-slate-200 text-slate-500 font-bold uppercase tracking-widest text-[9px] hover:bg-slate-50 transition-all shadow-sm group"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 mr-2 text-indigo-500", regenerating && "animate-spin")} />
              {regenerating ? "Syncing..." : "Protocol Reset"}
            </Button>
          </div>
        </div>

        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <RefreshCw className="w-10 h-10 animate-spin text-indigo-500 opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Database className="w-4 h-4 text-indigo-600" />
                </div>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Fetching Matrix Data...</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div
                id="printable-qr"
                className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {tables.map((t, idx) => {
                  const qrCode = qrCodes.get(t.id);
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group relative bg-white border border-slate-100 rounded-[1.5rem] p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 transition-all overflow-hidden"
                    >
                      {/* Grid Background Effect */}
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:12px_12px]" />

                      <div className="relative z-10 w-full">
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-300 mb-1 block group-hover:text-indigo-400 transition-colors">{storeName}</span>
                        <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase mb-4">{t.name}</h2>

                        {qrCode ? (
                          <div className="space-y-4">
                            <div className="relative mx-auto w-32 h-32 p-2 bg-slate-50 rounded-2xl border border-slate-100 group-hover:scale-105 transition-transform duration-500">
                              <img
                                src={qrCode.qr_png_url}
                                alt={`QR for ${t.name}`}
                                className="w-full h-full object-contain"
                              />
                            </div>

                            <div className="flex flex-col gap-2">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                <ArrowRight className="w-2.5 h-2.5" /> Scan to Access Menu
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 rounded-lg text-indigo-600 font-bold uppercase tracking-widest text-[8px] hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100"
                                onClick={() => handleDownloadPDF(t)}
                              >
                                <Download className="w-3 h-3 mr-1.5" />
                                Extract Blueprint
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-32 h-32 mx-auto bg-slate-50 rounded-2xl flex flex-col items-center justify-center gap-2 border border-dashed border-slate-200">
                            <RefreshCw className="w-5 h-5 animate-spin text-slate-200" />
                            <p className="text-[8px] font-black text-slate-300 uppercase">Generating...</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          )}

          {!loading && tables.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-12 sticky bottom-8 flex justify-center w-full px-4 md:px-0"
            >
              <Button
                className="w-full sm:w-auto bg-slate-900 hover:bg-black h-12 px-10 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] text-white shadow-2xl shadow-indigo-200 transition-all flex items-center gap-3 active:scale-95 group"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                Execute Batch Print
              </Button>
            </motion.div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
