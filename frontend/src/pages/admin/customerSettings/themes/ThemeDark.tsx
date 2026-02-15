import * as React from "react";
import { formatINR } from "@/lib/format";
import { Plus } from "lucide-react";
import type { PublicCategory, PublicProduct, PublicMenuSettings } from "@/types/product";

interface ThemeProps {
  settings: PublicMenuSettings | null;
  products: PublicProduct[];
  categories: PublicCategory[];
  restaurantName: string;
}

export function ThemeDark({ products, categories, restaurantName }: ThemeProps) {
  const categoryMap = React.useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-amber-500">{restaurantName}</h1>
        <p className="text-zinc-400 text-sm">Late Night Cravings?</p>
      </div>

      <div className="px-4 space-y-4">
        {products.map((p) => (
          <div key={p.id} className="flex gap-4 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
            <div className="h-20 w-20 rounded-lg bg-zinc-800 overflow-hidden shrink-0">
              {p.images?.[0]?.public_url && <img src={p.images[0].public_url} className="w-full h-full object-cover opacity-80" />}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-zinc-100">{p.name}</h3>
              <p className="text-xs text-zinc-500">{categoryMap.get(p.category_id) || 'Special'}</p>
              <div className="flex justify-between items-center mt-3">
                <span className="text-amber-500 font-bold">{formatINR(p.price)}</span>
                <button className="bg-amber-500 text-black p-1.5 rounded-lg hover:bg-amber-400">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
