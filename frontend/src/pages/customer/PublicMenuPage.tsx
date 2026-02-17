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
import { Search, Plus, ChevronLeft, ChevronRight, ShoppingCart, MapPin, Menu as MenuIcon, Phone } from 'lucide-react';
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
    <div className="min-h-screen transition-colors duration-500" style={{ ...themeStyles, fontFamily: 'var(--theme-font), sans-serif', background: 'var(--theme-secondary)', backgroundImage: 'var(--theme-bg-pattern)' }}>

      {/* 1. DYNAMIC HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur-md transition-all duration-300 border-b border-black/5"
        style={{
          backgroundColor: preset.cardStyle === 'glass' ? 'rgba(255,255,255,0.85)' : 'var(--theme-secondary)',
          borderBottomColor: preset.cardStyle === 'bordered' ? 'var(--theme-primary)' : 'transparent'
        }}>
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Search Bar (Expanded) */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" style={{ color: 'var(--theme-primary)' }} />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="pl-10 h-10 border-2 focus:ring-0 transition-all font-medium placeholder:text-current/40 w-full"
                style={{
                  borderRadius: 'var(--theme-radius)',
                  borderColor: preset.cardStyle === 'bordered' ? 'var(--theme-primary)' : 'transparent',
                  backgroundColor: preset.cardStyle === 'glass' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.05)',
                  color: 'var(--theme-primary)'
                }}
              />
              <button className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center transition-transform active:scale-90"
                style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-secondary)' }}>
                <Search className="h-4 w-4" />
              </button>
            </div>

            {/* Cart Button (Icon only on mobile) */}
            <Button
              className="relative h-10 w-10 md:w-auto px-0 md:px-4 overflow-hidden font-bold transition-transform active:scale-95 shadow-lg shrink-0"
              style={{
                backgroundColor: 'var(--theme-primary)',
                color: 'var(--theme-secondary)',
                borderRadius: 'var(--theme-radius)'
              }}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="h-5 w-5 md:mr-2" />
              <span className="hidden md:inline">Cart</span>
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 md:top-0.5 md:right-1 bg-red-500 text-white text-[10px] h-4 w-4 md:h-5 md:w-5 flex items-center justify-center rounded-full border-2 border-white">
                  {totalItems}
                </span>
              )}
            </Button>
          </div>

          {/* Restaurant Info (Compact) */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              <h1 className="text-lg font-black truncate leading-none" style={{ color: 'var(--theme-primary)' }}>{menu.restaurant.name}</h1>
              {tableId && (
                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-current shrink-0" style={{ color: 'var(--theme-accent)', borderColor: 'var(--theme-accent)' }}>
                  Table {tableId}
                </span>
              )}
            </div>
          </div>

          {/* Categories (Scrollable) */}
          <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`transition-all flex flex-col items-center gap-1 shrink-0 ${preset.categoryStyle === 'card' ? 'p-0 bg-transparent border-0' : 'px-4 py-1.5 border-2 mb-1'}`}
                style={preset.categoryStyle === 'pill' ? {
                  borderRadius: 'var(--theme-radius)',
                  backgroundColor: activeCategoryId === cat.id ? 'var(--theme-primary)' : 'transparent',
                  color: activeCategoryId === cat.id ? 'var(--theme-secondary)' : 'var(--theme-primary)',
                  borderColor: activeCategoryId === cat.id ? 'var(--theme-primary)' : 'var(--theme-primary)'
                } : undefined}
              >
                {preset.categoryStyle === 'card' ? (
                  <>
                    <div className={`h-14 w-14 rounded-xl flex items-center justify-center shadow-sm border-2 transition-transform active:scale-95 overflow-hidden relative ${activeCategoryId === cat.id ? 'shadow-md scale-105' : ''}`}
                      style={{
                        backgroundColor: activeCategoryId === cat.id ? 'var(--theme-secondary)' : '#f8f9fa',
                        borderColor: activeCategoryId === cat.id ? 'var(--theme-primary)' : 'transparent',
                        borderWidth: activeCategoryId === cat.id ? '2px' : '1px'
                      }}>
                      {cat.image_url ? (
                        <img src={cat.image_url} alt={cat.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="font-bold text-lg" style={{ color: activeCategoryId === cat.id ? 'var(--theme-primary)' : '#9ca3af' }}>
                          {cat.name.slice(0, 1)}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: activeCategoryId === cat.id ? 'var(--theme-primary)' : '#6b7280' }}>
                      {cat.name}
                    </span>
                  </>
                ) : (
                  cat.name
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 2. OPTIONAL HERO (Streamlined) */}
      {preset.showImages && activeCategoryId === 'all' && !query && (
        <div className="max-w-5xl mx-auto px-3 sm:px-4 mt-6 mb-2">
          <div className="opacity-60 text-xs font-bold uppercase tracking-widest text-center" style={{ color: 'var(--theme-primary)' }}>
            {preset.name}
          </div>
        </div>
      )}

      {/* 3. PRODUCT LAYOUT ENGINE (Mobile Grid Forced) */}
      <main className="max-w-5xl mx-auto px-3 sm:px-4 pb-32">
        <div className="grid gap-x-3 gap-y-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product: PublicProduct) => {
            const qty = getQty(product.id);
            const isOut = !product.is_active;

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={product.id}
                className={`group relative overflow-hidden flex flex-col justify-between transition-all duration-300 ${preset.cardStyle === 'elevated' ? 'hover:-translate-y-1 hover:shadow-xl shadow-sm' : ''
                  }`}
                style={{
                  backgroundColor: preset.cardStyle === 'glass' ? 'rgba(255,255,255,0.6)' :
                    preset.id === 'urban_hiphop' ? '#111' : '#fff',
                  borderRadius: 'var(--theme-radius)',
                  border: preset.cardStyle === 'bordered' || preset.id === 'urban_hiphop' ? '2px solid var(--theme-primary)' : '0px solid rgba(0,0,0,0.05)',
                  borderColor: preset.id === 'urban_hiphop' ? (qty > 0 ? 'var(--theme-accent)' : '#333') : undefined
                }}
              >
                {/* IMAGE (Square Aspect Ratio) */}
                <div className="relative aspect-square bg-gray-100 overflow-hidden w-full">
                  {product.images?.[0]?.public_url ? (
                    <img src={product.images[0].public_url} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[10px] opacity-30 font-bold uppercase tracking-widest text-center px-2" style={{ color: 'var(--theme-primary)' }}>No Image</div>
                  )}

                  {isOut && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="text-white font-black uppercase text-[10px] tracking-widest px-2 py-1 border border-white">Sold Out</span></div>}
                  {/* Qty Badge on Image */}
                  {qty > 0 && (
                    <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white text-black font-bold text-xs flex items-center justify-center shadow-lg">
                      {qty}
                    </div>
                  )}
                </div>

                {/* CONTENT */}
                <div className="p-3 flex flex-col flex-1 gap-2">
                  <div>
                    <div className="flex justify-between items-start gap-1">
                      <h3 className="font-bold text-sm leading-tight line-clamp-2" style={{ color: preset.id === 'urban_hiphop' ? '#fff' : 'var(--theme-primary)' }}>{product.name}</h3>
                    </div>
                    <p className="text-xs font-black mt-1" style={{ color: 'var(--theme-accent)' }}>{formatINR(Number(product.price))}</p>
                  </div>

                  <div className="mt-auto pt-2">
                    {qty === 0 ? (
                      <Button
                        disabled={isOut}
                        onClick={() => addItem(product)}
                        className="w-full font-bold uppercase tracking-wider text-xs h-10 transition-all hover:scale-[1.02] flex items-center justify-between pl-4 pr-1"
                        style={{
                          borderRadius: '9999px',
                          backgroundColor: isOut ? '#ccc' : 'transparent',
                          border: '1px solid',
                          borderColor: isOut ? 'transparent' : 'var(--theme-primary)',
                          color: isOut ? '#fff' : (preset.id === 'urban_hiphop' ? '#fff' : 'var(--theme-primary)')
                        }}
                      >
                        <span>{isOut ? 'Sold Out' : 'Add to Cart'}</span>
                        {!isOut && (
                          <span className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-secondary)' }}>
                            <Plus className="h-4 w-4" />
                          </span>
                        )}
                      </Button>
                    ) : (
                      <div className="flex items-center justify-between p-1 border-2" style={{
                        borderRadius: 'var(--theme-radius)',
                        borderColor: 'var(--theme-primary)',
                        backgroundColor: preset.id === 'urban_hiphop' ? '#000' : 'var(--theme-secondary)'
                      }}>
                        <button onClick={() => updateQuantity(product.id, qty - 1)} className="w-8 h-8 flex items-center justify-center font-bold text-lg hover:bg-black/5 rounded" style={{ color: 'var(--theme-primary)' }}>−</button>
                        <span className="font-black text-lg" style={{ color: 'var(--theme-primary)' }}>{qty}</span>
                        <button onClick={() => updateQuantity(product.id, qty + 1)} className="w-8 h-8 flex items-center justify-center font-bold text-lg hover:bg-black/5 rounded" style={{ color: 'var(--theme-primary)' }}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* 4. FLOATING CART BAR */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            className="fixed bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 z-50 max-w-xl mx-auto"
          >
            <button
              onClick={() => setCartOpen(true)}
              className="w-full p-3 sm:p-4 flex items-center justify-between gap-3 shadow-2xl backdrop-blur-md border border-white/20"
              style={{
                borderRadius: 'var(--theme-radius)',
                backgroundColor: 'var(--theme-primary)',
                color: 'var(--theme-secondary)'
              }}
            >
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <div className="bg-white/20 px-2 sm:px-3 py-1 rounded font-black text-xs sm:text-sm shrink-0">{totalItems} ITEMS</div>
                <div className="text-xs sm:text-sm font-medium opacity-80 truncate">View your order</div>
              </div>
              <div className="font-black text-base sm:text-xl shrink-0">{formatINR(totalPrice)}</div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <PublicCart />
    </div>
  );
}
