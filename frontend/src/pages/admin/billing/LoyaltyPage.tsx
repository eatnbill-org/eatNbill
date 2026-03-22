import * as React from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Gift, Users, Trophy, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoyaltyProgram {
  id?: string;
  name: string;
  is_active: boolean;
  points_per_spend_unit: string; // points earned per spend_unit
  spend_unit: string;            // ₹ amount = 1 unit (e.g. ₹10)
  redemption_rate: string;       // ₹ discount per point
  min_points_to_redeem: number;
}

interface LeaderboardEntry {
  id: string;
  points_balance: number;
  total_earned: number;
  total_redeemed: number;
  customer: { name: string; phone: string };
}

export default function LoyaltyPage() {
  const [program, setProgram] = React.useState<LoyaltyProgram | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardEntry[]>([]);

  // Form fields
  const [name, setName] = React.useState("Rewards Program");
  const [pointsPerUnit, setPointsPerUnit] = React.useState("1");
  const [spendUnit, setSpendUnit] = React.useState("10");
  const [redemptionRate, setRedemptionRate] = React.useState("1");
  const [minPoints, setMinPoints] = React.useState("10");
  const [isActive, setIsActive] = React.useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [progRes, lbRes] = await Promise.all([
        apiClient.get<{ data: LoyaltyProgram }>("/restaurant/loyalty/program"),
        apiClient.get<{ data: LeaderboardEntry[] }>("/restaurant/loyalty/leaderboard"),
      ]);
      const p = (progRes.data as any)?.data;
      if (p) {
        setProgram(p);
        setName(p.name ?? "Rewards Program");
        setPointsPerUnit(String(p.points_per_spend_unit ?? "1"));
        setSpendUnit(String(p.spend_unit ?? "10"));
        setRedemptionRate(String(p.redemption_rate ?? "1"));
        setMinPoints(String(p.min_points_to_redeem ?? "10"));
        setIsActive(!!p.is_active);
      }
      const lb = (lbRes.data as any)?.data ?? [];
      setLeaderboard(lb);
    } catch {
      // program may not exist yet
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { void load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await apiClient.put("/restaurant/loyalty/program", {
        name,
        points_per_spend_unit: parseFloat(pointsPerUnit) || 1,
        spend_unit: parseFloat(spendUnit) || 10,
        redemption_rate: parseFloat(redemptionRate) || 1,
        min_points_to_redeem: parseInt(minPoints) || 10,
        is_active: isActive,
      });
      if (error) throw new Error(error.message);
      toast.success("Loyalty program saved");
      void load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const effectivePointsPerRupee = parseFloat(pointsPerUnit) / parseFloat(spendUnit) || 0;
  const effectiveRupeePerPoint = parseFloat(redemptionRate) || 0;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <Gift className="h-5 w-5 text-violet-500" />
            Loyalty Program
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Reward customers with points on every purchase</p>
        </div>
        <div className={cn("px-2.5 py-1 rounded-full text-xs font-bold", isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
          {isActive ? "Active" : "Inactive"}
        </div>
      </div>

      {/* Settings */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Program Settings</h2>

        {/* Quick Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-violet-50 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500">Earn Rate</p>
            <p className="text-lg font-black text-violet-700 mt-1">
              {effectivePointsPerRupee.toFixed(2)} pts
            </p>
            <p className="text-[10px] text-violet-400">per ₹1 spent</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Redeem Rate</p>
            <p className="text-lg font-black text-emerald-700 mt-1">
              ₹{effectiveRupeePerPoint.toFixed(2)}
            </p>
            <p className="text-[10px] text-emerald-400">per 1 point</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Min Redeem</p>
            <p className="text-lg font-black text-amber-700 mt-1">{minPoints} pts</p>
            <p className="text-[10px] text-amber-400">to unlock reward</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="col-span-2 space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Program Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-xl" placeholder="e.g. Rewards Club" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Points per Unit</Label>
            <Input type="number" value={pointsPerUnit} onChange={(e) => setPointsPerUnit(e.target.value)} className="h-10 rounded-xl" min={0.01} step={0.01} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Spend Unit (₹)</Label>
            <Input type="number" value={spendUnit} onChange={(e) => setSpendUnit(e.target.value)} className="h-10 rounded-xl" min={1} placeholder="e.g. 10 means 1 unit per ₹10" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Redemption Rate (₹ per point)</Label>
            <Input type="number" value={redemptionRate} onChange={(e) => setRedemptionRate(e.target.value)} className="h-10 rounded-xl" min={0.01} step={0.01} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Minimum Points to Redeem</Label>
            <Input type="number" value={minPoints} onChange={(e) => setMinPoints(e.target.value)} className="h-10 rounded-xl" min={1} />
          </div>
          <div className="col-span-2 flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-slate-700">Program Active</p>
              <p className="text-xs text-slate-400">Customers earn & redeem points when enabled</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <Button className="rounded-xl w-full sm:w-auto px-8" onClick={handleSave} disabled={saving || loading}>
          {saving ? "Saving..." : "Save Program Settings"}
        </Button>
      </div>

      {/* Leaderboard */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-700">Points Leaderboard</h2>
          <span className="ml-auto text-[10px] text-slate-400 font-medium">Top 50 customers</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : leaderboard.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <Star className="h-8 w-8 mx-auto mb-2 text-slate-200" />
            No loyalty data yet. Points will appear here once customers start earning.
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest">#</th>
                <th className="text-left px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Customer</th>
                <th className="text-right px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Balance</th>
                <th className="text-right px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Total Earned</th>
                <th className="text-right px-4 py-3 font-bold text-[10px] uppercase tracking-widest">Redeemed</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, idx) => (
                <tr key={entry.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-400 font-bold text-xs">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{entry.customer.name}</p>
                    <p className="text-xs text-slate-400">{entry.customer.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-black text-violet-600">{entry.points_balance.toLocaleString()} pts</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500 font-medium">{entry.total_earned.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-400">{entry.total_redeemed.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
