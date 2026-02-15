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

export function ThemeGrid({ products, restaurantName }: ThemeProps) {

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <div className="bg-white p-4 shadow-sm sticky top-0 z-10 text-center">
        <h1 className="font-bold text-xl">{restaurantName}</h1>
      </div>

      <div className="p-4 grid grid-cols-2 gap-4">
        {products.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="aspect-square bg-gray-200 relative">
              {p.images?.[0]?.public_url && <img src={p.images[0].public_url} className="w-full h-full object-cover" />}
              <button className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-md hover:scale-110 transition-transform">
                <Plus className="h-4 w-4 text-black" />
              </button>
            </div>
            <div className="p-3 flex flex-col flex-1">
              <h3 className="font-bold text-sm leading-tight mb-1">{p.name}</h3>
              <div className="mt-auto flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-900">{formatINR(p.price)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
