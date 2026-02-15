import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCustomerAnalytics,
  useCustomerOrders,
  useUpdateCustomer,
  useUpdateCustomerCredit
} from "@/hooks/use-customers";
import type { Customer } from "@/types/customer";
import { formatDateTime, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Edit2,
  Check,
  Plus,
  X,
  Loader2,
  Wallet,
  ShoppingBag,
  Calendar,
  User,
  Phone,
  ArrowUpRight,
  Sparkles,
  Trash2
} from "lucide-react";

interface CustomerProfileModalProps {
  customer: Customer | null;
  onClose: () => void;
  onDelete: (customer: Customer) => void;
}

function loyaltyLabel(totalOrders: number) {
  if (totalOrders >= 25) return { label: "Elite", variant: "bg-indigo-500", icon: <Sparkles className="w-3 h-3 mr-1" /> };
  if (totalOrders >= 10) return { label: "Loyal", variant: "bg-amber-500", icon: <Sparkles className="w-3 h-3 mr-1" /> };
  if (totalOrders >= 5) return { label: "Regular", variant: "bg-emerald-500", icon: null };
  return { label: "New", variant: "bg-slate-400", icon: null };
}

export default function CustomerProfileModal({ customer, onClose, onDelete }: CustomerProfileModalProps) {
  const { data: analytics, isLoading: statsLoading } = useCustomerAnalytics(customer?.id || "", 90);
  const { data: ordersData, isLoading: ordersLoading } = useCustomerOrders(customer?.id || "", 1, 50);

  const updateMutation = useUpdateCustomer();
  const creditMutation = useUpdateCustomerCredit();

  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editedName, setEditedName] = React.useState("");
  const [isEditingPhone, setIsEditingPhone] = React.useState(false);
  const [editedPhone, setEditedPhone] = React.useState("");

  const [addCreditOpen, setAddCreditOpen] = React.useState(false);
  const [creditAmount, setCreditAmount] = React.useState("");
  const [sourceFilter, setSourceFilter] = React.useState<"all" | "online" | "walkin">("all");

  React.useEffect(() => {
    if (customer) {
      setEditedName(customer.name);
      setEditedPhone(customer.phone);
    }
  }, [customer]);

  const orders = React.useMemo(() => {
    const allOrders = ordersData?.data || [];

    if (sourceFilter === "all") return allOrders;

    if (sourceFilter === "online") {
      return allOrders.filter((order: any) =>
        order.source === "ZOMATO" || order.source === "SWIGGY"
      );
    }

    return allOrders.filter((order: any) =>
      order.source === "MANUAL" || order.source === "QR" || order.source === "WEB"
    );
  }, [ordersData, sourceFilter]);

  const stats = analytics?.customer || null;
  const loyalty = stats ? loyaltyLabel(stats.visit_count) : (customer ? loyaltyLabel(0) : null);

  const handleSaveName = async () => {
    if (!customer || !editedName.trim()) return toast.error("Name cannot be empty");
    try {
      await updateMutation.mutateAsync({ id: customer.id, data: { name: editedName } });
      toast.success("Name updated!");
      setIsEditingName(false);
    } catch (err) {
      toast.error("Failed to update name");
    }
  };

  const handleSavePhone = async () => {
    if (!customer || !editedPhone.trim()) return toast.error("Phone cannot be empty");
    try {
      await updateMutation.mutateAsync({ id: customer.id, data: { phone: editedPhone } });
      toast.success("Phone updated!");
      setIsEditingPhone(false);
    } catch (err) {
      toast.error("Failed to update phone");
    }
  };

  const handleAddCredit = async () => {
    if (!creditAmount || isNaN(Number(creditAmount))) return toast.error("Invalid amount");
    try {
      await creditMutation.mutateAsync({ id: customer!.id, amount: Number(creditAmount) });
      toast.success(`₹${creditAmount} credit added!`);
      setCreditAmount("");
      setAddCreditOpen(false);
    } catch (err) {
      toast.error("Failed to add credit");
    }
  };

  if (!customer) return null;

  return (
    <>
      <Dialog open={Boolean(customer)} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-6xl p-0 gap-0 overflow-hidden outline-none border-none shadow-2xl h-[90vh] bg-slate-50">
          <div className="flex h-full min-h-0 relative">

            {/* LEFT SIDEBAR - ULTRA COMPACT */}
            <div className="w-[300px] bg-white border-r flex flex-col h-full shadow-lg z-10 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-32 bg-indigo-50/50 pointer-events-none" />

              {/* Profile Header - Compact */}
              <div className="p-4 relative space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white shadow-md">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      {isEditingName ? (
                        <div className="flex items-center gap-1">
                          <Input value={editedName} onChange={(e) => setEditedName(e.target.value)} className="h-7 w-32 text-xs" autoFocus />
                          <button onClick={handleSaveName} className="text-emerald-500"><Check className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <h2 className="font-black text-sm text-slate-800 truncate max-w-[120px]">{customer.name}</h2>
                          <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover:opacity-100"><Edit2 className="w-3 h-3 text-slate-400" /></button>
                        </div>
                      )}

                      {isEditingPhone ? (
                        <div className="flex items-center gap-1 mt-1">
                          <Input value={editedPhone} onChange={(e) => setEditedPhone(e.target.value)} className="h-7 w-32 text-xs" autoFocus />
                          <button onClick={handleSavePhone} className="text-emerald-500"><Check className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group mt-0.5">
                          <span className="text-[10px] font-bold text-slate-400"># {customer.phone}</span>
                          <button onClick={() => setIsEditingPhone(true)} className="opacity-0 group-hover:opacity-100"><Edit2 className="w-3 h-3 text-slate-400" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                  {loyalty && (
                    <Badge className={cn("px-2 py-0.5 text-[8px] font-black uppercase border-none text-white", loyalty.variant)}>
                      {loyalty.label}
                    </Badge>
                  )}
                </div>

                {/* Stats Section - In One Row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Orders</p>
                    <p className="text-xs font-black text-slate-800 leading-none mt-2">
                      {statsLoading ? "..." : (stats?.visit_count || 0)}
                    </p>
                  </div>
                  <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Spent</p>
                    <p className="text-xs font-black text-slate-800 leading-none mt-2">
                      {statsLoading ? "..." : formatINR(Number(stats?.total_spent) || 0)}
                    </p>
                  </div>
                </div>

                {/* Combined Credit Management Card */}
                <div className="bg-indigo-600 rounded-2xl p-4 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
                    <Wallet className="w-16 h-16 text-white" />
                  </div>
                  <div className="relative z-10 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black text-indigo-200 uppercase tracking-[0.2em] leading-none">Wallet Ledger</p>
                        <p className="text-xl font-black leading-none mt-2 tracking-tighter italic">{formatINR(Number(customer.credit_balance))}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setCreditAmount(""); setAddCreditOpen(true); }}
                        className="flex-1 h-8 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all border border-white/10"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                      <button
                        onClick={() => {
                          const amount = prompt("Enter amount to deduct from credit:");
                          if (amount && !isNaN(Number(amount))) {
                            creditMutation.mutate({ id: customer.id, amount: -Number(amount) });
                          }
                        }}
                        className="flex-1 h-8 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all border border-white/10"
                      >
                        <Trash2 className="w-3 h-3" /> Debt
                      </button>
                    </div>
                  </div>
                </div>

                {/* Timeline History - Minimal */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-[1px] flex-1 bg-slate-100" />
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">Timeline</span>
                    <div className="h-[1px] flex-1 bg-slate-100" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400">First Interaction</span>
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                        {stats?.first_visit_date ? formatDateTime(stats.first_visit_date).split(',')[0] : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-400">Recent Terminal</span>
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                        {stats?.last_visit_date ? formatDateTime(stats.last_visit_date).split(',')[0] : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="mt-auto p-4 border-t bg-slate-50/50">
                <Button
                  variant="ghost"
                  className="w-full h-10 text-[9px] font-black uppercase tracking-widest text-rose-500 bg-white hover:bg-rose-50 border border-slate-100 rounded-xl"
                  onClick={() => onDelete(customer)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Expunge Customer Record
                </Button>
              </div>
            </div>

            {/* RIGHT MAIN - ORDER HISTORY */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50 relative">
              {/* Decorative Blur */}
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-orange-100/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              {/* Close Button Absolute */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 h-9 w-9 z-20 hover:bg-white shadow-sm border border-slate-100 rounded-xl"
                onClick={onClose}
              >
                <X className="h-5 w-5 text-slate-400" />
              </Button>

              <div className="p-8 pb-4 relative z-10 flex flex-col flex-1 min-h-0">
                {/* Custom Table Container */}
                <div className="flex-1 min-h-0 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col">
                  <div className="bg-slate-50/80 backdrop-blur-md border-b border-slate-100 px-8 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="w-4 h-4 text-slate-400" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-700">Transaction History</h3>
                    </div>

                    <Tabs value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)}>
                      <TabsList className="h-8 bg-slate-200/50 p-1 rounded-lg">
                        <TabsTrigger value="all" className="text-[10px] px-3 font-bold h-6 rounded-md data-[state=active]:bg-white">ALL</TabsTrigger>
                        <TabsTrigger value="online" className="text-[10px] px-3 font-bold h-6 rounded-md data-[state=active]:bg-white">ONLINE</TabsTrigger>
                        <TabsTrigger value="walkin" className="text-[10px] px-3 font-bold h-6 rounded-md data-[state=active]:bg-white">WALK-IN</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <div className="flex-1 overflow-y-auto scrollbar-hide no-scrollbar min-h-0">
                    <Table>
                      <TableHeader className="bg-white sticky top-0 z-10">
                        <TableRow className="hover:bg-transparent border-slate-50">
                          <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4 pl-8">Timeline</TableHead>
                          <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4">Ref #</TableHead>
                          <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-4">Manifest</TableHead>
                          <TableHead className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest py-4 pr-8">Terminal Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {orders.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="h-64 text-center">
                                <div className="flex flex-col items-center justify-center space-y-2">
                                  <ShoppingBag className="w-6 h-6 text-slate-200" />
                                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tighter">No transactions yet</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            orders.map((order) => (
                              <TableRow key={order.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                                <TableCell className="py-4 pl-8">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-black text-slate-700 leading-none">
                                      {new Date(order.placed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    </span>
                                    <span className="text-[9px] uppercase font-bold text-slate-400 mt-1">
                                      {new Date(order.placed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-4">
                                  <span className="text-[10px] font-mono text-slate-400 font-bold">#{order.id.slice(0, 6)}</span>
                                </TableCell>
                                <TableCell className="py-4">
                                  <div className="flex flex-wrap gap-1">
                                    {order.items?.slice(0, 2).map((i: any, idx: number) => (
                                      <span key={idx} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-bold border border-slate-200/50">
                                        {i.quantity}× {i.name_snapshot}
                                      </span>
                                    ))}
                                    {order.items?.length > 2 && (
                                      <span className="text-[9px] font-bold text-slate-300 ml-1">+{order.items.length - 2} more</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right py-4 pr-8">
                                  <div className="flex flex-col items-end">
                                    <span className="text-sm font-black text-slate-800 tracking-tighter italic leading-none">
                                      {formatINR(order.total_amount)}
                                    </span>
                                    <span className={cn(
                                      "text-[8px] font-black uppercase mt-1 italic tracking-tighter",
                                      order.status === 'COMPLETED' ? 'text-emerald-500' : 'text-slate-400'
                                    )}>{order.status}</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modern Credit Dialog */}
      <Dialog open={addCreditOpen} onOpenChange={setAddCreditOpen}>
        <DialogContent className="max-w-xs p-6 rounded-[2rem] border-none shadow-2xl">
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="h-14 w-14 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200 mb-2">
                <Wallet className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Add Credits</h3>
              <p className="text-sm text-slate-400 font-medium">How much store credit would you like to assign?</p>
            </div>

            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xl text-orange-500 group-focus-within:text-orange-600 transition-colors">₹</span>
              <Input
                type="number"
                placeholder="0.00"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="h-14 pl-9 text-2xl font-black rounded-2xl border-slate-100 bg-slate-50 focus-visible:ring-orange-500 placeholder:text-slate-200"
                autoFocus
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setAddCreditOpen(false)}
                className="flex-1 h-12 rounded-2xl font-bold uppercase tracking-widest text-slate-400 border-slate-100 hover:bg-slate-50 transition-all"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCredit}
                className="flex-1 h-12 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold uppercase tracking-widest shadow-lg shadow-slate-200 transition-all"
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}