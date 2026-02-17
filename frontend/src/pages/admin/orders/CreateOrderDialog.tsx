/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Create Order Dialog
 * Optimized POS Style - V4 (Vibrant & User Focused)
 */

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAdminOrdersStore } from '@/stores/orders';
import { useProductsStore } from '@/stores/products';
import { useCategoriesStore } from '@/stores/categories';
import { useTableStore } from '@/stores/tables';
import type { CreateOrderPayload } from '@/types/order';
import type { Product } from '@/types/product';
import { Trash2, ShoppingBag, Search, UtensilsCrossed, Sparkles, X, Clock, MapPin, Tablet, User, ChevronLeft, ChevronRight, Plus, Minus, Check } from 'lucide-react';
import { formatINR } from '@/lib/format';
import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/ui/skeleton';

// CSS override for time picker aesthetics
const timePickerStyles = `
  input[type="time"]::-webkit-calendar-picker-indicator {
    background: transparent;
    bottom: 0;
    color: transparent;
    cursor: pointer;
    height: auto;
    left: 0;
    position: absolute;
    right: 0;
    top: 0;
    width: auto;
  }
`;

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface OrderItem {
  product_id: string;
  product: Product;
  quantity: number;
  unit_price: number;
}

import { Checkbox } from '@/components/ui/checkbox';
import { printKitchenSlip } from '@/lib/print-utils';
import { Label } from 'recharts';

export default function CreateOrderDialog({ open, onOpenChange, onSuccess }: CreateOrderDialogProps) {
  const { createOrder, creating, orders } = useAdminOrdersStore();
  const { products, fetchProducts, loading: productsLoading } = useProductsStore();
  const { categories, fetchCategories, activeCategories } = useCategoriesStore();
  const { tables, fetchTables } = useTableStore();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [arriveAt, setArriveAt] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [printSlip, setPrintSlip] = useState(false); // Default OFF per plan

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - 200 : scrollLeft + 200;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        scrollRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  // Fetch data when dialog opens
  useEffect(() => {
    if (open) {
      if (products.length === 0) fetchProducts();
      if (categories.length === 0) fetchCategories();
      if (tables.length === 0) fetchTables();
    }
  }, [open, products.length, categories.length, tables.length, fetchProducts, fetchCategories, fetchTables]);

  const activeCats = activeCategories();

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => !selectedCategoryId || p.category_id === selectedCategoryId)
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [products, selectedCategoryId, searchQuery]);

  // ✅ FIXED: Use correct ACTIVE status instead of old statuses
  const tablesWithOrders = new Set(
    orders
      .filter(order => order.status === 'ACTIVE')
      .map(order => order.table_number)
      .filter(Boolean)
  );

  const addItem = (product: Product) => {
    const existingItem = orderItems.find(item => item.product_id === product.id);
    if (existingItem) {
      setOrderItems(orderItems.map(item =>
        item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      const discount = parseFloat(product.discount_percent || '0');
      const discountedPrice = parseFloat(product.price) * (1 - discount / 100);
      setOrderItems([...orderItems, {
        product_id: product.id,
        product,
        quantity: 1,
        unit_price: discountedPrice,
      }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setOrderItems(orderItems.map(item => {
      if (item.product_id === productId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeItem = (productId: string) => {
    setOrderItems(orderItems.filter(item => item.product_id !== productId));
  };

  const totalAmount = orderItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) return;

    const normalizedName = customerName.trim();
    const normalizedPhone = customerPhone.trim();

    const payload: CreateOrderPayload = {
      customer_name: normalizedName || undefined,
      customer_phone: normalizedPhone || undefined,
      table_number: tableNumber || undefined,
      notes: notes || undefined,
      arrive_at: arriveAt || undefined,
      order_type: tableNumber ? 'DINE_IN' : 'TAKEAWAY',
      items: orderItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    };

    const order = await createOrder(payload);
    if (order) {
      setCustomerName('');
      setCustomerPhone('');
      setTableNumber('');
      setNotes('');
      setArriveAt('');
      setOrderItems([]);
      setSelectedCategoryId(null);
      onOpenChange(false);
      if (printSlip) {
        printKitchenSlip(order);
        setPrintSlip(false);
      }
      if (onSuccess) onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[99vw] h-[98vh] p-0 overflow-hidden border-none rounded-[1.25rem] sm:rounded-[2rem] shadow-2xl bg-white flex flex-col [&>button:last-child]:hidden">
        <style>{timePickerStyles}</style>

        {/* Close Button UI - Premium Variant */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-6 right-6 z-[100] h-12 w-12 rounded-2xl bg-primary/5 hover:bg-primary/10 flex items-center justify-center text-primary transition-all shadow-sm border border-primary/10"
        >
          <X className="w-6 h-6" />
        </button>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">

          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-white">



            {/* Middle: Product Grid (Modern Fresh Design) */}
            <div className="lg:col-span-8 flex flex-col p-3 sm:p-4 lg:p-6 overflow-hidden bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-md">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle asChild>
                      <h2 className="text-xl font-bold text-slate-800 tracking-tight uppercase flex items-center gap-1.5">
                        Create New Order
                      </h2>
                    </DialogTitle>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">POS Terminal</p>
                  </div>
                </div>
                <div className="relative group flex-1 max-w-xs mr-8">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search products..."
                    className="pl-11 h-10 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white transition-all shadow-none rounded-xl text-sm font-bold"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Horizontal Categories Bar */}
              <div className="relative group/category mb-4">
                {/* Left Arrow */}
                <button
                  type="button"
                  onClick={() => scroll('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white/90 shadow-md border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 opacity-0 group-hover/category:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div
                  ref={scrollRef}
                  onWheel={handleWheel}
                  className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-4 border-b border-slate-50 px-1 scroll-smooth"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      "flex flex-col items-center gap-1.5 h-auto py-2.5 px-4 rounded-2xl transition-all min-w-[80px]",
                      selectedCategoryId === null ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                    )}
                    onClick={() => setSelectedCategoryId(null)}
                  >
                    <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all", selectedCategoryId === null ? "bg-white/20 border-white/30" : "bg-white border-slate-100")}>
                      <UtensilsCrossed className={cn("w-6 h-6", selectedCategoryId === null ? "text-white" : "text-primary")} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Catalog</span>
                  </Button>
                  {activeCats.map(category => (
                    <Button
                      key={category.id}
                      type="button"
                      variant="ghost"
                      className={cn(
                        "flex flex-col items-center gap-1.5 h-auto py-2.5 px-4 rounded-2xl transition-all min-w-[80px]",
                        selectedCategoryId === category.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                      )}
                      onClick={() => setSelectedCategoryId(category.id)}
                    >
                      <div className={cn("h-12 w-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all", selectedCategoryId === category.id ? "border-white/40" : "border-slate-100")}>
                        {category.image_url ? (
                          <img src={category.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400 font-bold text-lg">
                            {category.name[0]}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider truncate max-w-[70px]">{category.name}</span>
                    </Button>
                  ))}
                </div>

                {/* Right Arrow */}
                <button
                  type="button"
                  onClick={() => scroll('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-white/90 shadow-md border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 opacity-0 group-hover/category:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar pr-2">
                {productsLoading ? (
                  <div className="py-4">
                    <TableSkeleton rows={6} />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pb-40">
                    {filteredProducts.map(product => {
                      const orderItem = orderItems.find(item => item.product_id === product.id);
                      const quantity = orderItem?.quantity || 0;
                      const discount = parseFloat(product.discount_percent || '0');

                      return (
                        <motion.div
                          layout
                          key={product.id}
                          whileHover={product.is_active ? { scale: 1.01 } : {}}
                          whileTap={product.is_active ? { scale: 0.99 } : {}}
                          className={cn(
                            "relative p-3 rounded-xl border-2 transition-all cursor-pointer group flex items-center gap-2 h-20 overflow-hidden",
                            quantity > 0 ? "border-indigo-500 bg-indigo-50/40 shadow-sm" : "border-slate-50 bg-slate-50/30 hover:border-indigo-100 hover:bg-white",
                            !product.is_active && "opacity-60 grayscale-[0.8] cursor-not-allowed border-dashed"
                          )}
                          onClick={() => product.is_active && addItem(product)}
                        >
                          {/* Product Info */}
                          <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                            <div className="flex items-center gap-1.5 mb-1">
                              {product.is_veg !== null && (
                                <div className={cn("h-3 w-3 rounded-sm border flex items-center justify-center p-[1px] shrink-0", product.is_veg ? "border-emerald-500 bg-emerald-50" : "border-rose-500 bg-rose-50")}>
                                  <div className={cn("h-full w-full rounded-full", product.is_veg ? "bg-emerald-500" : "bg-rose-500")} />
                                </div>
                              )}
                              <p className="text-[12px] font-bold text-slate-900 leading-snug line-clamp-2">{product.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-extrabold text-indigo-600 tracking-tight">{formatINR(parseFloat(product.price) * (1 - discount / 100))}</span>
                              {discount > 0 && <span className="text-[10px] text-slate-400 line-through font-bold">{formatINR(parseFloat(product.price))}</span>}
                            </div>
                            {!product.is_active && (
                              <span className="text-[8px] font-bold uppercase text-rose-500 mt-0.5">Out of Stock</span>
                            )}
                          </div>

                          {/* Minimalist Controls */}
                          {quantity > 0 ? (
                            <div className="flex items-center gap-2 bg-white border border-indigo-100 rounded-lg p-1" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                className="h-5 w-5 flex items-center justify-center text-indigo-500 hover:bg-indigo-50 rounded-md transition-colors bg-slate-50"
                                onClick={() => updateQuantity(product.id, -1)}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-[10px] font-black text-indigo-900 leading-none min-w-[12px] text-center">{quantity}</span>
                            </div>
                          ) : (
                            <div className="h-6 w-6 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-indigo-200 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                              <Plus className="w-3 h-3" />
                            </div>
                          )}

                          {discount > 0 && (
                            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[7px] font-black px-1 py-0.5 rounded-bl-md">
                              -{discount}%
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Checkout Flow (Ultra-Premium POS Design) */}
            <div className="lg:col-span-4 bg-slate-50/40 flex flex-col border-t lg:border-t-0 lg:border-l border-indigo-50/50 h-full overflow-hidden">
              <div className="p-3 sm:p-4 lg:p-6 flex flex-col h-full overflow-hidden space-y-4">

                {/* Customer Identity Section - Fixed at top */}
                <div className="space-y-3 shrink-0">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-3.5 bg-indigo-600 rounded-full" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Customer Details</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <Input
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="Name"
                        className="h-11 bg-white border-none shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] focus:shadow-[0_8px_20px_-6px_rgba(16,185,129,0.15)] ring-1 ring-slate-100 focus:ring-2 focus:ring-primary transition-all rounded-xl font-bold px-9 text-xs placeholder:text-slate-300 placeholder:font-medium"
                      />
                    </div>
                    <div className="relative group">
                      <Tablet className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <Input
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        placeholder="Mobile"
                        className="h-11 bg-white border-none shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] focus:shadow-[0_8px_20px_-6px_rgba(16,185,129,0.15)] ring-1 ring-slate-100 focus:ring-2 focus:ring-primary transition-all rounded-xl font-bold px-9 text-xs placeholder:text-slate-300 placeholder:font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative group">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-primary transition-colors z-10" />
                      <Select value={tableNumber} onValueChange={setTableNumber}>
                        <SelectTrigger className="h-11 bg-white border-none shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] ring-1 ring-slate-100 focus:ring-2 focus:ring-primary rounded-xl font-bold px-9 text-xs transition-all">
                          <SelectValue placeholder="Table" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl p-1">
                          {tables.filter(t => t.is_active).map(table => (
                            <SelectItem key={table.id} value={table.table_number} disabled={tablesWithOrders.has(table.table_number)} className="rounded-xl py-2.5 font-bold text-xs">
                              Table {table.table_number} {tablesWithOrders.has(table.table_number) ? '• Busy' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="relative group">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-primary transition-colors z-20 pointer-events-none" />
                      <Input
                        type="time"
                        value={arriveAt}
                        onChange={e => setArriveAt(e.target.value)}
                        className="h-11 bg-white border-none shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] ring-1 ring-slate-100 focus:ring-2 focus:ring-primary rounded-xl font-bold px-10 text-xs transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Order Summary Manifest - Independent Scroll Area */}
                <div className="flex-1 flex flex-col min-h-0 bg-white rounded-[1.75rem] p-4 shadow-[0_10px_40px_-15px_rgba(16,185,129,0.08)] border border-primary/50 overflow-hidden">
                  <div className="flex items-center justify-between mb-3 px-1 shrink-0">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                      <p className="text-[10px] font-bold uppercase text-slate-800 tracking-widest">Order Summary</p>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-lg text-[10px] font-bold px-2 py-0.5">
                      {orderItems.reduce((acc, item) => acc + item.quantity, 0)} ITEMS
                    </Badge>
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                    <AnimatePresence mode="popLayout">
                      {orderItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-200 py-16 opacity-50">
                          <ShoppingBag className="w-12 h-12 mb-3 stroke-[1.5]" />
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">No items selected</p>
                        </div>
                      ) : (
                        orderItems.map(item => (
                          <motion.div
                            key={item.product_id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex items-center justify-between bg-slate-50/50 hover:bg-white group px-4 py-3 rounded-2xl border border-transparent hover:border-indigo-50 hover:shadow-sm transition-all"
                          >
                            <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                              <p className="text-xs font-bold text-slate-800 truncate">{item.product.name}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                                  {item.quantity}x
                                </span>
                                <span className="text-[9px] font-bold text-slate-400">@ {formatINR(item.unit_price)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 pl-2">
                              <span className="text-sm font-black text-slate-900 tracking-tight">{formatINR(item.unit_price * item.quantity)}</span>
                              <button
                                type="button"
                                onClick={() => removeItem(item.product_id)}
                                className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* High-Impact Order Footer */}
              <div className="p-6 bg-white border-t border-slate-100 shrink-0 space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="print-slip"
                    checked={printSlip}
                    onCheckedChange={(c) => setPrintSlip(!!c)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:text-white border-slate-300"
                  />
                  <Label
                    htmlFor="print-slip"
                    className="text-xs font-bold text-slate-600 uppercase tracking-wide cursor-pointer select-none"
                  >
                    Print Kitchen Slip Automatically
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={creating || orderItems.length === 0}
                  className={cn(
                    "w-full h-20 rounded-[1.75rem] shadow-[0_20px_40px_-10px_rgba(79,70,229,0.3)] transition-all relative overflow-hidden group active:scale-[0.98]",
                    (creating || orderItems.length === 0)
                      ? "bg-slate-100 text-slate-400"
                      : "bg-primary hover:bg-primary/90 text-white"
                  )}
                >
                  {creating ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="text-sm font-bold uppercase tracking-widest">Processing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full px-4 h-full relative z-10">
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">Total Payable</span>
                        <span className="text-2xl font-bold tracking-tight">{formatINR(totalAmount)}</span>
                      </div>
                      <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 group-hover:bg-white/20 transition-all">
                        <span className="text-[11px] font-bold uppercase tracking-widest">Confirm Order</span>
                        <div className="h-6 w-6 rounded-lg bg-white text-primary flex items-center justify-center shadow-sm">
                          <Check className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Luxury Shine Effect */}
                  {!creating && orderItems.length > 0 && (
                    <div className="absolute top-0 left-[-150%] w-[100%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-30deg] group-hover:left-[150%] transition-all duration-1000 ease-in-out pointer-events-none" />
                  )}
                </Button>

                {/* Secondary Help Text */}
                <p className="text-center text-[9px] font-bold text-slate-400 mt-4 uppercase tracking-widest opacity-60">
                  By confirming, you agree to the restaurant POS protocols
                </p>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
