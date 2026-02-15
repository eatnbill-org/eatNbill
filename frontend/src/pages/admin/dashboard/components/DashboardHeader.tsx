import * as React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Coins, BarChart3, Clock, Calendar } from "lucide-react";
import { useCountUpNumber } from "@/hooks/use-count-up";
import { motion } from "framer-motion";

interface DashboardHeaderProps {
  now: Date;
  revenue: number;
  profit: number;
  showProfit: boolean;
  setShowProfit: (v: boolean) => void;
}

export function DashboardHeader({ now, revenue, profit, showProfit, setShowProfit }: DashboardHeaderProps) {
  const displayValue = showProfit ? profit : revenue;
  const animatedValue = useCountUpNumber(displayValue, { durationMs: 800 });

  return (
    <section className="flex flex-col gap-6 rounded-[2.5rem] border-none bg-white p-8 shadow-2xl shadow-slate-200/60 sm:flex-row sm:items-center sm:justify-between min-h-[140px] relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            <Calendar className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {now.toLocaleString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
            <Clock className="w-6 h-6" />
          </div>
          <p className="text-5xl font-black tracking-tighter text-slate-900 italic">
            {now.toLocaleString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>
      </div>

      <div className="text-left sm:text-right flex flex-col items-end gap-3 relative">
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100 px-4">
          <Label htmlFor="profit-mode" className="text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer">
            {showProfit ? "Net Yield active" : "Revenue stream active"}
          </Label>
          <Switch
            id="profit-mode"
            checked={showProfit}
            onCheckedChange={setShowProfit}
            className="data-[state=checked]:bg-emerald-500 scale-90"
          />
        </div>

        <div className="flex flex-col items-end">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
            {showProfit ? "Operational Profit" : "Gross Revenue"}
          </p>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className={`absolute inset-0 rounded-full blur-xl opacity-30 ${showProfit ? "bg-emerald-400" : "bg-indigo-400"}`}
              ></motion.div>
              <div className={`relative h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner ${showProfit ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"}`}>
                {showProfit ? (
                  <BarChart3 className="h-6 w-6" />
                ) : (
                  <Coins className="h-6 w-6" />
                )}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <p className={`text-4xl font-black tracking-tighter sm:text-5xl transition-colors duration-500 italic ${showProfit ? "text-emerald-500" : "text-slate-900"}`}>
                <span className="text-2xl mr-1 not-italic opacity-50">₹</span>
                {Math.round(animatedValue).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
