import * as React from "react";
import { getAdvancedAnalytics, type AnalyticsProduct } from "@/api/analytics";
import { formatINR } from "@/lib/format";
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays } from "date-fns";

type ViewMode = "day" | "week" | "month";

export default function MenuAnalyticsPage() {
  const [view, setView] = React.useState<ViewMode>("month");
  const [products, setProducts] = React.useState<AnalyticsProduct[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [sort, setSort] = React.useState<"qty" | "revenue">("qty");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const date = format(new Date(), "yyyy-MM-dd");
      const data = await getAdvancedAnalytics(view, date, false);
      setProducts(data.products ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [view]);

  React.useEffect(() => { load(); }, [load]);

  const sorted = React.useMemo(() => {
    return [...products].sort((a, b) =>
      sort === "qty" ? b.quantity - a.quantity : b.revenue - a.revenue
    );
  }, [products, sort]);

  const top10 = sorted.slice(0, 10);
  const bottom10 = sorted.slice(-10).reverse();
  const total = products.reduce((sum, p) => sum + p.revenue, 0);
  const totalQty = products.reduce((sum, p) => sum + p.quantity, 0);

  // 30-day-old threshold: items with no orders show up with qty = 0 in the month view
  const stale = products.filter((p) => p.quantity === 0);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Menu Performance</h1>
          <p className="text-sm text-slate-500 mt-0.5">Top items, slow movers, and revenue contribution</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
            {(["day", "week", "month"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn("px-4 py-2 text-xs font-bold capitalize transition-all", view === v ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50")}
              >
                {v === "day" ? "Today" : v === "week" ? "Week" : "Month"}
              </button>
            ))}
          </div>
          <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setSort("qty")}
              className={cn("px-3 py-2 text-xs font-bold transition-all", sort === "qty" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50")}
            >
              By Qty
            </button>
            <button
              type="button"
              onClick={() => setSort("revenue")}
              className={cn("px-3 py-2 text-xs font-bold transition-all", sort === "revenue" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50")}
            >
              By Revenue
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center text-slate-400 text-sm">
          Loading menu data...
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-16 text-center">
          <BarChart3 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No order data for this period</p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Items Sold", value: totalQty.toLocaleString("en-IN"), icon: BarChart3, color: "text-blue-600 bg-blue-50" },
              { label: "Unique Dishes", value: products.length, icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
              { label: "Stale Items", value: stale.length, icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", s.color)}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">{s.label}</p>
                  <p className="text-2xl font-black text-slate-900">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Top 10 */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <h2 className="font-bold text-slate-800">Top 10 Performing Items</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Item</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Qty Sold</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Revenue</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Revenue %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {top10.map((p, i) => {
                  const share = total > 0 ? (p.revenue / total) * 100 : 0;
                  return (
                    <tr key={p.name} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-black text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-5 py-3 font-semibold text-slate-900">{p.name}</td>
                      <td className="px-5 py-3 text-right font-mono text-slate-700">{p.quantity}</td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-slate-900">{formatINR(p.revenue)}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="h-1.5 bg-emerald-500 rounded-full" style={{ width: `${Math.min(share, 100)}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-600 min-w-[35px] text-right">{share.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom 10 */}
          {bottom10.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <h2 className="font-bold text-slate-800">Bottom 10 Slow Movers</h2>
                <span className="ml-auto text-xs text-slate-400 italic">Consider removing or promoting these items</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Item</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Qty Sold</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {bottom10.map((p) => (
                    <tr key={p.name} className="hover:bg-rose-50/30 transition-colors">
                      <td className="px-5 py-3 font-semibold text-slate-700">{p.name}</td>
                      <td className="px-5 py-3 text-right font-mono text-slate-500">{p.quantity}</td>
                      <td className="px-5 py-3 text-right font-mono text-slate-600">{formatINR(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Revenue by category donut-like bar */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Revenue Contribution</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              {top10.map((p) => {
                const share = total > 0 ? (p.revenue / total) * 100 : 0;
                return (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-700 w-40 truncate">{p.name}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all" style={{ width: `${Math.min(share, 100)}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-600 w-12 text-right">{share.toFixed(1)}%</span>
                    <span className="text-xs font-mono text-slate-500 w-20 text-right">{formatINR(p.revenue)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
