import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Zap } from "lucide-react";

export function RushHourChart({ data }: { data: any[] }) {
  return (
    <Card className="rounded-[1.5rem] border-slate-100 shadow-xl shadow-slate-200/50 bg-white/50 backdrop-blur-sm overflow-hidden flex flex-col h-[320px]">
      <CardHeader className="py-3 border-b border-slate-50">
        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-orange-500" />
          Propagation
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 flex-1 overflow-visible">
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: -10, right: 20, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <YAxis
                type="category"
                dataKey="hour"
                tick={{ fill: "#94a3b8", fontSize: 8, fontWeight: 800 }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <XAxis
                type="number"
                tick={{ fill: "#94a3b8", fontSize: 8, fontWeight: 800 }}
                axisLine={false}
                tickLine={false}
                hide
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
              />
              <Bar dataKey="orders" radius={[0, 6, 6, 0]} barSize={12}>
                {data.map((entry, index) => {
                  const max = Math.max(...data.map((r) => r.orders));
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.orders === max && max > 0 ? "#6366f1" : "#e2e8f0"}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}