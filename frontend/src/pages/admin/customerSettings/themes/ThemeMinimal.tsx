import * as React from "react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import type { PublicCategory, PublicProduct, PublicMenuSettings } from "@/types/product";

interface ThemeProps {
  settings: PublicMenuSettings | null;
  products: PublicProduct[];
  categories: PublicCategory[];
  restaurantName: string;
}

export function ThemeMinimal({ products, categories, restaurantName }: ThemeProps) {
  const categoryMap = React.useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  return (
    <div className="min-h-screen bg-white text-black p-6 pb-24 font-sans">
      <header className="mb-10 pt-4">
        <h1 className="text-3xl font-light tracking-tighter">{restaurantName}</h1>
        <p className="text-sm text-gray-400 uppercase tracking-widest mt-1">Menu</p>
      </header>

      <div className="space-y-8">
        {products.map((p) => (
          <div key={p.id} className="flex justify-between items-end group">
            <div className="flex-1 pr-4">
              <h3 className="text-lg font-medium group-hover:text-gray-600 transition-colors">{p.name}</h3>
              <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                Fresh {(categoryMap.get(p.category_id) || 'Chef special').toLowerCase()} made to order.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="font-mono text-sm">{formatINR(p.price)}</span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs rounded-full border-black hover:bg-black hover:text-white"
              >
                ADD
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
