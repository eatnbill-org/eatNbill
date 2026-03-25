/**
 * Public Menu Page
 * Customer-facing menu page at /:slug/menu
 * Uses real backend API instead of demo store
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { apiClient } from '@/lib/api-client';
import type { PublicMenu, PublicProduct } from '@/types/product';
import { Card, CardContent } from '@/components/ui/card';
import { PublicCart } from './components/PublicCart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePublicOrdersStore } from '@/stores/public/publicOrders.store';
import { formatINR } from '@/lib/format';
import { createPortal } from 'react-dom';
import { Search, Plus, Minus, ChevronLeft, ChevronRight, ShoppingCart, MapPin, Menu as MenuIcon, Phone, X, Check } from 'lucide-react';
import { getThemePreset, CustomerThemeName, ThemePreset } from '@/lib/customer-theme-presets';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomerLayoutSkeleton } from '@/components/ui/skeleton';

export default function PublicMenuPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('tableId') || searchParams.get('table') || undefined;
  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const specialsRef = useRef<HTMLDivElement>(null);

  const {
    items,
    addItem,
    updateQuantity,
    setCartOpen,
  } = usePublicOrdersStore();

  // --- THEME ENGINE ---
  const preset: ThemePreset = useMemo(() => {
    return getThemePreset((menu?.theme?.theme_id as CustomerThemeName) || 'vintage_70s');
  }, [menu]);

  // Dynamic Font Loading
  useEffect(() => {
    if (preset.googleFontFamily) {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${preset.googleFontFamily.replace(/ /g, '+')}:wght@400;700;900&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [preset.googleFontFamily]);

  // CSS Variable Injection
  const themeStyles = {
    '--theme-primary': preset.primaryColor,
    '--theme-secondary': preset.secondaryColor,
    '--theme-accent': preset.accentColor,
    '--theme-font': preset.googleFontFamily,
    '--theme-radius': preset.borderRadius === 'none' ? '0px'
      : preset.borderRadius === 'sm' ? '4px'
        : preset.borderRadius === 'md' ? '8px'
          : preset.borderRadius === 'lg' ? '12px'
            : preset.borderRadius === 'xl' ? '24px'
              : '9999px',
    '--theme-bg-pattern': preset.backgroundPattern || 'none',
  } as React.CSSProperties;

  useEffect(() => {
    if (!slug) return;

    const fetchMenu = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get<PublicMenu>(`/public/${slug}/menu`);

        if (response.error) {
          setError(response.error.message);
          return;
        }

        if (response.data) {
          setMenu(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load menu');
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [slug]);

  const categories = useMemo(() => {
    if (!menu) return [{ id: 'all', name: 'All', image_url: null }];
    const base = menu.categories
      .filter((c) => c.name)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({
        id: c.id,
        name: c.name,
        image_url: c.image_url
      }));
    return [{ id: 'all', name: 'All', image_url: null }, ...base];
  }, [menu]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!menu) return [];
    return menu.products.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(q);
      const categoryMatch = activeCategoryId === 'all' || p.category_id === activeCategoryId;
      return nameMatch && categoryMatch;
    });
  }, [menu, query, activeCategoryId]);

  const specials = useMemo(
    () => menu?.products.filter((p) => p.is_active).slice(0, 6) || [],
    [menu]
  );

  const getQty = (productId: string) => {
    const item = items.find((i) => i.product_id === productId);
    return item ? item.quantity : 0;
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + Number(i.product.price) * i.quantity, 0);

  const scrollSpecials = (dir: 'left' | 'right') => {
    if (!specialsRef.current) return;
    const amount = 260;
    specialsRef.current.scrollBy({
      left: dir === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  if (loading) {
    return <CustomerLayoutSkeleton />;
  }

  if (error || !menu) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Menu Not Found</h2>
              <p className="text-muted-foreground mb-4">
                {error || 'The restaurant menu you are looking for does not exist.'}
              </p>
              <p className="text-sm text-muted-foreground">
                Please check the URL and try again.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isGrid = preset.layout === 'grid';
  const isCompact = preset.layout === 'compact';

  return (
    <div className="min-h-screen transition-colors duration-500 bg-gray-100" style={{ ...themeStyles, fontFamily: 'var(--theme-font), sans-serif' }}>

      {/* Success Modal - Center Screen */}
      {createPortal(
        <AnimatePresence>
          {showSuccessNotification && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            >
              {/* Dark Overlay */}
              <div className="absolute inset-0 bg-black/70" />

              {/* Success Card */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative bg-emerald-500 rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center"
              >
                <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-12 w-12 text-emerald-500" strokeWidth={3} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Your order is submitted successfully!</h2>
                <p className="text-emerald-50 text-sm">Your order was too confirm or is submitted successfully!</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 1. DYNAMIC HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur-md transition-all duration-300 border-b border-black/5"
        style={{
          backgroundColor: preset.cardStyle === 'glass' ? 'rgba(255,255,255,0.85)' : 'var(--theme-secondary)',
          borderBottomColor: preset.cardStyle === 'bordered' ? 'var(--theme-primary)' : 'transparent'
        }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          {/* Search Bar - Clean and Simple */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for food..."
              className="pl-12 pr-4 h-12 border-0 focus:ring-2 focus:ring-orange-500 transition-all font-normal placeholder:text-gray-400 w-full shadow-sm"
              style={{
                borderRadius: '12px',
                backgroundColor: '#f5f5f5'
              }}
            />
          </div>



          {/* Categories Section - Transparent White Cards */}
          <div className="mt-3">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className="flex flex-col items-center gap-2 shrink-0 transition-all"
                >
                  <div
                    className={`h-16 w-16 rounded-2xl flex items-center justify-center overflow-hidden transition-all shadow-md ${activeCategoryId === cat.id ? 'ring-2 ring-orange-500' : ''
                      }`}
                    style={{
                      backgroundColor: '#ffffff'
                    }}
                  >
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={cat.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="font-bold text-xl text-orange-500">
                        {cat.name.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-medium ${activeCategoryId === cat.id ? 'text-orange-500' : 'text-gray-600'
                    }`}>
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>



      {/* 3. PRODUCT LAYOUT ENGINE (Mobile Grid Forced) */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 mt-2">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product: PublicProduct) => {
            const qty = getQty(product.id);
            const isOut = !product.is_active;

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={product.id}
                onClick={() => {
                  if (isOut) return;
                  if (qty === 0) {
                    addItem(product);
                  } else {
                    updateQuantity(product.id, qty + 1);
                  }
                }}
                className={`group relative overflow-hidden flex flex-col rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border-2 ${
                  qty > 0 ? 'bg-orange-50/30 border-orange-500 ring-1 ring-orange-500/20' : 'bg-white border-transparent'
                }`}
              >
                {/* IMAGE (Square Aspect Ratio) */}
                <div className="relative aspect-square bg-gray-100 overflow-hidden w-full">
                  {product.images?.[0]?.public_url ? (
                    <img src={product.images[0].public_url} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs opacity-30 font-bold uppercase tracking-widest text-center px-2 text-gray-400">No Image</div>
                  )}

                  {isOut && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="text-white font-black uppercase text-xs tracking-widest px-3 py-1.5 border-2 border-white rounded-lg">Sold Out</span></div>}
                  {/* Qty Badge on Image */}
                  {qty > 0 && (
                    <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-orange-500 text-white font-bold text-xs flex items-center justify-center shadow-lg">
                      {qty}
                    </div>
                  )}
                  {/* Discount Badge */}
                  {product.discount_percent && Number(product.discount_percent) > 0 && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                      {product.discount_percent}% OFF
                    </div>
                  )}
                  {/* Selection Checkmark */}
                  {qty > 0 && (
                    <div className="absolute inset-0 bg-black/5 ring-inset ring-2 ring-orange-500 pointer-events-none transition-all" />
                  )}
                  {qty > 0 && (
                    <div className="absolute top-2 left-2 flex items-center justify-center h-6 w-6 bg-orange-500 rounded-full shadow-lg shadow-orange-500/30 animate-in zoom-in-50 duration-200">
                      <Check className="h-4 w-4 text-white stroke-[3px]" />
                    </div>
                  )}
                </div>

                {/* CONTENT */}
                <div className="p-3 flex flex-col flex-1 gap-2">
                  <div>
                    <h3 className="font-bold text-sm leading-tight line-clamp-2 text-gray-800">{product.name}</h3>
                    <p className="text-sm font-black mt-1 text-orange-500">{formatINR(Number(product.price))}</p>
                  </div>

                  <div className="mt-auto pt-2" onClick={(e) => e.stopPropagation()}>
                    {qty === 0 ? (
                      <Button
                        disabled={isOut}
                        onClick={(e) => {
                          e.stopPropagation();
                          addItem(product);
                        }}
                        className="w-full font-semibold text-sm h-10 transition-all hover:scale-[1.02] rounded-full bg-white border-2 border-orange-500 text-orange-500 hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isOut ? 'Sold Out' : 'Add'}
                      </Button>
                    ) : (
                      <div className="flex items-center justify-between p-1.5 border-2 border-orange-500 rounded-full bg-white">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(product.id, qty - 1);
                          }}
                          className="w-8 h-8 flex items-center justify-center font-bold text-lg hover:bg-orange-50 rounded-full text-orange-500 transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="font-black text-base text-orange-500">{qty}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(product.id, qty + 1);
                          }}
                          className="w-8 h-8 flex items-center justify-center font-bold text-lg hover:bg-orange-50 rounded-full text-orange-500 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>



      {/* 5. FLOATING CART BAR - Redesigned to match Head App */}
      {createPortal(
        <AnimatePresence>
          {totalItems > 0 && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[150] bg-white border-t border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-3 sm:p-4"
            >
              <div className="max-w-5xl mx-auto">
                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-3.5 sm:py-4 px-4 sm:px-6 flex items-center justify-between transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                  style={{ backgroundColor: 'var(--theme-primary, #059669)' }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative">
                      <ShoppingCart className="h-6 w-6" />
                      <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-white text-emerald-600 flex items-center justify-center text-xs font-bold" style={{ color: 'var(--theme-primary, #059669)' }}>
                        {totalItems}
                      </span>
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm sm:text-base font-bold tracking-tight">Verify Your Cart</p>
                      <p className="text-xs sm:text-sm font-medium opacity-80">{totalItems} selected {totalItems > 1 ? 'items' : 'item'}</p>
                    </div>
                  </div>
                  <span className="text-lg sm:text-xl font-black shrink-0">{formatINR(totalPrice)}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <PublicCart onOrderSuccess={() => {
        setShowSuccessNotification(true);
        setTimeout(() => setShowSuccessNotification(false), 5000);
      }} />
    </div>
  );
}
