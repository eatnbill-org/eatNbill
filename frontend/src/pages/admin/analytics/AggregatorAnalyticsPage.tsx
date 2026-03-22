import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, Wallet, ShoppingBag, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import { format, subDays } from "date-fns";

interface PlatformStats {
  platform: string;
  orders: number;
  gross: number;
  commission: number;
  net: number;
  commission_rate: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  ZOMATO: "from-red-500 to-red-600",
  SWIGGY: "from-orange-400 to-orange-500",
};

const PLATFORM_BG: Record<string, string> = {
  ZOMATO: "bg-red-50 border-red-200",
  SWIGGY: "bg-orange-50 border-orange-200",
};

export default function AggregatorAnalyticsPage() {
  const [fromDate, setFromDate] = React.useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [toDate, setToDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [data, setData] = React.useState<PlatformStats[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Commission rate editing
  const [editRates, setEditRates] = React.useState<Record<string, string>>({});
  const [savingRate, setSavingRate] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ from_date: fromDate, to_date: toDate });
      const res = await apiClient.get<{ data: PlatformStats[] }>(`/restaurant/analytics/aggregator?${qs}`);
      const stats = (res.data as any)?.data ?? [];
      setData(stats);
      // Pre-fill rate inputs from loaded data
      const rates: Record<string, string> = {};
      for (const s of stats) rates[s.platform] = s.commission_rate > 0 ? String(s.commission_rate) : "";
      setEditRates(rates);
    } catch {
      toast.error("Failed to load aggregator analytics");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  React.useEffect(() => { void load(); }, [load]);

  const handleSaveRate = async (platform: string) => {
    setSavingRate(platform);
    try {
      await apiClient.patch("/restaurant/analytics/aggregator/commission-rate", {
        platform,
        commission_rate_percent: editRates[platform] ? parseFloat(editRates[platform]) : null,
      });
      toast.success(`${platform} commission rate updated`);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to update");
    } finally { setSavingRate(null); }
  };

  const totalGross = data.reduce((s, d) => s + d.gross, 0);
  const totalCommission = data.reduce((s, d) => s + d.commission, 0);
  const totalNet = data.reduce((s, d) => s + d.net, 0);
  const totalOrders = data.reduce((s, d) => s + d.orders, 0);

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-rose-500" />
            Aggregator P&L
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Track Zomato & Swiggy revenue, commissions, and net earnings</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-bold text-slate-500">From</Label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-9 rounded-xl w-36 text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs font-bold text-slate-500">To</Label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-9 rounded-xl w-36 text-xs" />
          </div>
          <Button onClick={load} disabled={loading} className="h-9 rounded-xl text-xs font-bold px-4">
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Orders", value: String(totalOrders), icon: ShoppingBag, color: "text-blue-500 bg-blue-50" },
          { label: "Gross Revenue", value: formatINR(totalGross), icon: Wallet, color: "text-emerald-600 bg-emerald-50" },
          { label: "Total Commission", value: formatINR(totalCommission), icon: TrendingDown, color: "text-rose-600 bg-rose-50" },
          { label: "Net Revenue", value: formatINR(totalNet), icon: TrendingUp, color: "text-violet-600 bg-violet-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
              <p className="text-lg font-black text-slate-800 tabular-nums">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Per-platform breakdown */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-400 text-sm">Loading...</div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 text-slate-200" />
          <p className="text-slate-400 text-sm">No aggregator orders in selected period.</p>
          <p className="text-slate-300 text-xs mt-1">Zomato and Swiggy orders will appear here once received.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.map(stat => (
            <div key={stat.platform} className={cn("rounded-2xl border p-5 space-y-4", PLATFORM_BG[stat.platform] ?? "bg-slate-50 border-slate-200")}>
              <div className="flex items-center justify-between">
                <h3 className={cn("text-lg font-black bg-gradient-to-r bg-clip-text text-transparent", PLATFORM_COLORS[stat.platform] ?? "from-slate-600 to-slate-800")}>
                  {stat.platform}
                </h3>
                <span className="text-sm font-bold text-slate-600">{stat.orders} orders</span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-white/70 p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Gross</p>
                  <p className="text-sm font-black text-slate-800">{formatINR(stat.gross)}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-3">
                  <p className="text-[10px] font-bold text-rose-400 uppercase">Commission</p>
                  <p className="text-sm font-black text-rose-600">−{formatINR(stat.commission)}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-3">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase">Net</p>
                  <p className="text-sm font-black text-emerald-700">{formatINR(stat.net)}</p>
                </div>
              </div>

              {/* Commission rate editor */}
              <div className="flex items-center gap-2 bg-white/70 rounded-xl p-2">
                <Percent className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="text-xs font-bold text-slate-500 shrink-0">Commission Rate:</span>
                <Input
                  type="number" min={0} max={50} step={0.5}
                  value={editRates[stat.platform] ?? ""}
                  onChange={e => setEditRates(prev => ({ ...prev, [stat.platform]: e.target.value }))}
                  placeholder="e.g. 25"
                  className="h-7 rounded-lg text-xs flex-1 bg-white"
                />
                <span className="text-xs text-slate-400">%</span>
                <Button size="sm" className="h-7 text-xs px-3 rounded-lg" disabled={savingRate === stat.platform}
                  onClick={() => void handleSaveRate(stat.platform)}>
                  {savingRate === stat.platform ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
