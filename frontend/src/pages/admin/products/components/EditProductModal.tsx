import * as React from "react";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatINR } from "@/lib/format";
import { calcDiscountedPrice, toTimeHHMM } from "@/pages/admin/products/utils";
import type { ProductMetaMap, SpecialTemplateId } from "@/pages/admin/products/productMeta";

// ✅ New Import
import { SpecialitySelector } from "./SpecialitySelector";

export function EditProductModal({
  product,
  meta,
  categories,
  onSave,
  onDelete,
  onCancel,
  onChangeImage
}: {
  product: { id: number; name: string; price: number; costPrice?: number; category: string; imageUrl?: string; outOfStock?: boolean };
  meta?: ProductMetaMap[number];
  categories: string[];
  onSave: (patch: any, meta: any) => void;
  onDelete: () => void;
  onCancel: () => void;
  onChangeImage: (file: File) => Promise<void>;
}) {
  const [name, setName] = React.useState(product.name);
  const [price, setPrice] = React.useState(String(product.price));
  const [costPrice, setCostPrice] = React.useState(String(product.costPrice || ""));
  const [category, setCategory] = React.useState(product.category || "Other");
  const [isVeg, setIsVeg] = React.useState(product.isVeg ?? true);
  const [outOfStock, setOutOfStock] = React.useState(Boolean(product.outOfStock));
  const [description, setDescription] = React.useState(meta?.description ?? "");

  // Discount
  const [discountEnabled, setDiscountEnabled] = React.useState(Boolean(meta?.discount?.enabled));
  const [discountPercent, setDiscountPercent] = React.useState<number>(meta?.discount?.percent ?? 10);
  const [validTill, setValidTill] = React.useState(meta?.discount?.validTill ?? toTimeHHMM(new Date()));

  // ✅ SPECIALITY LOGIC (New)
  const [specialEnabled, setSpecialEnabled] = React.useState(Boolean(meta?.special?.enabled));
  const [template, setTemplate] = React.useState<SpecialTemplateId>((meta?.special?.template as SpecialTemplateId) ?? 'todays_special');
  const [customImage, setCustomImage] = React.useState<string | undefined>(meta?.special?.customImage);

  // MOCK Usage Counts (In real app, calculate this from 'state.products' in parent and pass as prop)
  // Example: How many products already use 'bogo'?
  const mockUsageCounts = {
    todays_special: 3, // Example: 3 used
    bogo: 1,
    discount_50: 4, // Example: Full (Limit reached)
    custom: 0
  };

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const numericPrice = Number(price);
  const canSave = name.trim().length > 0 && !Number.isNaN(numericPrice) && numericPrice > 0;
  const finalPrice = discountEnabled ? calcDiscountedPrice(numericPrice || 0, discountPercent) : null;

  return (
    <div className="overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden">
      <DialogHeader>
        <DialogTitle>Edit Product</DialogTitle>
        <DialogDescription>Update details, pricing, and active offers.</DialogDescription>
      </DialogHeader>

      <div className="mt-3 space-y-5 max-h-[70vh]">

        {/* Image & Basic Info (Same as before) */}
        <div className="space-y-2">
          <div className="h-[200px] w-full overflow-hidden rounded-xl border bg-muted relative group">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={`${product.name} photo`} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="grid h-full w-full place-items-center text-sm text-muted-foreground">No image</div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>Change Image</Button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              await onChangeImage(file);
              e.target.value = "";
            }}
          />
        </div>

        <div className="space-y-2">
          <Label>Product Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="flex items-center justify-between border p-3 rounded-lg">
          <Label>Type</Label>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isVeg ? "font-bold text-green-600" : "text-muted-foreground"}`}>Veg</span>
            <Switch checked={!isVeg} onCheckedChange={(checked) => setIsVeg(!checked)} className="data-[state=checked]:bg-red-500" />
            <span className={`text-sm ${!isVeg ? "font-bold text-red-600" : "text-muted-foreground"}`}>Non-Veg</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Selling Price</Label>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
          </div>
          <div className="space-y-2">
            <Label className="text-orange-600">Making Cost</Label>
            <Input
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              inputMode="decimal"
              className="border-orange-200"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Describe the dish..."
          />
        </div>

        <Separator />

        {/* Discount Logic */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold text-sm">STANDARD DISCOUNT</div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Enable</Label>
              <Switch checked={discountEnabled} onCheckedChange={setDiscountEnabled} />
            </div>
          </div>

          {discountEnabled && (
            <div className="grid gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Discount %</Label>
                  <Input
                    value={String(discountPercent)}
                    onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valid Till</Label>
                  <Input value={validTill} onChange={(e) => setValidTill(e.target.value)} placeholder="HH:MM" />
                </div>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Price after discount: </span>
                <span className="font-semibold">{formatINR(finalPrice ?? 0)}</span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* ✅ NEW SPECIALITY SELECTOR COMPONENT */}
        <SpecialitySelector
          enabled={specialEnabled}
          setEnabled={setSpecialEnabled}
          selectedTemplate={template}
          setTemplate={setTemplate}
          customImage={customImage}
          setCustomImage={setCustomImage}
          productImage={product.imageUrl}
          usageCounts={mockUsageCounts}
        />

        <Separator />

        {/* Status */}
        <div className="flex items-center justify-between">
          <Label className="font-semibold">Stock Status</Label>
          <div className="flex items-center gap-2">
            <Switch checked={!outOfStock} onCheckedChange={(v) => setOutOfStock(!v)} />
            <span className="text-sm">{outOfStock ? "Out of Stock" : "In Stock"}</span>
          </div>
        </div>
      </div>

      <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" className="w-full sm:w-auto">DELETE</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this product?</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex-1"></div>
        <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">Cancel</Button>
        <Button
          disabled={!canSave}
          className="w-full sm:w-auto"
          onClick={() =>
            onSave(
              {
                name: name.trim(),
                price: Number(price),
                costPrice: Number(costPrice) || 0,
                category: (category || "Other").trim() || "Other",
                outOfStock,
                isVeg,
              },
              {
                description: description.trim() || undefined,
                discount: {
                  enabled: discountEnabled,
                  percent: Math.max(0, Math.min(100, discountPercent || 0)),
                  validTill: discountEnabled ? validTill : undefined,
                },
                special: {
                  enabled: specialEnabled,
                  template,
                  customImage
                },
              }
            )
          }
        >
          SAVE CHANGES
        </Button>
      </DialogFooter>
    </div>
  );
}