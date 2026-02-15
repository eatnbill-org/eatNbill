/**
 * Admin Orders Page
 * Displays and manages all restaurant orders with realtime updates
 */

import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAdminOrdersStore } from '@/stores/orders';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Plus,
  RefreshCw,
  Printer,
  Trash2,
  Search,
  Calendar as CalendarIcon,
  ChevronDown
} from 'lucide-react';
import { formatINR } from '@/lib/format';
import type { Order } from '@/types/order';
import CreateOrderDialog from './CreateOrderDialog';
import MarkPaidDialog from './MarkPaidDialog';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import OrderDetailsDialog from './OrderDetailsDialog';
import { BillPrintSheet } from '../dashboard/components/BillPrintSheet';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subHours,
  addHours,
  isWithinInterval,
  parseISO
} from 'date-fns';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  PLACED: 'bg-blue-500',
  CONFIRMED: 'bg-purple-500',
  PREPARING: 'bg-orange-500',
  READY: 'bg-green-500',
  COMPLETED: 'bg-gray-500',
  CANCELLED: 'bg-red-500',
};

type FilterPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const location = useLocation();
  const {
    orders,
    loading,
    error,
    fetchOrders,
    fetchStats,
    subscribeToOrders,
    unsubscribe,
    realtimeConnected,
    pagination,
    filters,
  } = useAdminOrdersStore();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<FilterPeriod>('DAILY');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Dialog states
  const [markPaidOrder, setMarkPaidOrder] = useState<Order | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<Order | null>(null);
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [billOrder, setBillOrder] = useState<Order | null>(null);

  // Handle URL param to open create dialog
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('new') === 'true') {
      setCreateDialogOpen(true);
      // Clean up URL
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location]);

  // Day Interval Logic: 12:00 AM to 11:59 PM
  const getDayInterval = (date: Date) => {
    const start = startOfDay(date);
    const end = endOfDay(date);
    return { start, end };
  };

  useEffect(() => {
    if (user?.allowed_restaurant_ids?.[0]) {
      const restaurantId = user.allowed_restaurant_ids[0];
      subscribeToOrders(restaurantId);
      handleRefresh();
    }

    return () => {
      unsubscribe();
    };
  }, [user]);

  const handleRefresh = () => {
    let start: Date, end: Date;

    if (period === 'DAILY') {
      ({ start, end } = getDayInterval(selectedDate));
    } else if (period === 'WEEKLY') {
      start = startOfWeek(selectedDate);
      end = endOfWeek(selectedDate);
    } else if (period === 'MONTHLY') {
      start = startOfMonth(selectedDate);
      end = endOfMonth(selectedDate);
    } else if (period === 'YEARLY') {
      start = startOfYear(selectedDate);
      end = endOfYear(selectedDate);
    } else {
      ({ start, end } = getDayInterval(selectedDate));
    }

    fetchOrders({
      from_date: start.toISOString(),
      to_date: end.toISOString(),
      limit: pagination?.limit || 25
    });
    fetchStats();
  };

  // Re-fetch when period or date changes
  useEffect(() => {
    handleRefresh();
  }, [period, selectedDate]);

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.toLowerCase().includes(q) ||
        o.order_number.toString().includes(q)
      );
    }

    return result;
  }, [orders, searchQuery]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'hh:mm a');
  };

  const getStatusBadge = (status: string) => (
    <Badge className={`${STATUS_COLORS[status]} text-white hover:${STATUS_COLORS[status]} px-2 py-0.5 text-[10px]`}>
      {status}
    </Badge>
  );

  const getItemSummary = (order: Order) => {
    if (!order.items || order.items.length === 0) return 'No items';
    const count = order.items.length;
    const firstItemName = order.items[0].name_snapshot;
    return count > 1 ? `${firstItemName} +${count - 1}` : firstItemName;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 space-y-6 overflow-y-auto no-scrollbar">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Orders</h1>
          <div className="flex items-center gap-2 mt-1">
            {realtimeConnected && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live Hub
              </span>
            )}
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium opacity-70">
              {format(selectedDate, 'MMMM yyyy')}
            </span>
          </div>
        </div>

        <div className="flex items-center bg-muted/30 p-1 rounded-xl border self-end sm:self-auto">
          {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as FilterPeriod[]).map((p) => (
            <Button
              key={p}
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3 text-[11px] font-bold tracking-wider rounded-lg transition-all",
                period === p ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:bg-white/50"
              )}
              onClick={() => setPeriod(p)}
            >
              {p}
            </Button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0 rounded-lg ml-1",
                  period === 'CUSTOM' ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setPeriod('DAILY');
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <div className="h-4 w-px bg-slate-200 mx-2" />
          <Select
            value={pagination?.limit?.toString() || "25"}
            onValueChange={(v) => {
              fetchOrders({ ...filters, limit: parseInt(v), page: 1 });
            }}
          >
            <SelectTrigger className="h-8 w-20 border-none bg-transparent shadow-none text-xs font-bold focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/40 backdrop-blur-sm border rounded-2xl p-4 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer, phone, or order ID..."
            className="pl-10 h-10 bg-white/50 border-none ring-1 ring-slate-100 focus-visible:ring-slate-900 shadow-none rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl bg-white/50 border-none ring-1 ring-slate-100 hover:ring-slate-900 transition-all"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button
            className="h-10 w-full sm:w-auto px-6 rounded-xl bg-slate-900 hover:bg-black text-white shadow-lg shadow-slate-200 transition-all font-bold gap-2"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Order
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center font-bold">!</Badge>
          <p className="text-sm font-medium">{error.message}</p>
        </div>
      )}

      <Card className="border shadow-sm rounded-3xl overflow-hidden bg-white/50 backdrop-blur-md">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-[100px] text-[11px] uppercase tracking-widest font-black text-slate-400 pl-6 h-12"># ID</TableHead>
                <TableHead className="text-[11px] uppercase tracking-widest font-black text-slate-400 h-12">Customer</TableHead>
                <TableHead className="text-[11px] uppercase tracking-widest font-black text-slate-400 h-12">Items</TableHead>
                <TableHead className="text-[11px] uppercase tracking-widest font-black text-slate-400 h-12">Total</TableHead>
                <TableHead className="text-[11px] uppercase tracking-widest font-black text-slate-400 h-12">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-widest font-black text-slate-400 h-12">Timing</TableHead>
                <TableHead className="text-[11px] uppercase tracking-widest font-black text-slate-400 h-12">Payment</TableHead>
                <TableHead className="text-right text-[11px] uppercase tracking-widest font-black text-slate-400 pr-6 h-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">
                    Synching orders...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center space-y-2">
                    <p className="text-slate-400 font-bold italic text-sm">No orders found for this shift.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="hover:bg-white/80 cursor-pointer border-b border-slate-50 transition-colors group"
                    onClick={() => setDetailsOrder(order)}
                  >
                    <TableCell className="font-mono text-sm font-bold pl-6 py-4">
                      #{order.order_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-black text-sm text-slate-800 italic uppercase">{order.customer_name}</span>
                        {order.customer_phone && (
                          <span className="text-[10px] text-slate-400 font-bold tracking-tighter uppercase">
                            {order.customer_phone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-slate-500 uppercase">
                        {getItemSummary(order)}
                      </span>
                    </TableCell>
                    <TableCell className="font-black text-sm tracking-tight text-slate-900">
                      {formatINR(parseFloat(order.total_amount))}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-800">
                          {order.arrive_at || formatTime(order.placed_at || order.created_at)}
                        </span>
                        <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest leading-none">
                          {order.source}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.payment_status === 'PENDING' && !['CANCELLED'].includes(order.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMarkPaidOrder(order);
                          }}
                        >
                          Mark Paid
                        </Button>
                      )}
                      {order.payment_status === 'PAID' && (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0 border-emerald-200">
                          PAID
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBillOrder(order);
                          }}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteOrder(order);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg font-bold border-none ring-1 ring-slate-200"
                disabled={pagination.page <= 1}
                onClick={() => fetchOrders({ ...filters, page: pagination.page - 1 })}
              >
                <ChevronDown className="h-4 w-4 mr-1 rotate-90" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg font-bold border-none ring-1 ring-slate-200"
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchOrders({ ...filters, page: pagination.page + 1 })}
              >
                Next
                <ChevronDown className="h-4 w-4 ml-1 -rotate-90" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <CreateOrderDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <MarkPaidDialog
        order={markPaidOrder}
        open={!!markPaidOrder}
        onOpenChange={(open) => !open && setMarkPaidOrder(null)}
      />
      <DeleteConfirmDialog
        order={deleteOrder}
        open={!!deleteOrder}
        onOpenChange={(open) => !open && setDeleteOrder(null)}
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
            payment_status: 'PENDING',
            payment_method: (order.payment_method || 'CASH') as any,
            payment_amount: parseFloat(order.total_amount),
          });
          setDetailsOrder(null);
        }}
      />
      <BillPrintSheet order={billOrder} onOpenChange={(o) => !o && setBillOrder(null)} />
    </div>
  );
}
