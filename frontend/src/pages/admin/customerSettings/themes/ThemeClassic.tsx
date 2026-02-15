import * as React from "react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import type { PublicCategory, PublicProduct, PublicMenuSettings } from "@/types/product";

import { usePublicOrdersStore } from "@/stores/public/publicOrders.store";
import { useToast } from "@/hooks/use-toast";

interface ThemeProps {
  settings: PublicMenuSettings | null;
  products: PublicProduct[];
  categories: PublicCategory[];
  restaurantName: string;
}

export function ThemeClassic({ settings, products, restaurantName }: ThemeProps) {
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

  return (
    <div className="min-h-screen bg-white pb-20">
      <header className="border-b p-4 sticky top-0 bg-white z-10">
        <h1 className="text-xl font-serif font-bold text-center text-emerald-800">{restaurantName}</h1>
      </header>

      <div className="p-4 space-y-4">
        {products.map((product) => (
          <div key={product.id} className="flex gap-4 border-b pb-4">
            <div className="h-24 w-24 bg-gray-100 rounded-lg shrink-0 overflow-hidden">
              {product.images?.[0]?.public_url && (
                <img src={product.images[0].public_url} className="w-full h-full object-cover" alt={product.name} />
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-lg">{product.name}</h3>
              <p className="text-gray-500 text-sm line-clamp-2">{product.description}</p>
              <div className="flex justify-between items-center mt-2">
                <span className="font-bold text-emerald-700">{formatINR(product.price)}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-emerald-600 text-emerald-600 font-bold"
                  onClick={() => handleAdd(product)}
                >
                  ADD
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}