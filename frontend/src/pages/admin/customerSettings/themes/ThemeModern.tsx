import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { ShoppingBag, Flame } from "lucide-react";
import type { PublicCategory, PublicProduct, PublicMenuSettings } from "@/types/product";
import { usePublicOrdersStore } from "@/stores/public/publicOrders.store";
import { useToast } from "@/hooks/use-toast";

interface ThemeProps {
  settings: PublicMenuSettings | null;
  products: PublicProduct[];
  categories: PublicCategory[];
  restaurantName: string;
}

export function ThemeModern({ settings, products, categories, restaurantName }: ThemeProps) {
  const [activeCategory, setActiveCategory] = React.useState<string>("All");
  const addItem = usePublicOrdersStore((state) => state.addItem);
  const { toast } = useToast();

  const handleAdd = (product: PublicProduct) => {
    addItem(product);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added.`,
      duration: 2000,
    });
  };

  const filteredProducts = React.useMemo(() => {
    if (activeCategory === "All") return products;
    return products.filter((p) => p.category_id === activeCategory);
  }, [products, activeCategory]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero Section */}
      <div className="bg-black text-white p-6 rounded-b-3xl shadow-xl mb-4">
        <h1 className="text-3xl font-bold">{restaurantName}</h1>
        <p className="text-gray-400 text-sm mt-1">Order delicious food instantly.</p>
      </div>

      {/* Category Tabs */}
      <div className="px-4 mb-6 overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 w-max">
          <button
            onClick={() => setActiveCategory("All")}
            className={`flex flex-col items-center gap-2 px-3 py-2 rounded-xl transition-all ${activeCategory === "All"
              ? "bg-orange-50 border border-orange-200"
              : "bg-white border border-gray-100"
              }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-gray-100 text-2xl`}>
              🍽️
            </div>
            <span className={`text-xs font-medium ${activeCategory === "All" ? "text-orange-600" : "text-gray-600"}`}>
              All
            </span>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex flex-col items-center gap-2 px-3 py-2 rounded-xl transition-all ${activeCategory === cat.id
                ? "bg-orange-50 border border-orange-200"
                : "bg-white border border-gray-100"
                }`}
            >
              {cat.image_url ? (
                <img
                  src={cat.image_url}
                  alt={cat.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100 text-lg font-bold text-gray-500">
                  {cat.name.charAt(0)}
                </div>
              )}
              <span className={`text-xs font-medium ${activeCategory === cat.id ? "text-orange-600" : "text-gray-600"}`}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="px-4 grid grid-cols-2 gap-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden border-none shadow-sm bg-white">
            <div className="h-32 bg-gray-100 relative">
              {product.images?.[0]?.public_url ? (
                <img src={product.images[0].public_url} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <ShoppingBag className="w-8 h-8 opacity-20" />
                </div>
              )}
            </div>
            <CardContent className="p-3">
              <h3 className="font-bold text-sm truncate">{product.name}</h3>
              <div className="flex justify-between items-baseline mt-2">
                <div className="flex flex-col">
                  {Number(product.discount_percent || 0) > 0 ? (
                    <>
                      <span className="font-bold text-orange-600">
                        {formatINR(Number(product.price) * (1 - Number(product.discount_percent) / 100))}
                      </span>
                      <span className="text-[10px] text-gray-400 line-through">
                        {formatINR(Number(product.price))}
                      </span>
                    </>
                  ) : (
                    <span className="font-bold">{formatINR(Number(product.price))}</span>
                  )}
                </div>
                <Button
                  size="icon"
                  className="h-8 w-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => handleAdd(product)}
                >
                  <ShoppingBag className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredProducts.length === 0 && (
          <div className="col-span-2 text-center py-10 text-gray-500">
            No products found in this category.
          </div>
        )}
      </div>
    </div>
  );
}