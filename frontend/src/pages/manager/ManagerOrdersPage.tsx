import * as React from "react";
import { useLocation } from "react-router-dom";
import { useAdminOrdersStore } from "@/stores/orders";
import { formatINR, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, ShoppingCart, Search, Tag } from "lucide-react";
import type { Order } from "@/types/order";
import { useCategoriesStore } from "@/stores/categories";
import { useProductsStore } from "@/stores/products";
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
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null);

  // Categories & Products for filter
  const { categories, fetchCategories } = useCategoriesStore();
  const { products, fetchProducts } = useProductsStore();

  React.useEffect(() => {
    fetchOrders({ limit: 50 });
    fetchCategories();
    fetchProducts();
  }, [fetchOrders, fetchCategories, fetchProducts]);

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

  // Build maps for fast category lookup
  const { categoryMap, categoryIdToNameMap } = React.useMemo(() => {
    const cMap: Record<string, string | null> = {};
    const nMap: Record<string, string> = {};

    products.forEach((p) => {
      cMap[p.id] = p.category_id;
    });

    categories.forEach((c) => {
      nMap[c.id] = c.name;
    });

    return { categoryMap: cMap, categoryIdToNameMap: nMap };
  }, [products, categories]);

  // Active categories for filter tabs
  const activeCategories = React.useMemo(
    () => categories.filter((c) => c.is_active),
    [categories]
  );

  const filteredOrders = React.useMemo(() => {
    let result = [...orders];

    // Category filter
    if (selectedCategoryId) {
      result = result.filter((o) =>
        o.items?.some((item) =>
          categoryMap[item.product_id] === selectedCategoryId
        )
      );
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((o) => {
        // 1. Basic Info
        const matchesInfo =
          (o.customer_name?.toLowerCase() || '').includes(q) ||
          (o.customer_phone?.toLowerCase() || '').includes(q) ||
          (o.order_number?.toString() || '').includes(q) ||
          (o.table_number?.toString().toLowerCase() || '').includes(q);

        if (matchesInfo) return true;

        // 2. Items & Categories
        return o.items?.some((item) => {
          const itemName = (item.name_snapshot?.toLowerCase() || '').includes(q);
          const catId = categoryMap[item.product_id];
          const catName = (categoryIdToNameMap[catId || '']?.toLowerCase() || '').includes(q);
          return itemName || catName;
        });
      });
    }

    return result;
  }, [orders, searchQuery, selectedCategoryId, categoryMap, categoryIdToNameMap]);

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">Order Management</h1>
            <p className="text-xs text-slate-500">Manage active orders and payment status</p>
          </div>
        </div>

        {/* Compact Stats */}
        <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3 w-full lg:w-auto">
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

      {/* Enhanced Local Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        {/* Row 1: Search & Actions */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Quick search by name, phone, order#, item or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white transition-all"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-10 px-3 rounded-xl border-slate-200 hover:bg-slate-50 transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-black text-white shadow-md transition-all font-bold gap-2 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              New Order
            </Button>
          </div>
        </div>

        {/* Row 2: Category Tabs */}
        {activeCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap shadow-sm border ${
                selectedCategoryId === null
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-900 hover:text-slate-900"
              }`}
            >
              <Tag className="h-3 w-3" />
              All Categories
            </button>
            {activeCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap shadow-sm border ${
                  selectedCategoryId === cat.id
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-900 hover:text-slate-900"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Row 3: Server-side Filters (Advanced) */}
        <div className="pt-2 border-t border-slate-100 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col">
              <label className="text-[9px] uppercase tracking-[0.15em] text-slate-400 font-black mb-1.5">Date From</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 w-36 rounded-lg text-xs border-slate-200"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[9px] uppercase tracking-[0.15em] text-slate-400 font-black mb-1.5">Date To</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 w-36 rounded-lg text-xs border-slate-200"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[9px] uppercase tracking-[0.15em] text-slate-400 font-black mb-1.5">By Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-32 text-[11px] font-bold rounded-lg border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Status</SelectItem>
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
              onClick={() => {
                const now = new Date();
                const from = new Date(now);
                from.setDate(now.getDate() - 7);
                setFromDate(from.toISOString().slice(0, 10));
                setToDate(now.toISOString().slice(0, 10));
              }}
              className="h-9 rounded-lg border-slate-200 text-[11px] font-bold hover:bg-slate-50 px-3"
            >
              Past Week
            </Button>
            <Button
              size="sm"
              onClick={applyFilters}
              className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-5 font-bold text-[11px]"
            >
              Fetch Orders
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {filteredOrders.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="bg-slate-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto">
              <Search className="h-8 w-8 text-slate-200" />
            </div>
            <p className="text-slate-400 text-sm font-medium">No orders found matching your criteria</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredOrders.map((o) => (
              <div
                key={o.id}
                className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between hover:bg-slate-50/60 cursor-pointer transition-colors"
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

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
