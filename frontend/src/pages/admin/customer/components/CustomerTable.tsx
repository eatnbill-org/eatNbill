import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Customer } from "@/types/customer";
import { formatDateTime, formatINR } from "@/lib/format";
import { MessageCircle, MoreVertical, Search, Trash2, X, Plus, User, Wallet, Sparkles } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

interface CustomerTableProps {
  customers: Customer[];
  onCustomerSelect: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
  onAddCustomer: () => void;
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

function loyaltyLabel(totalOrders: number) {
  if (totalOrders >= 25) return { label: "Elite", variant: "bg-indigo-500 text-white", icon: <Sparkles className="w-3 h-3 mr-1" /> };
  if (totalOrders >= 10) return { label: "Loyal", variant: "bg-amber-500 text-white", icon: <Sparkles className="w-3 h-3 mr-1" /> };
  if (totalOrders >= 5) return { label: "Regular", variant: "bg-emerald-500 text-white", icon: null };
  return { label: "New", variant: "bg-slate-100 text-slate-500 border-slate-200", icon: null };
}

export default function CustomerTable({ customers, onCustomerSelect, onDeleteCustomer, onAddCustomer, onSearch, isLoading }: CustomerTableProps) {
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  React.useEffect(() => {
    onSearch(debouncedQuery);
  }, [debouncedQuery, onSearch]);

  const handleWhatsApp = (phone: string, name: string) => {
    const message = encodeURIComponent(`Hello ${name}! Welcome to our restaurant.`);
    const whatsappUrl = `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Search & Add Bar - Premium Glass Look */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-xl shadow-slate-200/50">
        <div className="relative flex-1 w-full max-w-[460px] group transition-all">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, phone or membership..."
            className="pl-11 pr-11 h-12 bg-white/80 border-slate-100 rounded-2xl focus-visible:ring-orange-500 focus-visible:ring-offset-0 shadow-sm transition-all"
          />
          {query.trim().length > 0 && (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1.5 text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all"
              onClick={() => setQuery("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Button
          onClick={onAddCustomer}
          className="h-12 px-6 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold uppercase tracking-widest text-[11px] shadow-lg shadow-slate-200 transition-all shrink-0 w-full md:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Premium Customer
        </Button>
      </div>

      {/* Modern Table Container */}
      <div className="rounded-[2.5rem] border border-slate-100 bg-white shadow-2xl shadow-slate-200/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
              <TableHead className="w-[300px] py-6 pl-8 text-xs font-black uppercase tracking-widest text-slate-400">Customer Identity</TableHead>
              <TableHead className="w-[180px] py-6 text-xs font-black uppercase tracking-widest text-slate-400">Interaction Status</TableHead>
              <TableHead className="py-6 text-right text-xs font-black uppercase tracking-widest text-slate-400">Revenue</TableHead>
              <TableHead className="py-6 text-right text-xs font-black uppercase tracking-widest text-slate-400">Wallet</TableHead>
              <TableHead className="py-6 text-center text-xs font-black uppercase tracking-widest text-slate-400">Frequency</TableHead>
              <TableHead className="py-6 pr-8 text-right text-xs font-black uppercase tracking-widest text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4 opacity-40">
                    <User className="h-12 w-12 text-slate-300" />
                    <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">No records matching your criteria</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <AnimatePresence mode="popLayout">
                {customers.map((customer, index) => {
                  const loyalty = loyaltyLabel(customer.totalOrders);
                  return (
                    <motion.tr
                      key={customer.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="group cursor-pointer hover:bg-slate-50/80 transition-all border-b border-slate-50 last:border-none"
                      onClick={() => onCustomerSelect(customer)}
                    >
                      <TableCell className="py-5 pl-8">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-bold text-lg border border-white shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-black text-slate-800 tracking-tight truncate max-w-[160px]">{customer.name}</span>
                              <Badge className={cn("text-[9px] h-4 px-1.5 border-none shadow-none uppercase font-black italic", loyalty.variant)}>
                                {loyalty.icon}{loyalty.label}
                              </Badge>
                            </div>
                            <span className="text-xs font-bold font-mono text-slate-400 tracking-wider">+91 {customer.phone}</span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-600">Last Seen</span>
                          <span className="text-[10px] uppercase font-black text-slate-400 opacity-70 italic tracking-tighter">
                            {formatDateTime(customer.lastVisit).split(',')[0]}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <span className="text-sm font-black text-slate-800 tracking-tighter italic">
                          {formatINR(customer.totalSpent)}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        {Number(customer.credit_balance) > 0 ? (
                          <div className="inline-flex items-center gap-1.5 bg-orange-50 px-2.5 py-1 rounded-xl border border-orange-100 shadow-sm">
                            <Wallet className="w-3 h-3 text-orange-500" />
                            <span className="font-black text-orange-600 text-xs italic">
                              {formatINR(Number(customer.credit_balance))}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">— empty —</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 font-black text-xs group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                          {customer.totalOrders}
                        </div>
                      </TableCell>

                      <TableCell onClick={(e) => e.stopPropagation()} className="pr-8 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl border border-transparent hover:border-emerald-100 shrink-0 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWhatsApp(customer.phone, customer.name);
                            }}
                          >
                            <MessageCircle className="h-5 w-5" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-slate-400 hover:bg-slate-100 rounded-xl shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl shadow-2xl border-slate-100 bg-white/95 backdrop-blur-md">
                              <DropdownMenuItem
                                className="rounded-xl font-bold text-xs uppercase tracking-widest py-2.5"
                                onSelect={() => onCustomerSelect(customer)}
                              >
                                <User className="mr-2 h-4 w-4" /> View Portfolio
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="rounded-xl font-bold text-xs uppercase tracking-widest py-2.5 text-rose-500 focus:text-rose-600 focus:bg-rose-50"
                                onSelect={(e) => {
                                  e.preventDefault();
                                  onDeleteCustomer(customer);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Terminate Account
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}