import * as React from "react";
import { formatINR } from "@/lib/format";
import { ShoppingBag } from "lucide-react";
import type { PublicCategory, PublicProduct, PublicMenuSettings } from "@/types/product";

interface ThemeProps {
  settings: PublicMenuSettings | null;
  products: PublicProduct[];
  categories: PublicCategory[];
  restaurantName: string;
}

export function ThemeSlider({ products, categories, restaurantName }: ThemeProps) {

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Banner */}
      <div className="h-48 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 flex flex-col justify-end">
        <h1 className="text-3xl font-bold">{restaurantName}</h1>
        <p className="text-purple-100">Swipe to explore</p>
      </div>

      <div className="space-y-8 pt-6">
        {categories.map((category) => {
          const catProducts = products.filter((product) => product.category_id === category.id);
          if (catProducts.length === 0) return null;

            return (
              <div key={category.id}>
                <h2 className="px-6 text-lg font-bold mb-3">{category.name}</h2>
                <div className="flex overflow-x-auto gap-4 px-6 pb-4 snap-x hide-scrollbar">
                  {catProducts.map((product) => (
                    <div key={product.id} className="min-w-[160px] bg-white rounded-xl overflow-hidden shadow-sm snap-start">
                      <div className="h-28 bg-gray-200">
                        {product.images?.[0]?.public_url && (
                          <img src={product.images[0].public_url} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm font-bold">{formatINR(product.price)}</span>
                          <button className="bg-black text-white p-1.5 rounded-full">
                            <ShoppingBag className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
}
