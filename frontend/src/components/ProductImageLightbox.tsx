import * as React from "react";
import type { Product } from "@/types/demo";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  startIndex: number;
};

export default function ProductImageLightbox({ open, onOpenChange, products, startIndex }: Props) {
  const [api, setApi] = React.useState<CarouselApi | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (!api) return;
    // Ensure we land on the clicked product when opening.
    api.scrollTo(startIndex, true);
  }, [open, api, startIndex]);

  React.useEffect(() => {
    if (!open) return;
    if (!api) return;

    const id = window.setInterval(() => {
      // loop is not enabled, so we wrap manually.
      const current = api.selectedScrollSnap();
      const next = current + 1;
      api.scrollTo(next >= products.length ? 0 : next);
    }, 3200);

    return () => window.clearInterval(id);
  }, [open, api, products.length]);

  const currentIndex = api?.selectedScrollSnap() ?? startIndex;
  const active = products[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none border-0 bg-background/95 p-0 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:rounded-2xl">
        <div className="grid min-h-[70vh] grid-rows-[auto_1fr]">
          <DialogHeader className="px-4 pb-2 pt-4 sm:px-6">
            <DialogTitle className="truncate">{active?.name ?? "Photo"}</DialogTitle>
            <DialogDescription className="truncate">Swipe or wait — slideshow plays automatically.</DialogDescription>
          </DialogHeader>

          <div className="relative px-4 pb-5 sm:px-6">
            <Carousel
              setApi={(a) => setApi(a)}
              opts={{ align: "center", containScroll: "trimSnaps" }}
              className="mx-auto"
            >
              <CarouselContent className="-ml-3">
                {products.map((p) => (
                  <CarouselItem key={p.id} className="pl-3">
                    <div className="mx-auto grid max-w-[820px] place-items-center">
                      <div className="w-full overflow-hidden rounded-2xl border bg-card shadow-elev-2">
                        <div className="aspect-square w-full sm:aspect-[4/3]">
                          <img
                            src={p.imageUrl}
                            alt={`${p.name} product photo`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2 sm:-left-10" />
              <CarouselNext className="right-2 sm:-right-10" />
            </Carousel>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
