import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import { useDemoStore } from "@/store/demo-store";
import { Plus } from "lucide-react";
import type { Product } from "@/types/demo";

interface ProductDetailProps {
  product: Product | null;
  onClose: () => void;
}

export function ProductDetail({ product, onClose }: ProductDetailProps) {
  const { dispatch } = useDemoStore();

  if (!product) return null;

  return (
    <Dialog open={Boolean(product)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-white">
        <div className="relative h-64 bg-gray-100">
          {product.imageUrl ? (
            <img src={product.imageUrl} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
          )}
          <Button variant="ghost" className="absolute top-2 right-2 bg-white/50 hover:bg-white rounded-full p-2 h-auto" onClick={onClose}>✕</Button>
        </div>
        
        <div className="p-5">
          <div className="flex justify-between items-start mb-2">
            <div>
                <h2 className="text-xl font-bold">{product.name}</h2>
                <p className="text-sm text-gray-500">{product.category}</p>
            </div>
            <span className="text-lg font-bold text-emerald-600">{formatINR(product.price)}</span>
          </div>
          
          <p className="text-sm text-gray-600 leading-relaxed mb-6">
            A delicious choice from our {product.category} menu. Freshly prepared with premium ingredients.
          </p>

          <Button 
            className="w-full h-11 font-bold" 
            onClick={() => {
                dispatch({ type: "CART_ADD", productId: product.id });
                onClose();
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add to Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
