// import * as React from "react";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Dialog, DialogContent } from "@/components/ui/dialog";
// import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
// import { toast } from "@/hooks/use-toast";
// import { useDemoStore } from "@/store/demo-store";
// import { formatINR } from "@/lib/format";
// import { Plus, Search, Tag, X, Edit2, Trash2, TrendingUp } from "lucide-react";
// import { Switch } from "@/components/ui/switch";
// import { useLocalStorageState } from "@/hooks/use-local-storage-state";
// import type { ProductMetaMap } from "@/pages/admin/products/productMeta";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";


// // Components
// import { ProductForm } from "./components/ProductForm";
// import { EditProductModal } from "./components/EditProductModal";

// const DEFAULT_CATEGORIES = ["All Categories", "Bowls", "Burgers", "Wraps", "Sandwiches", "Snacks", "Drinks", "Other"];
// const META_STORAGE_KEY = "arabian-nights:products:meta:v1";

// function categoryOf(p: { category?: string }) {
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
//   const { state, dispatch } = useDemoStore();
//   const [metaById, setMetaById] = useLocalStorageState<ProductMetaMap>(META_STORAGE_KEY, {});
//   const [query, setQuery] = React.useState("");
//   const [category, setCategory] = React.useState("All Categories");
//   const [addOpen, setAddOpen] = React.useState(false);
//   const [selectedId, setSelectedId] = React.useState<number | null>(null);
//   const [deleteId, setDeleteId] = React.useState<number | null>(null);
//   const [showProfit, setShowProfit] = React.useState(false);

//   // --- 🔥 Calculated Stats ---
//   // (Kept for compatibility, though seemingly unused in new table design directly, good to have)
//   const specialityCounts = React.useMemo(() => {
//     const counts: Record<string, number> = {
//       todays_special: 0,
//       bogo: 0,
//       discount_50: 0,
//       custom: 0
//     };
//     Object.values(metaById).forEach(meta => {
//       if (meta?.special?.enabled && meta.special.template) {
//         const t = meta.special.template;
//         counts[t] = (counts[t] || 0) + 1;
//       }
//     });
//     return counts;
//   }, [metaById]);

//   const filtered = React.useMemo(() => {
//     const q = query.trim().toLowerCase();
//     return state.products.filter(p => {
//       const matchesQuery = !q || p.name.toLowerCase().includes(q) || String(p.id).includes(q);
//       const matchesCategory = category === "All Categories" || categoryOf(p) === category;
//       return matchesQuery && matchesCategory;
//     });
//   }, [state.products, query, category]);

//   const selectedProduct = state.products.find(p => p.id === selectedId);

//   return (
//     <div className="w-full pb-10 space-y-6 container pt-6">

//       {/* Top Controls */}
//       <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//         <div className="flex flex-1 gap-3 flex-col sm:flex-row">
//           <div className="relative flex-1 sm:max-w-[300px]">
//             <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
//             <Input
//               value={query}
//               onChange={e => setQuery(e.target.value)}
//               placeholder="Search products..."
//               className="pl-9"
//             />
//             {query && (
//               <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded">
//                 <X className="h-4 w-4 text-muted-foreground" />
//               </button>
//             )}
//           </div>

//           <Select value={category} onValueChange={setCategory}>
//             <SelectTrigger className="w-full sm:w-[180px]">
//               <Tag className="mr-2 h-4 w-4" />
//               <SelectValue />
//             </SelectTrigger>
//             <SelectContent>
//               {DEFAULT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
//             </SelectContent>
//           </Select>
//         </div>

//         <div className="flex gap-2 w-full sm:w-auto">
//           {/* Show Profit Toggle Button */}
//           <Button
//             variant={showProfit ? "default" : "outline"}
//             className="flex-1 sm:flex-none"
//             onClick={() => setShowProfit(!showProfit)}
//           >
//             <TrendingUp className="mr-2 h-4 w-4" />
//             {showProfit ? "Hide Profit" : "Show Profit"}
//           </Button>

//           <Button variant="hero" className="flex-1 sm:flex-none" onClick={() => setAddOpen(true)}>
//             <Plus className="mr-2 h-4 w-4" /> Add Product
//           </Button>
//         </div>
//       </div>

//       {/* Product Table */}
//       <Card className="shadow-sm border-t-4 border-t-primary/20">
//         <CardHeader className="pb-2">
//           <CardTitle>Menu Items ({filtered.length})</CardTitle>
//         </CardHeader>
//         <CardContent className="p-0">
//           <div className="w-full overflow-auto">
//             <Table>
//               <TableHeader className="bg-muted/50">
//                 <TableRow>
//                   <TableHead className="w-[80px]">Image</TableHead>
//                   <TableHead>Name</TableHead>
//                   <TableHead>Type</TableHead>
//                   <TableHead>Category</TableHead>
//                   <TableHead>Price</TableHead>
//                   {showProfit && <TableHead className="text-orange-600">Cost</TableHead>}
//                   {showProfit && <TableHead className="text-green-600">Profit</TableHead>}
//                   <TableHead>Status</TableHead>
//                   <TableHead className="text-right">Actions</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {filtered.map(p => {
//                   const cost = p.costPrice || 0;
//                   const profit = p.price - cost;
//                   const meta = metaById[p.id];
//                   const special = Boolean(meta?.special?.enabled);
//                   const isVeg = p.isVeg ?? true; // Default to veg if not set

//                   return (
//                     <TableRow key={p.id} className={`hover:bg-muted/5 ${p.outOfStock ? "opacity-70 bg-gray-50" : ""} ${special ? "bg-yellow-50/30" : ""}`}>
//                       <TableCell className="py-2">
//                         <div className="h-10 w-10 rounded-md bg-muted overflow-hidden border">
//                           {p.imageUrl ? (
//                             <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
//                           ) : (
//                             <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">IMG</div>
//                           )}
//                         </div>
//                       </TableCell>
//                       <TableCell className="font-medium">
//                         {p.name}
//                         {special && <Badge variant="warning" className="ml-2 text-[10px] h-4 px-1">Special</Badge>}
//                       </TableCell>
//                       <TableCell>
//                         <div className="flex items-center gap-2">
//                           <div className={`h-3 w-3 rounded-full border ${isVeg ? "bg-green-500 border-green-600" : "bg-red-500 border-red-600"}`} />
//                           <span className="text-xs text-muted-foreground">{isVeg ? "Veg" : "Non-Veg"}</span>
//                         </div>
//                       </TableCell>
//                       <TableCell>
//                         <Badge variant="outline" className="font-normal">{categoryOf(p)}</Badge>
//                       </TableCell>
//                       <TableCell className="font-semibold">
//                         {formatINR(p.price)}
//                       </TableCell>

//                       {showProfit && (
//                         <TableCell className="text-orange-600">
//                           {cost > 0 ? formatINR(cost) : "-"}
//                         </TableCell>
//                       )}

//                       {showProfit && (
//                         <TableCell className={`font-bold ${profit > 0 ? "text-green-600" : "text-red-500"}`}>
//                           {formatINR(profit)}
//                         </TableCell>
//                       )}

//                       <TableCell>
//                         <div className="flex items-center gap-2">
//                           <Switch
//                             checked={!p.outOfStock}
//                             onCheckedChange={() => dispatch({ type: "TOGGLE_STOCK", productId: p.id })}
//                           />
//                           <span className="text-xs text-muted-foreground w-12">{p.outOfStock ? "Inactive" : "Active"}</span>
//                         </div>
//                       </TableCell>
//                       <TableCell className="text-right">
//                         <div className="flex items-center justify-end gap-2">
//                           <Button
//                             variant="ghost"
//                             size="icon"
//                             className="h-8 w-8 text-muted-foreground hover:text-primary"
//                             onClick={() => setSelectedId(p.id)}
//                           >
//                             <Edit2 className="h-4 w-4" />
//                           </Button>
//                           <Button
//                             variant="ghost"
//                             size="icon"
//                             className="h-8 w-8 text-muted-foreground hover:text-destructive"
//                             onClick={() => setDeleteId(p.id)}
//                           >
//                             <Trash2 className="h-4 w-4" />
//                           </Button>
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   )
//                 })}
//                 {filtered.length === 0 && (
//                   <TableRow>
//                     <TableCell colSpan={showProfit ? 9 : 7} className="h-24 text-center text-muted-foreground">
//                       No products found matching your search.
//                     </TableCell>
//                   </TableRow>
//                 )}
//               </TableBody>
//             </Table>
//           </div>
//         </CardContent>
//       </Card>

//       {/* Add Product Sheet */}
//       <Sheet open={addOpen} onOpenChange={setAddOpen}>
//         <SheetContent className="w-full sm:max-w-md">
//           <SheetHeader>
//             <SheetTitle>ADD NEW PRODUCT</SheetTitle>
//             <SheetDescription>Create a new product for the menu.</SheetDescription>
//           </SheetHeader>

//           <ProductForm
//             categories={DEFAULT_CATEGORIES.filter(c => c !== "All Categories")}
//             onCancel={() => setAddOpen(false)}
//             onSubmit={(data) => {
//               dispatch({ type: "ADD_PRODUCT", payload: data });
//               setAddOpen(false);
//               toast({ title: "Product Added" });
//             }}
//           />
//         </SheetContent>
//       </Sheet>

//       {/* Edit Product Modal */}
//       <Dialog open={Boolean(selectedId)} onOpenChange={(o) => !o && setSelectedId(null)}>
//         <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
//           {selectedProduct && (
//             <EditProductModal
//               product={selectedProduct}
//               meta={metaById[selectedProduct.id]}
//               categories={DEFAULT_CATEGORIES.filter(c => c !== "All Categories")}
//               onCancel={() => setSelectedId(null)}
//               onDelete={() => {
//                 dispatch({ type: "DELETE_PRODUCT", productId: selectedProduct.id });
//                 setMetaById(prev => {
//                   const copy = { ...prev };
//                   delete copy[selectedProduct.id];
//                   return copy;
//                 });
//                 setSelectedId(null);
//                 toast({ title: "Product Deleted" });
//               }}
//               onSave={(patch: any, nextMeta: any) => {
//                 dispatch({ type: "UPDATE_PRODUCT", productId: selectedProduct.id, patch });
//                 setMetaById(prev => ({ ...prev, [selectedProduct.id]: nextMeta }));
//                 setSelectedId(null);
//                 toast({ title: "Product Updated" });
//               }}
//               onChangeImage={async (file: File) => {
//                 const dataUrl = await fileToDataUrl(file);
//                 dispatch({
//                   type: "UPDATE_PRODUCT",
//                   productId: selectedProduct.id,
//                   patch: { imageUrl: dataUrl }
//                 });
//                 toast({ title: "Image updated" });
//               }}
//             />
//           )}
//         </DialogContent>
//       </Dialog>

//       {/* Delete Confirmation Dialog */}
//       <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Are you sure?</AlertDialogTitle>
//             <AlertDialogDescription>
//               This will permanently delete the product "{state.products.find(p => p.id === deleteId)?.name}".
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel>Cancel</AlertDialogCancel>
//             <AlertDialogAction
//               className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
//               onClick={() => {
//                 if (deleteId) {
//                   dispatch({ type: "DELETE_PRODUCT", productId: deleteId });
//                   setMetaById(prev => {
//                     const copy = { ...prev };
//                     delete copy[deleteId];
//                     return copy;
//                   });
//                   toast({ title: "Product Deleted" });
//                   setDeleteId(null);
//                 }
//               }}
//             >
//               Delete
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>

//     </div>
//   );
// }