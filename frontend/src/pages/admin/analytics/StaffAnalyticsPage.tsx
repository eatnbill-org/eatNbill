import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { formatINR } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardStatsSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, ShoppingBag, Tag } from "lucide-react";

interface StaffPerformanceRow {
  waiter_id: string;
  name: string;
  role: string;
  shift_detail: string | null;
  is_active: boolean;
  order_count: number;
  total_revenue: number;
  total_discount: number;
  avg_order_value: number;
}

async function fetchStaffAnalytics(params: { from_date?: string; to_date?: string }) {
  const qs = new URLSearchParams();
  if (params.from_date) qs.set("from_date", params.from_date);
  if (params.to_date) qs.set("to_date", params.to_date);
  const { data } = await apiClient.get<{ data: StaffPerformanceRow[] }>(
    `/restaurant/analytics/staff?${qs.toString()}`
  );
  return data?.data ?? [];
}

export default function StaffAnalyticsPage() {
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const [fromDate, setFromDate] = React.useState(firstOfMonth);
  const [toDate, setToDate] = React.useState(today);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["staff-analytics", fromDate, toDate],
    queryFn: () => fetchStaffAnalytics({ from_date: fromDate, to_date: toDate }),
  });

  const totalRevenue = rows.reduce((s, r) => s + r.total_revenue, 0);
  const totalOrders = rows.reduce((s, r) => s + r.order_count, 0);
  const totalDiscount = rows.reduce((s, r) => s + r.total_discount, 0);
  const activeStaff = rows.filter((r) => r.is_active).length;

  const sorted = [...rows].sort((a, b) => b.total_revenue - a.total_revenue);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff Performance</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Per-waiter breakdown of orders handled, revenue generated, and discounts given.
        </p>
      </div>

      {/* Date filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">From</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-9 text-sm w-40"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-9 text-sm w-40"
          />
        </div>
      </div>

      {/* Summary cards */}
      {isLoading ? (
        <DashboardStatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard icon={Users} label="Active Staff" value={String(activeStaff)} />
          <SummaryCard icon={ShoppingBag} label="Total Orders" value={String(totalOrders)} />
          <SummaryCard icon={TrendingUp} label="Total Revenue" value={formatINR(totalRevenue)} />
          <SummaryCard icon={Tag} label="Total Discounts" value={formatINR(totalDiscount)} />
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Waiter Performance Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={5} />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              No completed orders with waiter assignments in this period.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Rank</TableHead>
                  <TableHead>Waiter</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Avg. Order</TableHead>
                  <TableHead className="text-right pr-4">Discounts Given</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((row, index) => (
                  <TableRow key={row.waiter_id}>
                    <TableCell className="pl-4 font-mono text-xs text-muted-foreground">
                      #{index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-sm">{row.name}</div>
                      {row.shift_detail && (
                        <div className="text-[10px] text-muted-foreground">{row.shift_detail}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium capitalize">{row.role?.toLowerCase()}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.is_active ? "default" : "secondary"} className="text-[10px]">
                        {row.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold">{row.order_count}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {formatINR(row.total_revenue)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatINR(row.avg_order_value)}
                    </TableCell>
                    <TableCell className="text-right pr-4 text-sm text-orange-500">
                      {formatINR(row.total_discount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-xl font-black tracking-tight mt-0.5">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
