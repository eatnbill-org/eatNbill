import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { ChevronLeft, ChevronRight, Plus, Minus, X } from "lucide-react";
import type { Product } from "@/types/demo";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product | null;
    quantity: number;
    onAdd: () => void;
    onDec: () => void;
};

export default function ProductDetailModal({
    open,
    onOpenChange,
    product,
    quantity,
    onAdd,
    onDec,
}: Props) {
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

    // Generate up to 4 images (use main image as base, duplicate if needed for demo)
    const images = React.useMemo(() => {
        if (!product?.imageUrl) return [];
        // For demo: create 4 image slots (in real app, product would have images array)
        return [product.imageUrl, product.imageUrl, product.imageUrl, product.imageUrl];
    }, [product?.imageUrl]);

    React.useEffect(() => {
        setCurrentImageIndex(0);
    }, [product?.id]);

    if (!product) return null;

    const isOutOfStock = Boolean(product.outOfStock);

    const nextImage = () => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl">
                {/* Close Button */}
                <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="absolute right-4 top-4 z-10 h-8 w-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Image Gallery */}
                <div className="relative">
                    <div className="aspect-square w-full overflow-hidden bg-gray-100">
                        {images.length > 0 ? (
                            <img
                                src={images[currentImageIndex]}
                                alt={`${product.name} - Image ${currentImageIndex + 1}`}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center bg-gray-200">
                                <span className="text-gray-400">No image</span>
                            </div>
                        )}
                    </div>

                    {/* Image Navigation Arrows */}
                    {images.length > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={prevImage}
                                className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                                type="button"
                                onClick={nextImage}
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition-colors"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </>
                    )}

                    {/* Image Dots */}
                    {images.length > 1 && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {images.map((_, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setCurrentImageIndex(idx)}
                                    className={`h-2 w-2 rounded-full transition-all ${idx === currentImageIndex
                                            ? "bg-orange-500 w-4"
                                            : "bg-white/70"
                                        }`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Out of Stock Overlay */}
                    {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Badge variant="destructive" className="text-lg py-2 px-4">
                                OUT OF STOCK
                            </Badge>
                        </div>
                    )}
                </div>

                {/* Product Details */}
                <div className="p-5 space-y-4">
                    <div>
                        <div className="flex items-start justify-between gap-3">
                            <DialogHeader className="text-left">
                                <DialogTitle className="text-xl font-bold">{product.name}</DialogTitle>
                            </DialogHeader>
                            <Badge variant="secondary" className="shrink-0">
                                {product.category || "Other"}
                            </Badge>
                        </div>
                        <p className="text-2xl font-bold text-orange-500 mt-2">
                            {formatINR(product.price)}
                        </p>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 leading-relaxed">
                        A delicious {product.name.toLowerCase()} prepared with fresh ingredients and authentic spices.
                        Perfect for any meal of the day.
                    </p>

                    {/* Add to Cart Section */}
                    <div className="pt-2">
                        {quantity === 0 ? (
                            <Button
                                variant="brand"
                                className="w-full h-12 text-base font-semibold rounded-xl bg-orange-500 hover:bg-orange-600"
                                disabled={isOutOfStock}
                                onClick={onAdd}
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                Add to Cart
                            </Button>
                        ) : (
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 border rounded-xl p-1 bg-gray-50">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 rounded-lg"
                                        onClick={onDec}
                                    >
                                        <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="w-10 text-center text-lg font-semibold">{quantity}</span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 rounded-lg"
                                        onClick={onAdd}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-lg font-bold text-orange-500">
                                    {formatINR(product.price * quantity)}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
