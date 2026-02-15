/**
 * Admin Products & Categories Management Page
 * Real API integration with image upload support
 */

import { useEffect, useState } from 'react';
import { useCategoriesStore } from '@/stores/categories';
import { useProductsStore } from '@/stores/products';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Package, Tag, Pencil, Trash2, Image as ImageIcon, TrendingUp, AlertCircle } from 'lucide-react';
import CreateCategoryDialog from './components/CreateCategoryDialog';
import EditCategoryDialog from './components/EditCategoryDialog';
import CreateProductDialog from './components/CreateProductDialog';
import EditProductDialog from './components/EditProductDialog';
import { apiClient } from '@/lib/api-client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";


export default function AdminProductsPage() {
  const {
    categories,
    loading: categoriesLoading,
    fetchCategories,
    deleteCategory,
    updateCategory,
  } = useCategoriesStore();

  const {
    products,
    loading: productsLoading,
    fetchProducts,
    deleteProduct,
    updateProduct,
    setSelectedCategory,
    selectedCategoryId,
  } = useProductsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [editProductOpen, setEditProductOpen] = useState(false);
  const [selectedCategoryIdForEdit, setSelectedCategoryIdForEdit] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [showProfit, setShowProfit] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const calculateTotalProfit = () => {
    return products.reduce((acc, product) => {
      const cost = product.costprice ? parseFloat(product.costprice) : 0;
      const discount = product.discount_percent ? parseFloat(product.discount_percent) : 0;
      const price = parseFloat(product.price) * (1 - discount / 100);
      return acc + (price - cost);
    }, 0);
  };

  const totalProfit = calculateTotalProfit();

  useEffect(() => {
    // Debug: Check if restaurant ID is set
    const restaurantId = apiClient.getRestaurantId();
    console.log('[Products Page] Restaurant ID:', restaurantId);

    if (!restaurantId) {
      console.error('[Products Page] No restaurant ID found! Please log in again.');
      return;
    }

    fetchCategories();
    fetchProducts();
  }, [fetchCategories, fetchProducts]);

  const handleCategoryFilter = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
  };

  const handleDeleteCategoryClick = (id: string) => {
    setCategoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (categoryToDelete) {
      const success = await deleteCategory(categoryToDelete);
      if (success) {
        toast.success("Category deleted successfully");
      } else {
        toast.error("Failed to delete category");
      }
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const handleStatusChange = async (id: string, currentStatus: boolean) => {
    const success = await updateCategory(id, { isActive: !currentStatus });
    if (success) {
      toast.success(`Category ${!currentStatus ? 'activated' : 'deactivated'}`);
    } else {
      toast.error("Failed to update status");
    }
  };

  const [deleteProductDialogOpen, setDeleteProductDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const handleDeleteProduct = (id: string) => {
    setProductToDelete(id);
    setDeleteProductDialogOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (productToDelete) {
      const success = await deleteProduct(productToDelete);
      if (success) {
        toast.success("Product deleted successfully");
      } else {
        toast.error("Failed to delete product");
      }
      setDeleteProductDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const handleEditCategory = (id: string) => {
    setSelectedCategoryIdForEdit(id);
    setEditCategoryOpen(true);
  };

  const handleEditProduct = (id: string) => {
    setSelectedProductId(id);
    setEditProductOpen(true);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = searchQuery
      ? product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesCategory = selectedCategoryId
      ? product.category_id === selectedCategoryId
      : true;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-full bg-slate-50/50">

      <div className="container py-10 space-y-8 no-scrollbar max-w-7xl mx-auto">
        {/* Main Title Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-3 mb-2 px-1">
              <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                <Package className="w-5 h-5" />
              </div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase tracking-tighter">Inventory Console</h1>
            </div>
            <p className="text-sm font-medium text-slate-400 max-w-lg leading-relaxed px-1">
              Manage your culinary offerings, organize categories, and optimize your menu for maximum conversion and profitability.
            </p>
          </div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active Catalog</span>
              <span className="text-sm font-black text-slate-800 tracking-tighter">
                {products.length} Products / {categories.length} Categories
              </span>
            </div>
            <div className="h-8 w-[1px] bg-slate-100" />
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Live System</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Tabs Control */}
        <Tabs defaultValue="products" className="space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50 h-auto">
              <TabsTrigger
                value="products"
                className="rounded-xl px-6 py-2.5 font-bold uppercase tracking-widest text-[11px] data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
              >
                <Package className="w-4 h-4 mr-2" />
                Products
              </TabsTrigger>
              <TabsTrigger
                value="categories"
                className="rounded-xl px-6 py-2.5 font-bold uppercase tracking-widest text-[11px] data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
              >
                <Tag className="w-4 h-4 mr-2" />
                Categories
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                <Switch
                  id="show-profit"
                  checked={showProfit}
                  onCheckedChange={setShowProfit}
                  className="data-[state=checked]:bg-emerald-500"
                />
                <Label htmlFor="show-profit" className="ml-3 text-[11px] font-black uppercase tracking-widest text-slate-500 cursor-pointer">
                  Profit View
                </Label>
              </div>

              {showProfit && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 shadow-sm flex items-center gap-3"
                >
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-0.5">Potential Yield</span>
                    <span className="text-xs font-black text-emerald-800">{formatINR(totalProfit)}</span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* PRODUCTS TAB */}
          <TabsContent value="products" className="space-y-6 outline-none">
            {/* Search & Filters Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-xl shadow-slate-200/50">
              <div className="relative flex-1 w-full max-w-[460px] group transition-all">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products by name or description..."
                  className="pl-11 h-12 bg-white/80 border-slate-100 rounded-2xl focus-visible:ring-indigo-500 focus-visible:ring-offset-0 shadow-sm transition-all"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative group w-full sm:w-auto">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                  <select
                    className="h-12 pl-11 pr-10 bg-white border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm min-w-[200px] w-full sm:w-auto mt-0 appearance-none cursor-pointer hover:border-indigo-100 transition-all"
                    value={selectedCategoryId || ''}
                    onChange={(e) => handleCategoryFilter(e.target.value || null)}
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="h-5 w-5 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                      <Search className="h-3 w-3 text-slate-400 group-hover:text-indigo-500 rotate-90" />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setCreateProductOpen(true)}
                  className="h-12 px-6 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold uppercase tracking-widest text-[11px] shadow-lg shadow-slate-200 transition-all shrink-0 w-full sm:w-auto"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add New Item
                </Button>
              </div>
            </div>

            {/* Products Table Container */}
            <div className="rounded-[2.5rem] border border-slate-100 bg-white shadow-2xl shadow-slate-200/40 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                    <TableHead className="w-[80px] py-6 pl-8 text-xs font-black uppercase tracking-widest text-slate-400">Image</TableHead>
                    <TableHead className="py-6 text-xs font-black uppercase tracking-widest text-slate-400">Product Identity</TableHead>
                    <TableHead className="py-6 text-xs font-black uppercase tracking-widest text-slate-400">Attribution</TableHead>
                    <TableHead className="py-6 text-xs font-black uppercase tracking-widest text-slate-400">Pricing Model</TableHead>
                    <TableHead className="py-6 text-xs font-black uppercase tracking-widest text-slate-400">Promotion</TableHead>
                    {showProfit && <TableHead className="py-6 text-xs font-black uppercase tracking-widest text-slate-400">Margins</TableHead>}
                    <TableHead className="py-6 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Lifecycle</TableHead>
                    <TableHead className="py-6 pr-8 text-right text-xs font-black uppercase tracking-widest text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productsLoading && products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center space-y-4 opacity-40">
                          <Package className="h-12 w-12 text-slate-300 animate-pulse" />
                          <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Synchronizing Inventory...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center space-y-4 opacity-40">
                          <Search className="h-12 w-12 text-slate-300" />
                          <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">No entries found matching criteria</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {filteredProducts.map((product, index) => {
                        const cost = product.costprice ? parseFloat(product.costprice) : 0;
                        const discount = product.discount_percent ? parseFloat(product.discount_percent) : 0;
                        const originalPrice = parseFloat(product.price);
                        const discountedPrice = originalPrice * (1 - discount / 100);
                        const profit = discountedPrice - cost;

                        return (
                          <motion.tr
                            key={product.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className="group hover:bg-slate-50/80 transition-all border-b border-slate-50 last:border-none"
                          >
                            <TableCell className="py-5 pl-8">
                              <div className="relative h-14 w-14 rounded-2xl bg-slate-100 overflow-hidden border border-slate-100 shadow-sm group-hover:scale-105 transition-transform">
                                {product.images && product.images.length > 0 ? (
                                  <img
                                    src={product.images[0].public_url || ''}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center">
                                    <ImageIcon className="w-5 h-5 text-slate-300" />
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col min-w-0">
                                <span className="font-black text-slate-800 tracking-tight text-base mb-0.5">{product.name}</span>
                                {product.description && (
                                  <span className="text-[10px] font-medium text-slate-400 leading-tight line-clamp-1 max-w-[200px]">
                                    {product.description}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1.5">
                                {product.is_veg !== null && (
                                  <div className={cn(
                                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border w-fit",
                                    product.is_veg
                                      ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                                      : "bg-rose-50 border-rose-100 text-rose-600"
                                  )}>
                                    <div className={cn("h-1.5 w-1.5 rounded-full", product.is_veg ? "bg-emerald-500" : "bg-rose-500")} />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{product.is_veg ? 'Veg' : 'Non-Veg'}</span>
                                  </div>
                                )}
                                <span className="text-[10px] font-bold text-slate-400 ml-0.5 capitalize">
                                  {categories.find(c => c.id === product.category_id)?.name || 'Uncategorized'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                {discount > 0 ? (
                                  <>
                                    <span className="text-sm font-black text-emerald-600 tracking-tighter italic">{formatINR(discountedPrice)}</span>
                                    <span className="text-[10px] text-slate-400 line-through font-mono opacity-60 tracking-tighter">{formatINR(originalPrice)}</span>
                                  </>
                                ) : (
                                  <span className="text-sm font-black text-slate-800 tracking-tighter italic">{formatINR(originalPrice)}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {discount > 0 ? (
                                <div className="inline-flex items-center bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">
                                  <span className="text-[10px] font-black text-orange-600 uppercase tracking-tighter">
                                    -{discount}% YIELD
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">— none —</span>
                              )}
                            </TableCell>
                            {showProfit && (
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Net Margin</span>
                                  <span className={cn(
                                    "text-sm font-black tracking-tighter italic",
                                    profit > 0 ? "text-emerald-600" : "text-rose-500"
                                  )}>
                                    {formatINR(profit)}
                                  </span>
                                </div>
                              </TableCell>
                            )}
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center">
                                <Switch
                                  checked={product.is_active}
                                  onCheckedChange={async (checked) => {
                                    const success = await updateProduct(product.id, { isAvailable: checked });
                                    if (success) {
                                      toast.success(`Product ${checked ? 'Activated' : 'Suspended'}`);
                                    } else {
                                      toast.error("Protocol Error");
                                    }
                                  }}
                                  className="data-[state=checked]:bg-indigo-500"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="pr-8 text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                                  onClick={() => handleEditProduct(product.id)}
                                  title="Refine Specs"
                                >
                                  <Pencil className="w-5 h-5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                  onClick={() => handleDeleteProduct(product.id)}
                                  title="Purge Record"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </Button>
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
          </TabsContent>

          {/* CATEGORIES TAB */}
          <TabsContent value="categories" className="space-y-6 outline-none">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-xl shadow-slate-200/50">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 px-1">Structure Management</span>
                <p className="text-sm font-medium text-slate-500 px-1">
                  Define the logical hierarchy for your products to optimize browsing experience.
                </p>
              </div>
              <Button
                onClick={() => setCreateCategoryOpen(true)}
                className="h-12 px-6 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold uppercase tracking-widest text-[11px] shadow-lg shadow-slate-200 transition-all shrink-0 w-full md:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Structure
              </Button>
            </div>

            <div className="rounded-[2.5rem] border border-slate-100 bg-white shadow-2xl shadow-slate-200/40 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                    <TableHead className="w-[100px] py-6 pl-8 text-xs font-black uppercase tracking-widest text-slate-400">Media</TableHead>
                    <TableHead className="py-6 text-xs font-black uppercase tracking-widest text-slate-400">Category Identity</TableHead>
                    <TableHead className="py-6 text-xs font-black uppercase tracking-widest text-slate-400 text-center">Protocol</TableHead>
                    <TableHead className="py-6 pr-8 text-right text-xs font-black uppercase tracking-widest text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoriesLoading && categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-48 text-center text-slate-400 font-bold uppercase tracking-widest text-xs opacity-40">
                        Syncing structures...
                      </TableCell>
                    </TableRow>
                  ) : categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-48 text-center text-slate-400 font-bold uppercase tracking-widest text-xs opacity-40">
                        Zero structures defined
                      </TableCell>
                    </TableRow>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {categories.map((category, index) => (
                        <motion.tr
                          key={category.id}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.03 }}
                          className="group hover:bg-slate-50/80 transition-all border-b border-slate-50 last:border-none cursor-default"
                        >
                          <TableCell className="py-5 pl-8">
                            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm group-hover:scale-105 transition-transform">
                              {category.image_url ? (
                                <img
                                  src={category.image_url}
                                  alt={category.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Tag className="w-5 h-5 text-slate-300" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-black text-slate-800 tracking-tight text-lg">{category.name}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-3">
                              <Switch
                                checked={category.is_active}
                                onCheckedChange={() => handleStatusChange(category.id, category.is_active)}
                                className="data-[state=checked]:bg-indigo-500"
                              />
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
                                category.is_active ? "text-emerald-500" : "text-slate-400"
                              )}>
                                {category.is_active ? 'Operational' : 'Deactivated'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="pr-8 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                                onClick={() => handleEditCategory(category.id)}
                              >
                                <Pencil className="w-5 h-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                onClick={() => handleDeleteCategoryClick(category.id)}
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="pb-10" />

      {/* Dialogs */}
      <CreateCategoryDialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen} />
      <EditCategoryDialog
        open={editCategoryOpen}
        onOpenChange={setEditCategoryOpen}
        categoryId={selectedCategoryIdForEdit}
      />
      <CreateProductDialog open={createProductOpen} onOpenChange={setCreateProductOpen} />
      <EditProductDialog
        open={editProductOpen}
        onOpenChange={setEditProductOpen}
        productId={selectedProductId}
      />

      {/* Refined Alert Dialogs */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl">
          <div className="p-8 pb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-black text-slate-800 tracking-tight uppercase">Structure Dissolution</AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium text-slate-400 mt-1">
                  You are about to dissolve this category. This action is irreversible.
                </AlertDialogDescription>
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Dependency Check</p>
              <p className="text-xs text-slate-500 leading-relaxed italic">
                The operation will fail if any active products remain linked to this structural node.
              </p>
            </div>
          </div>
          <AlertDialogFooter className="p-6 bg-slate-50 flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="mt-0 flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[11px] text-slate-400 border-slate-200">
              Retain Structure
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCategory} className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[11px] bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-100 border-none">
              Confirm Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteProductDialogOpen} onOpenChange={setDeleteProductDialogOpen}>
        <AlertDialogContent className="max-w-md p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl">
          <div className="p-8 pb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-black text-slate-800 tracking-tight uppercase">Record Termination</AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium text-slate-400 mt-1">
                  You are about to remove this product from the master catalog.
                </AlertDialogDescription>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="p-6 bg-slate-50 flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="mt-0 flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[11px] text-slate-400 border-slate-200">
              Maintain Record
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProduct} className="flex-1 h-12 rounded-xl font-bold uppercase tracking-widest text-[11px] bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-100 border-none">
              Execute Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
