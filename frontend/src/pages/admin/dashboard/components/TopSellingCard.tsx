import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/format";
import { Trophy } from "lucide-react";

export function TopSellingCard({ data, products }: { data: any[], products: any[] }) {
  return (
    <Card className="rounded-[1.5rem] border-slate-100 shadow-xl shadow-slate-200/50 bg-white/50 backdrop-blur-sm overflow-hidden flex flex-col h-[320px]">
      <CardHeader className="py-3 border-b border-slate-50">
        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          Top Items
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 flex-1 overflow-auto no-scrollbar">
        <div className="space-y-3">
          {data.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <p className="text-[9px] font-black uppercase tracking-widest italic opacity-50">Market inactive</p>
            </div>
          ) : (
            data.map((it, idx) => {
              const product = products.find(p => p.name === it.name);
              const revenue = it.qty * (product?.price ?? 0);
              return (
                <div key={it.name} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-50 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="w-5 text-lg font-black text-slate-200 group-hover:text-indigo-200 transition-colors italic tracking-tighter shrink-0">{idx + 1}</div>
                  <div className="h-10 w-10 overflow-hidden rounded-lg border border-slate-100 bg-slate-50 shrink-0 group-hover:scale-105 transition-transform">
                    {it.imageUrl ? (
                      <img src={it.imageUrl} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[8px] font-black text-slate-300">VOID</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-black text-slate-800 tracking-tight mb-0.5">{it.name}</div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Qty:</span>
                        <span className="text-[9px] font-black text-indigo-600">{it.qty}</span>
                      </div>
                      <div className="h-2 w-[1px] bg-slate-100" />
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">₹:</span>
                        <span className="text-[9px] font-black text-emerald-600 font-mono tracking-tighter">{Math.round(revenue).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}