import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, Activity, TrendingUp, CheckCircle2, AlertCircle, Clock, History } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { cn } from "@/lib/utils";
import type { CampaignSend } from "@/types/demo";

function segmentLabel(seg: string) {
  switch (seg) {
    case "all": return "All Nodes";
    case "new": return "New Discovery";
    case "repeat": return "Core Retain";
    case "udhaar": return "Debt recovery";
    default: return seg;
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

function CompactMetric({ label, value, colorClass, icon: Icon }: { label: string; value: React.ReactNode; colorClass?: string; icon?: any }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition-all hover:bg-white hover:shadow-sm flex-1">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className={cn("w-3.5 h-3.5 opacity-50", colorClass)} />}
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      </div>
      <p className={cn("text-xl font-black tabular-nums tracking-tight text-slate-800", colorClass)}>{value}</p>
    </div>
  );
}

function CampaignExpandedRow({ campaign, productsById, defaultOpen }: { campaign: CampaignSend; productsById: Map<number, any>; defaultOpen?: boolean; }) {
  const [open, setOpen] = React.useState(Boolean(defaultOpen));

  const pieData = React.useMemo(() => {
    const c = campaign;
    const delivered = c.metrics.delivered;
    const failed = c.metrics.failed;
    const clicked = c.metrics.clicks;
    const pending = clamp(c.metrics.sent - delivered - failed, 0, c.metrics.sent);
    return [
      { name: "Delivered", value: delivered, color: "#10b981" },
      { name: "Failed", value: failed, color: "#f43f5e" },
      { name: "Clicked", value: clicked, color: "#6366f1" },
      { name: "Pending", value: pending, color: "#94a3b8" },
    ].filter((d) => d.value > 0);
  }, [campaign]);

  const productNames = React.useMemo(() => {
    const ids = campaign.productIds ?? [];
    const names = ids.map((id) => productsById.get(id)?.name).filter(Boolean);
    return names.length ? names.join(", ") : null;
  }, [campaign.productIds, productsById]);

  return (
    <div className="bg-slate-50/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left hover:bg-slate-50/80 transition-all group"
      >
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-indigo-500" />
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-800 transition-colors">
            {open ? "Collapse Performance Matrix" : "Inspect Performance Matrix"}
          </span>
        </div>
        <ChevronRight className={cn("h-4 w-4 text-slate-300 transition-transform duration-300", open && "rotate-90 text-indigo-500")} />
      </button>

      {open && (
        <div className="px-6 pb-8 space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr_1.5fr]">

            {/* Message Payload Snapshot */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manifest Snapshot</p>
                <Badge variant="outline" className="h-5 rounded-lg font-black text-[9px] uppercase tracking-widest border-slate-100 text-slate-500">Demo Sequence</Badge>
              </div>
              <div className="space-y-4">
                {campaign.imageUrl && (
                  <div className="rounded-[1.5rem] overflow-hidden border border-slate-100 shadow-sm aspect-video">
                    <img src={campaign.imageUrl} alt="Campaign" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-slate-600 leading-relaxed italic border-l-2 border-indigo-100 pl-4">\"{campaign.message}\"</p>
                  {productNames && (
                    <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100/50">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                      <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest truncate">{productNames}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tactical Analytics */}
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tactical Conversion</p>
                  <p className="text-sm font-bold text-slate-800 tabular-nums">{Math.round((campaign.metrics.clicks / campaign.metrics.delivered) * 100 || 0)}% Integrity Score</p>
                </div>
                <div className="h-14 w-14">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" innerRadius={20} outerRadius={28} stroke="none" paddingAngle={4}>
                        {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <CompactMetric label="Dispatched" value={campaign.metrics.sent} />
                <CompactMetric label="Confirmed" value={campaign.metrics.delivered} colorClass="text-emerald-600" icon={CheckCircle2} />
                <CompactMetric label="Engagement" value={campaign.metrics.clicks} colorClass="text-indigo-600" icon={TrendingUp} />
                <CompactMetric label="Anomalies" value={campaign.metrics.failed} colorClass="text-rose-500" icon={AlertCircle} />
              </div>
            </div>

            {/* Target Nodes Registry */}
            <div className="rounded-3xl border border-slate-100 bg-white overflow-hidden shadow-sm flex flex-col h-full max-h-[340px]">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Nodes Registry</p>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  <span className="text-[9px] font-black text-slate-700 tabular-nums">{campaign.recipients.length}</span>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="divide-y divide-slate-50">
                  {campaign.recipients.map((r) => (
                    <div key={`${campaign.id}-${r.customerId}`} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800 block text-xs truncate leading-tight">{r.name}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{r.phone}</span>
                      </div>
                      <div>
                        {r.status === "clicked" ? <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 rounded-lg font-black text-[9px] uppercase tracking-widest px-2 h-6">ENGAGED</Badge> :
                          r.status === "delivered" ? <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 rounded-lg font-black text-[9px] uppercase tracking-widest px-2 h-6">REACHED</Badge> :
                            r.status === "failed" ? <Badge className="bg-rose-50 text-rose-600 border-rose-100 rounded-lg font-black text-[9px] uppercase tracking-widest px-2 h-6">LEAKED</Badge> :
                              <Badge className="bg-slate-50 text-slate-400 border-slate-100 rounded-lg font-black text-[9px] uppercase tracking-widest px-2 h-6">QUEUE</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CampaignHistory({ campaigns, expandedId, setExpandedId, productsById }: { campaigns: CampaignSend[]; expandedId: string | null; setExpandedId: React.Dispatch<React.SetStateAction<string | null>>; productsById: Map<number, any>; }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-6 w-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <History className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">Transmission Logs</h2>
          </div>
          <p className="text-[11px] font-medium text-slate-400">Comprehensive registry of all authorized broadcast sequences and node engagement metrics.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Logged Sequences:</span>
          <span className="text-[11px] font-black text-indigo-600 tabular-nums">{campaigns.length}</span>
        </div>
      </div>

      <Card className="rounded-[2.5rem] shadow-sm border-none bg-white overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto no-scrollbar">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="h-14 font-black uppercase tracking-widest text-[10px] text-slate-400 px-6">Manifest ID / Target</TableHead>
                  <TableHead className="h-14 font-black uppercase tracking-widest text-[10px] text-slate-400">Class</TableHead>
                  <TableHead className="h-14 font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Nodes</TableHead>
                  <TableHead className="h-14 font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Reached</TableHead>
                  <TableHead className="h-14 font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">Engagement</TableHead>
                  <TableHead className="h-14 font-black uppercase tracking-widest text-[10px] text-slate-400 text-right">Fiscal</TableHead>
                  <TableHead className="h-14 font-black uppercase tracking-widest text-[10px] text-slate-400 text-right px-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => {
                  const isExpanded = expandedId === c.id;
                  const totalCost = (c.cost) ? c.cost : (c.metrics.sent * 0.50);
                  return (
                    <React.Fragment key={c.id}>
                      <TableRow
                        className={cn(
                          "cursor-pointer transition-all border-slate-50 hover:bg-slate-50/50",
                          isExpanded && "bg-slate-50/30"
                        )}
                        onClick={() => setExpandedId((prev) => (prev === c.id ? null : c.id))}
                      >
                        <TableCell className="px-6 py-5">
                          <div className="flex flex-col min-w-[120px]">
                            <p className="font-black text-slate-800 text-xs tracking-tight truncate uppercase">{c.name}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                              {c.sentAt ? formatWhen(c.sentAt) : c.scheduledFor ? `LOCKED: ${formatWhen(c.scheduledFor)}` : "VOID"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="ghost" className="h-6 rounded-lg font-black text-[9px] uppercase tracking-widest px-2 border border-slate-100 bg-slate-50 text-slate-500">
                            {segmentLabel(c.audience)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-slate-800 tabular-nums text-sm">{c.metrics.sent}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-emerald-600 tabular-nums text-sm">{c.metrics.delivered}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-bold text-indigo-600 tabular-nums text-sm">{c.metrics.clicks}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-black text-slate-800 tabular-nums text-sm">₹{totalCost.toFixed(2)}</span>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          {c.status === "completed" ? (
                            <div className="flex items-center justify-end gap-1.5 text-emerald-600">
                              <span className="text-[10px] font-black uppercase tracking-widest">SUCCESS</span>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          ) : c.status === "pending" ? (
                            <div className="flex items-center justify-end gap-1.5 text-orange-500">
                              <span className="text-[10px] font-black uppercase tracking-widest">QUEUED</span>
                              <Clock className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5 text-rose-500">
                              <span className="text-[10px] font-black uppercase tracking-widest">FAILED</span>
                              <AlertCircle className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="hover:bg-transparent border-none">
                          <TableCell colSpan={7} className="p-0 border-t-0">
                            <CampaignExpandedRow campaign={c} productsById={productsById} defaultOpen />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
                {campaigns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <History className="w-8 h-8 text-slate-100" />
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Transmission registry is currently void.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
