// import * as React from "react";
// import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Switch } from "@/components/ui/switch";
// import { Badge } from "@/components/ui/badge";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Separator } from "@/components/ui/separator";
// import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
// import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
// import { toast } from "@/hooks/use-toast";
// import { useLocalStorageState } from "@/hooks/use-local-storage-state";
// import { useDemoStore } from "@/store/demo-store";
// import { formatINR } from "@/lib/format";
// import { calcDiscountedPrice, toTimeHHMM } from "@/pages/admin/products/utils";
// import type { ProductMetaMap, SpecialTemplate } from "@/pages/admin/products/productMeta";
// import { Package, Plus, Search, Tag, X } from "lucide-react";
// const DEFAULT_CATEGORIES = ["All Categories", "Bowls", "Burgers", "Wraps", "Sandwiches", "Snacks", "Drinks", "Other"] as const;
// const META_STORAGE_KEY = "arabian-nights:products:meta:v1";
// function useTodayStats(orders: {
//   receivedAt: string;
//   items: {
//     name: string;
//     qty: number;
//     price: number;
//   }[];
// }[]) {
//   return React.useMemo(() => {
//     const sold = new Map<string, {
//       qty: number;
//       revenue: number;
//     }>();
//     const buckets = new Map<number, number>();
//     for (let h = 12; h <= 18; h++) buckets.set(h, 0);
//     for (const o of orders) {
//       const d = new Date(o.receivedAt);
//       const hr = d.getHours();
//       if (buckets.has(hr)) buckets.set(hr, (buckets.get(hr) ?? 0) + 1);
//       for (const it of o.items) {
//         const prev = sold.get(it.name) ?? {
//           qty: 0,
//           revenue: 0
//         };
//         sold.set(it.name, {
//           qty: prev.qty + it.qty,
//           revenue: prev.revenue + it.qty * it.price
//         });
//       }
//     }
//     const topSelling = Array.from(sold.entries()).map(([name, v]) => ({
//       name,
//       ...v
//     })).sort((a, b) => b.qty - a.qty).slice(0, 3);
//     const rush = Array.from(buckets.entries()).map(([h, count]) => ({
//       hour: `${h % 12 || 12}-${(h + 1) % 12 || 12} ${h < 12 ? "AM" : "PM"}`,
//       count,
//       h
//     }));
//     const peak = rush.reduce((best, cur) => cur.count > best.count ? cur : best, rush[0] ?? {
//       count: 0,
//       h: 12,
//       hour: ""
//     });
//     const total = rush.reduce((s, r) => s + r.count, 0);
//     const avg = rush.length ? total / rush.length : 0;
//     return {
//       topSelling,
//       rush,
//       peakHour: peak,
//       totalRushOrders: total,
//       avgPerHour: avg
//     };
//   }, [orders]);
// }
// function categoryOf(p: {
//   category?: string;
// }) {
//   const c = (p.category || "Other").trim() || "Other";
//   return DEFAULT_CATEGORIES.includes(c as any) ? c : "Other";
// }
// function fileToDataUrl(file: File) {
//   return new Promise<string>((resolve, reject) => {
//     const reader = new FileReader();
//     reader.onload = () => resolve(String(reader.result || ""));
//     reader.onerror = () => reject(new Error("Failed to read file"));
//     reader.readAsDataURL(file);
//   });
// }
// export default function AdminProductsPage() {
//   const {
//     state,
//     dispatch
//   } = useDemoStore();
//   const [metaById, setMetaById] = useLocalStorageState<ProductMetaMap>(META_STORAGE_KEY, {});
//   const [query, setQuery] = React.useState("");
//   const [category, setCategory] = React.useState<(typeof DEFAULT_CATEGORIES)[number]>("All Categories");
//   const [addOpen, setAddOpen] = React.useState(false);
//   const [stockOpen, setStockOpen] = React.useState(false);
//   const [selectedId, setSelectedId] = React.useState<number | null>(null);
//   const today = useTodayStats(state.orders);
//   const filtered = React.useMemo(() => {
//     const q = query.trim().toLowerCase();
//     return state.products.filter(p => {
//       const matchesQuery = !q || p.name.toLowerCase().includes(q) || String(p.id).includes(q);
//       const matchesCategory = category === "All Categories" || categoryOf(p) === category;
//       return matchesQuery && matchesCategory;
//     });
//   }, [state.products, query, category]);
//   const selected = React.useMemo(() => state.products.find(p => p.id === selectedId) ?? null, [state.products, selectedId]);
//   const topSellingWithProducts = React.useMemo(() => {
//     return today.topSelling.map(t => ({
//       ...t,
//       product: state.products.find(p => p.name === t.name)
//     })).filter(x => x.qty > 0);
//   }, [today.topSelling, state.products]);
//   const clearQuery = () => setQuery("");
//   return <div className="w-full pb-10">
//       {/* Top control bar (NO header component) */}
//       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//         <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
//           <div className="relative w-full sm:max-w-[260px]">
//             <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
//             <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products..." className="pl-9 pr-10" />
//             {query.trim().length > 0 && <button type="button" onClick={clearQuery} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Clear search">
//                 <X className="h-4 w-4" />
//               </button>}
//           </div>

//           <div className="w-full sm:w-[210px]">
//             <Select value={category} onValueChange={v => setCategory(v as any)}>
//               <SelectTrigger className="bg-secondary">
//                 <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
//                 <SelectValue placeholder="Category" />
//               </SelectTrigger>
//               <SelectContent className="z-50 bg-popover">
//                 {DEFAULT_CATEGORIES.map(c => <SelectItem key={c} value={c}>
//                     {c}
//                   </SelectItem>)}
//               </SelectContent>
//             </Select>
//           </div>
//         </div>

//         <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
//           <Button variant="hero" className="w-full sm:w-auto hover-scale" onClick={() => setAddOpen(true)}>
//             <Plus className="mr-2 h-4 w-4" />
//             ADD NEW PRODUCT
//           </Button>
//           <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setStockOpen(true)}>
//             <Package className="mr-2 h-4 w-4" />
//             MANAGE STOCK
//           </Button>
//         </div>
//       </div>

//       {/* Main table/card list */}
//       <div className="mt-4">
//         {/* Desktop/tablet table */}
//         <div className="hidden md:block">
//           <Card className="shadow-elev-1">
//             <CardHeader className="pb-2">
//               <CardTitle className="text-base">Products</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="w-full overflow-auto">
//                 <table className="w-full min-w-[920px] text-sm">
//                   <thead className="text-muted-foreground">
//                     <tr className="border-b">
//                       <th className="h-12 px-4 text-left font-medium">ID</th>
//                       <th className="h-12 px-4 text-left font-medium">Image</th>
//                       <th className="h-12 px-4 text-left font-medium">Name</th>
//                       <th className="h-12 px-4 text-left font-medium">Price</th>
//                       <th className="h-12 px-4 text-left font-medium">Discount</th>
//                       <th className="h-12 px-4 text-left font-medium">Category</th>
//                       <th className="h-12 px-4 text-left font-medium">Status</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {filtered.map(p => {
//                     const meta = metaById[p.id];
//                     const discountEnabled = Boolean(meta?.discount?.enabled);
//                     const discountPercent = meta?.discount?.percent ?? 0;
//                     const discounted = discountEnabled ? calcDiscountedPrice(p.price, discountPercent) : null;
//                     const special = Boolean(meta?.special?.enabled);
//                     return <tr key={p.id} className={"border-b transition-colors hover:bg-muted/50 " + (p.outOfStock ? "opacity-70" : "") + (special ? " bg-accent/10" : "")} role="button" tabIndex={0} onClick={() => setSelectedId(p.id)} onKeyDown={e => {
//                       if (e.key === "Enter" || e.key === " ") setSelectedId(p.id);
//                     }}>
//                           <td className="p-4 align-middle">{p.id}</td>
//                           <td className="p-4 align-middle">
//                             <div className="h-[56px] w-[56px] overflow-hidden rounded-md border bg-muted">
//                               {p.imageUrl ? <img src={p.imageUrl} alt={`${p.name} thumbnail`} className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">No image</div>}
//                             </div>
//                           </td>
//                           <td className="p-4 align-middle">
//                             <div className="font-semibold text-foreground">{p.name}</div>
//                           </td>
//                           <td className="p-4 align-middle">
//                             {discounted != null ? <div className="space-y-0.5">
//                                 <div className="text-muted-foreground line-through">{formatINR(p.price)}</div>
//                                 <div className="font-semibold">{formatINR(discounted)}</div>
//                               </div> : <div className="text-muted-foreground">{formatINR(p.price)}</div>}
//                           </td>
//                           <td className="p-4 align-middle">
//                             {discounted != null ? <Badge variant="success">{Math.round(discountPercent)}% Off</Badge> : <span className="text-muted-foreground">-</span>}
//                           </td>
//                           <td className="p-4 align-middle">
//                             <Badge variant="subtle" className="gap-1">
//                               <Tag className="h-3.5 w-3.5" />
//                               {categoryOf(p)}
//                             </Badge>
//                           </td>
//                           <td className="p-4 align-middle">
//                             <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
//                               <Switch checked={!p.outOfStock} onCheckedChange={() => dispatch({
//                             type: "TOGGLE_STOCK",
//                             productId: p.id
//                           })} />
//                               <span className="text-sm">{p.outOfStock ? "Out ✗" : "In ✓"}</span>
//                             </div>
//                           </td>
//                         </tr>;
//                   })}
//                   </tbody>
//                 </table>
//               </div>

//               {filtered.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">No products match.</div>}
//             </CardContent>
//           </Card>
//         </div>

//         {/* Mobile cards */}
//         <div className="grid gap-3 md:hidden">
//           {filtered.map(p => {
//           const meta = metaById[p.id];
//           const discountEnabled = Boolean(meta?.discount?.enabled);
//           const discountPercent = meta?.discount?.percent ?? 0;
//           const discounted = discountEnabled ? calcDiscountedPrice(p.price, discountPercent) : null;
//           const special = Boolean(meta?.special?.enabled);
//           return <Card key={p.id} className={"shadow-elev-1 " + (special ? "bg-accent/10" : "") + (p.outOfStock ? " opacity-80" : "")} onClick={() => setSelectedId(p.id)} role="button">
//                 <CardContent className="p-4">
//                   <div className="flex items-start justify-between gap-3">
//                     <div className="min-w-0">
//                       <div className="text-base font-semibold">{p.name}</div>
//                       <div className="mt-1 text-xs text-muted-foreground">ID {p.id}</div>
//                     </div>
//                     <Badge variant="subtle">{categoryOf(p)}</Badge>
//                   </div>

//                   <Separator className="my-3" />

//                   <div className="space-y-2 text-sm">
//                     <div>
//                       <span className="text-muted-foreground">Price:</span>{" "}
//                       {discounted != null ? <>
//                           <span className="line-through text-muted-foreground">{formatINR(p.price)}</span>
//                           <span className="ml-2 font-semibold">{formatINR(discounted)}</span>
//                           <Badge variant="success" className="ml-2">{Math.round(discountPercent)}% Off</Badge>
//                         </> : <span className="font-semibold">{formatINR(p.price)}</span>}
//                     </div>

//                     <div className="flex items-center justify-between gap-3" onClick={e => e.stopPropagation()}>
//                       <div className="text-muted-foreground">Status:</div>
//                       <div className="flex items-center gap-2">
//                         <Switch checked={!p.outOfStock} onCheckedChange={() => dispatch({
//                       type: "TOGGLE_STOCK",
//                       productId: p.id
//                     })} />
//                         <span className="font-medium">{p.outOfStock ? "Out ✗" : "In ✓"}</span>
//                       </div>
//                     </div>

//                     <div className="text-xs text-muted-foreground">Tap to edit</div>
//                   </div>
//                 </CardContent>
//               </Card>;
//         })}
//           {filtered.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">No products match.</div>}
//         </div>
//       </div>

//       {/* Bottom cards */}
      

//       {/* Add new product (right drawer) */}
//       <Sheet open={addOpen} onOpenChange={setAddOpen}>
//         <SheetContent side="right" className="w-full sm:max-w-md">
//           <SheetHeader>
//             <SheetTitle>ADD NEW PRODUCT</SheetTitle>
//             <SheetDescription>Create a new product for the menu.</SheetDescription>
//           </SheetHeader>

//           <AddProductForm categories={DEFAULT_CATEGORIES.filter(c => c !== "All Categories") as unknown as string[]} onCreate={payload => {
//           dispatch({
//             type: "ADD_PRODUCT",
//             payload
//           });
//           setAddOpen(false);
//           toast({
//             title: "Product created!"
//           });
//         }} />

//           <SheetFooter className="mt-4" />
//         </SheetContent>
//       </Sheet>

//       {/* Manage stock modal */}
//       <Dialog open={stockOpen} onOpenChange={setStockOpen}>
//         <DialogContent className="max-w-lg">
//           <DialogHeader>
//             <DialogTitle>QUICK STOCK MANAGEMENT</DialogTitle>
//             <DialogDescription>Tap a product to toggle In/Out of stock.</DialogDescription>
//           </DialogHeader>
//           <StockManagerList products={state.products} onToggle={id => dispatch({
//           type: "TOGGLE_STOCK",
//           productId: id
//         })} />
//           <DialogFooter>
//             <Button onClick={() => setStockOpen(false)}>SAVE & CLOSE</Button>
//             <Button variant="secondary" onClick={() => setStockOpen(false)}>
//               CLOSE
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Edit product modal */}
//       <Dialog open={Boolean(selected)} onOpenChange={open => !open && setSelectedId(null)}>
//         <DialogContent className="max-h-[90vh] overflow-auto">
//           {selected && <EditProductModal product={selected} meta={metaById[selected.id]} categories={DEFAULT_CATEGORIES.filter(c => c !== "All Categories") as unknown as string[]} onSave={(next, nextMeta) => {
//           dispatch({
//             type: "UPDATE_PRODUCT",
//             productId: selected.id,
//             patch: next
//           });
//           setMetaById(prev => ({
//             ...prev,
//             [selected.id]: nextMeta
//           }));
//           toast({
//             title: "Product updated!"
//           });
//           setSelectedId(null);
//         }} onDelete={() => {
//           dispatch({
//             type: "DELETE_PRODUCT",
//             productId: selected.id
//           });
//           setMetaById(prev => {
//             const copy = {
//               ...prev
//             };
//             delete copy[selected.id];
//             return copy;
//           });
//           toast({
//             title: "Product deleted!"
//           });
//           setSelectedId(null);
//         }} onCancel={() => setSelectedId(null)} onChangeImage={async file => {
//           const dataUrl = await fileToDataUrl(file);
//           dispatch({
//             type: "UPDATE_PRODUCT",
//             productId: selected.id,
//             patch: {
//               imageUrl: dataUrl
//             }
//           });
//           toast({
//             title: "Image updated"
//           });
//         }} />}
//         </DialogContent>
//       </Dialog>
//     </div>;
// }
// function AddProductForm({
//   categories,
//   onCreate
// }: {
//   categories: string[];
//   onCreate: (payload: {
//     name: string;
//     price: number;
//     category: string;
//     imageUrl?: string;
//   }) => void;
// }) {
//   const [name, setName] = React.useState("");
//   const [price, setPrice] = React.useState("");
//   const [category, setCategory] = React.useState(categories[0] ?? "Other");
//   const [imageUrl, setImageUrl] = React.useState("");
//   const canCreate = name.trim().length > 0 && !Number.isNaN(Number(price)) && Number(price) > 0;
//   return <div className="mt-4 space-y-4">
//       <div className="space-y-2">
//         <Label>Product Name</Label>
//         <Input value={name} onChange={e => setName(e.target.value)} placeholder="Enter product name" />
//       </div>
//       <div className="space-y-2">
//         <Label>Price (₹)</Label>
//         <Input value={price} onChange={e => setPrice(e.target.value)} inputMode="decimal" placeholder="0.00" />
//       </div>
//       <div className="space-y-2">
//         <Label>Category</Label>
//         <Select value={category} onValueChange={setCategory}>
//           <SelectTrigger className="bg-background">
//             <SelectValue placeholder="Category" />
//           </SelectTrigger>
//           <SelectContent className="z-50 bg-popover">
//             {categories.map(c => <SelectItem key={c} value={c}>
//                 {c}
//               </SelectItem>)}
//           </SelectContent>
//         </Select>
//       </div>
//       <div className="space-y-2">
//         <Label>Image URL (optional)</Label>
//         <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="/path/or/url" />
//       </div>

//       <div className="flex gap-2">
//         <Button className="flex-1" disabled={!canCreate} onClick={() => onCreate({
//         name: name.trim(),
//         price: Number(price),
//         category: (category || "Other").trim() || "Other",
//         imageUrl: imageUrl.trim() || undefined
//       })}>
//           CREATE PRODUCT
//         </Button>
//         <Button type="button" variant="secondary" onClick={() => {
//         setName("");
//         setPrice("");
//         setImageUrl("");
//       }}>
//           RESET
//         </Button>
//       </div>
//     </div>;
// }
// function StockManagerList({
//   products,
//   onToggle
// }: {
//   products: {
//     id: number;
//     name: string;
//     outOfStock?: boolean;
//   }[];
//   onToggle: (id: number) => void;
// }) {
//   const [q, setQ] = React.useState("");
//   const list = React.useMemo(() => {
//     const needle = q.trim().toLowerCase();
//     if (!needle) return products;
//     return products.filter(p => p.name.toLowerCase().includes(needle) || String(p.id).includes(needle));
//   }, [products, q]);
//   return <div className="space-y-3">
//       <div className="relative">
//         <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
//         <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products..." className="pl-9" />
//       </div>

//       <div className="max-h-[50vh] space-y-2 overflow-auto pr-1">
//         {list.map(p => <button key={p.id} type="button" onClick={() => onToggle(p.id)} className="flex w-full items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-left transition-colors hover:bg-muted/50">
//             <div className="min-w-0">
//               <div className="truncate font-medium">{p.name}</div>
//               <div className="text-xs text-muted-foreground">ID {p.id}</div>
//             </div>
//             <Badge variant={p.outOfStock ? "muted" : "success"}>{p.outOfStock ? "OUT OF STOCK" : "IN STOCK"}</Badge>
//           </button>)}
//         {list.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No matches.</div>}
//       </div>
//     </div>;
// }
// function EditProductModal({
//   product,
//   meta,
//   categories,
//   onSave,
//   onDelete,
//   onCancel,
//   onChangeImage
// }: {
//   product: {
//     id: number;
//     name: string;
//     price: number;
//     category: string;
//     imageUrl?: string;
//     outOfStock?: boolean;
//   };
//   meta?: ProductMetaMap[number];
//   categories: string[];
//   onSave: (patch: {
//     name: string;
//     price: number;
//     category: string;
//     outOfStock: boolean;
//   }, meta: ProductMetaMap[number]) => void;
//   onDelete: () => void;
//   onCancel: () => void;
//   onChangeImage: (file: File) => Promise<void>;
// }) {
//   const [name, setName] = React.useState(product.name);
//   const [price, setPrice] = React.useState(String(product.price));
//   const [category, setCategory] = React.useState(product.category || "Other");
//   const [outOfStock, setOutOfStock] = React.useState(Boolean(product.outOfStock));
//   const [description, setDescription] = React.useState(meta?.description ?? "");
//   const [discountEnabled, setDiscountEnabled] = React.useState(Boolean(meta?.discount?.enabled));
//   const [discountPercent, setDiscountPercent] = React.useState<number>(meta?.discount?.percent ?? 10);
//   const [validTill, setValidTill] = React.useState(meta?.discount?.validTill ?? toTimeHHMM(new Date()));
//   const [specialEnabled, setSpecialEnabled] = React.useState(Boolean(meta?.special?.enabled));
//   const [template, setTemplate] = React.useState<SpecialTemplate>(meta?.special?.template as SpecialTemplate ?? 1);
//   const fileInputRef = React.useRef<HTMLInputElement | null>(null);
//   const numericPrice = Number(price);
//   const canSave = name.trim().length > 0 && !Number.isNaN(numericPrice) && numericPrice > 0;
//   const finalPrice = discountEnabled ? calcDiscountedPrice(numericPrice || 0, discountPercent) : null;
//   return <div>
//       <DialogHeader>
//         <DialogTitle>EDIT PRODUCT</DialogTitle>
//         <DialogDescription>Update details, discount UI, and specials.</DialogDescription>
//       </DialogHeader>

//       <div className="mt-3 space-y-5">
//         {/* Image */}
//         <div className="space-y-2">
//           <div className="h-[300px] w-full overflow-hidden rounded-xl border bg-muted">
//             {product.imageUrl ? <img src={product.imageUrl} alt={`${product.name} photo`} className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full w-full place-items-center text-sm text-muted-foreground">No image</div>}
//           </div>
//           <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async e => {
//           const file = e.target.files?.[0];
//           if (!file) return;
//           await onChangeImage(file);
//           e.target.value = "";
//         }} />
//           <Button type="button" variant="hero" size="sm" onClick={() => fileInputRef.current?.click()}>
//             Change Image
//           </Button>
//         </div>

//         <div className="space-y-2">
//           <Label>Product Name</Label>
//           <Input value={name} onChange={e => setName(e.target.value)} placeholder="Enter product name" />
//         </div>

//         <div className="space-y-2">
//           <Label>Price</Label>
//           <Input value={price} onChange={e => setPrice(e.target.value)} inputMode="decimal" placeholder="0.00" />
//         </div>

//         <Separator />

//         <div className="space-y-3">
//           <div className="flex items-center justify-between gap-3">
//             <div className="font-semibold">DISCOUNT SETTINGS</div>
//             <div className="flex items-center gap-2">
//               <Label className="text-sm">Apply Discount</Label>
//               <Switch checked={discountEnabled} onCheckedChange={setDiscountEnabled} />
//             </div>
//           </div>

//           {discountEnabled && <div className="grid gap-3 rounded-lg border bg-muted/30 p-3">
//               <div className="grid gap-3 sm:grid-cols-2">
//                 <div className="space-y-2">
//                   <Label>Discount %</Label>
//                   <Input value={String(discountPercent)} onChange={e => setDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} inputMode="numeric" />
//                 </div>
//                 <div className="space-y-2">
//                   <Label>Valid Till</Label>
//                   <Input value={validTill} onChange={e => setValidTill(e.target.value)} placeholder="HH:MM" />
//                 </div>
//               </div>
//               <div className="text-sm">
//                 <span className="text-muted-foreground">Final Price:</span>{" "}
//                 <span className="font-semibold">{formatINR(finalPrice ?? 0)}</span>
//               </div>
//             </div>}
//         </div>

//         <div className="space-y-2">
//           <Label>Category</Label>
//           <Select value={category} onValueChange={setCategory}>
//             <SelectTrigger className="bg-background">
//               <SelectValue placeholder="Category" />
//             </SelectTrigger>
//             <SelectContent className="z-50 bg-popover">
//               {categories.map(c => <SelectItem key={c} value={c}>
//                   {c}
//                 </SelectItem>)}
//             </SelectContent>
//           </Select>
//         </div>

//         <div className="space-y-2">
//           <Label>Description (Optional)</Label>
//           <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 500))} rows={4} placeholder="Enter product description..." className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring" />
//           <div className="text-xs text-muted-foreground">{description.length}/500</div>
//         </div>

//         <Separator />

//         <div className="space-y-3">
//           <div className="flex items-center justify-between gap-3">
//             <div className="font-semibold">TODAY'S SPECIAL</div>
//             <div className="flex items-center gap-2">
//               <Label className="text-sm">Mark as Today’s Special</Label>
//               <Switch checked={specialEnabled} onCheckedChange={setSpecialEnabled} />
//             </div>
//           </div>

//           {specialEnabled && <div className="grid gap-2 rounded-lg border bg-accent/10 p-3">
//               <Label className="text-sm">Template Options</Label>
//               <div className="grid gap-2">
//                 {[1, 2, 3].map(t => <label key={t} className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2">
//                     <input type="radio" checked={template === t} onChange={() => setTemplate(t as SpecialTemplate)} name={`template-${product.id}`} />
//                     <span className="text-sm">
//                       {t === 1 ? "Template 1 (Normal Display)" : t === 2 ? "Template 2 (Limited Time Alert)" : "Template 3 (Premium/VIP)"}
//                     </span>
//                   </label>)}
//               </div>
//             </div>}
//         </div>

//         <Separator />

//         <div className="flex items-center justify-between">
//           <Label className="font-semibold">Status</Label>
//           <div className="flex items-center gap-2">
//             <Switch checked={!outOfStock} onCheckedChange={v => setOutOfStock(!v)} />
//             <span className="text-sm">{outOfStock ? "Out of Stock" : "In Stock"}</span>
//           </div>
//         </div>
//       </div>

//       <DialogFooter className="mt-6">
//         <Button disabled={!canSave} onClick={() => onSave({
//         name: name.trim(),
//         price: Number(price),
//         category: (category || "Other").trim() || "Other",
//         outOfStock
//       }, {
//         description: description.trim() || undefined,
//         discount: {
//           enabled: discountEnabled,
//           percent: Math.max(0, Math.min(100, discountPercent || 0)),
//           validTill: discountEnabled ? validTill : undefined
//         },
//         special: {
//           enabled: specialEnabled,
//           template
//         }
//       })}>
//           SAVE CHANGES
//         </Button>

//         <AlertDialog>
//           <AlertDialogTrigger asChild>
//             <Button type="button" variant="destructive">DELETE PRODUCT</Button>
//           </AlertDialogTrigger>
//           <AlertDialogContent>
//             <AlertDialogHeader>
//               <AlertDialogTitle>Delete this product?</AlertDialogTitle>
//               <AlertDialogDescription>This will remove it from the Products table immediately.</AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//               <AlertDialogCancel>Cancel</AlertDialogCancel>
//               <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={onDelete}>
//                 Delete
//               </AlertDialogAction>
//             </AlertDialogFooter>
//           </AlertDialogContent>
//         </AlertDialog>

//         <Button variant="secondary" onClick={onCancel}>
//           CANCEL
//         </Button>
//       </DialogFooter>
//     </div>;
// }