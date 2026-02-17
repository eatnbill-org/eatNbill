import * as React from "react";
import { useLocation } from "react-router-dom";
import { useAdminOrdersStore } from "@/stores/orders";
import { formatINR, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, ShoppingCart } from "lucide-react";
import type { Order } from "@/types/order";
import CreateOrderDialog from "@/pages/admin/orders/CreateOrderDialog";
import MarkPaidDialog from "@/pages/admin/orders/MarkPaidDialog";
import OrderDetailsDialog from "@/pages/admin/orders/OrderDetailsDialog";
import { TableSkeleton } from "@/components/ui/skeleton";

const STATUS_FLOW = ["PENDING", "CONFIRMED", "PREPARING", "READY", "SERVED", "COMPLETED"];
const STATUS_LABELS: Record<string, string> = {
  PENDING: "New",
  CONFIRMED: "Confirmed",
  PREPARING: "Cooking",
  READY: "Ready",
  SERVED: "Served",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default function ManagerOrdersPage() {
  const location = useLocation();
  const {
    orders,
    loading,
    fetchOrders,
    updateOrderStatus,
    updatePayment,
  } = useAdminOrdersStore();

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [detailsOrder, setDetailsOrder] = React.useState<Order | null>(null);
  const [markPaidOrder, setMarkPaidOrder] = React.useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [fromDate, setFromDate] = React.useState<string>("");
  const [toDate, setToDate] = React.useState<string>("");

  React.useEffect(() => {
    fetchOrders({ limit: 50 });
  }, [fetchOrders]);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("new") === "true") {
      setCreateDialogOpen(true);
      window.history.replaceState({}, "", location.pathname);
    }
  }, [location]);

  const applyFilters = React.useCallback(() => {
    const filters: any = { limit: 50 };
    if (statusFilter !== "all") filters.status = statusFilter;
    if (fromDate) filters.from_date = new Date(fromDate).toISOString();
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      filters.to_date = end.toISOString();
    }
    fetchOrders(filters);
  }, [fetchOrders, statusFilter, fromDate, toDate]);

  const handleStatusChange = (orderId: string, status: string) => {
    updateOrderStatus(orderId, { status });
  };

  const handleMarkPaid = (orderId: string) => {
    updatePayment(orderId, { payment_status: "PAID", payment_method: "CASH" });
  };

  if (loading && orders.length === 0) {
    return <TableSkeleton rows={8} />;
  }

  const totalOrders = orders.length;
  const paidOrders = orders.filter(o => o.payment_status === "PAID").length;
  const pendingOrders = orders.filter(o => o.payment_status === "PENDING").length;

  const handleRefresh = () => {
    setStatusFilter("all");
    setFromDate("");
    setToDate("");
    fetchOrders({ limit: 50 });
  };

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Order Management</h1>
            <p className="text-xs text-slate-500">Manage active orders and payment status</p>
          </div>
        </div>

        {/* Compact Stats */}
        <div className="flex gap-3">
          <div className="bg-white rounded-xl border border-slate-200 px-3 py-2 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
            <p className="text-xl font-black text-slate-900">{totalOrders}</p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 px-3 py-2 shadow-sm">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Paid</p>
            <p className="text-xl font-black text-emerald-700">{paidOrders}</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 px-3 py-2 shadow-sm">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Pending</p>
            <p className="text-xl font-black text-amber-700">{pendingOrders}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex flex-col">
            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">From</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 w-44 rounded-lg"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">To</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 w-44 rounded-lg"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-40 text-xs rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {STATUS_FLOW.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-9 rounded-lg border-slate-200 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const now = new Date();
              const from = new Date(now);
              from.setDate(now.getDate() - 7);
              setFromDate(from.toISOString().slice(0, 10));
              setToDate(now.toISOString().slice(0, 10));
            }}
            className="h-9 rounded-lg border-slate-200 hover:bg-slate-50"
          >
            Last 7 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="h-9 rounded-lg border-purple-200 text-purple-600 hover:bg-purple-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
          <Button
            size="sm"
            onClick={applyFilters}
            className="h-9 rounded-lg bg-slate-900 hover:bg-black text-white"
          >
            Apply
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {orders.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No orders</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((o) => (
              <div
                key={o.id}
                className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between hover:bg-slate-50/60 cursor-pointer"
                onClick={() => setDetailsOrder(o as Order)}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">#{o.order_number}</p>
                    <Badge variant="secondary" className="text-[10px] uppercase">{STATUS_LABELS[o.status] || o.status}</Badge>
                    {o.payment_status === "PAID" && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-[10px] uppercase">Paid</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {o.customer_name || "Guest"} • {formatDateTime(o.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-sm font-bold text-slate-900">{formatINR(parseFloat(o.total_amount))}</div>
                  <Select value={o.status} onValueChange={(v) => handleStatusChange(o.id, v)}>
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_FLOW.map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                      ))}
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  {o.payment_status !== "PAID" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMarkPaidOrder(o as Order);
                      }}
                    >
                      Mark Paid
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateOrderDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <MarkPaidDialog
        order={markPaidOrder}
        open={!!markPaidOrder}
        onOpenChange={(open) => !open && setMarkPaidOrder(null)}
      />
      <OrderDetailsDialog
        order={detailsOrder}
        open={!!detailsOrder}
        onOpenChange={(open) => !open && setDetailsOrder(null)}
        onMarkPaid={(order) => {
          setMarkPaidOrder(order);
          setDetailsOrder(null);
        }}
        onReversePayment={(order) => {
          updatePayment(order.id, {
            payment_status: "PENDING",
            payment_method: (order.payment_method || "CASH") as any,
            payment_amount: parseFloat(order.total_amount),
          });
          setDetailsOrder(null);
        }}
      />
    </div>
  );
}
