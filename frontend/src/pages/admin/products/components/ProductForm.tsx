import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductFormProps {
  categories: string[];
  onSubmit: (data: { name: string; price: number; costPrice: number; category: string; imageUrl?: string; isVeg: boolean }) => void;
  onCancel: () => void;
}

export function ProductForm({ categories, onSubmit, onCancel }: ProductFormProps) {
  const [name, setName] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [costPrice, setCostPrice] = React.useState("");
  const [category, setCategory] = React.useState(categories[0] || "Other");
  const [imageUrl, setImageUrl] = React.useState("");
  const [isVeg, setIsVeg] = React.useState(true); // Default to Veg
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isValid = name.trim().length > 0 && !Number.isNaN(Number(price)) && Number(price) > 0;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-5 mt-4 max-h-[80vh] overflow-y-auto px-1"> {/* Reduced height & scroll */}

      {/* Image Preview & Upload */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-32 w-32 rounded-lg border-2 border-dashed bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:bg-muted/80 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <div className="text-center p-2">
              <span className="text-xs text-muted-foreground block">Tap to upload</span>
            </div>
          )}
        </div>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleImageUpload}
        />
      </div>

      <div className="space-y-2">
        <Label>Product Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken Wrap" />
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
          <Label>Selling Price (₹)</Label>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="0.00" />
        </div>
        <div className="space-y-2">
          <Label className="text-orange-600 font-medium">Making Cost (₹)</Label>
          <Input
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            type="number"
            placeholder="0.00"
            className="border-orange-200 focus-visible:ring-orange-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Image URL (Optional)</Label>
        <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
      </div>

      <div className="flex gap-3 pt-4 sticky bottom-0 bg-background py-2">
        <Button className="flex-1" disabled={!isValid} onClick={() => onSubmit({
          name: name.trim(),
          price: Number(price),
          costPrice: Number(costPrice) || 0,
          category,
          imageUrl: imageUrl.trim() || undefined,
          isVeg
        })}>
          CREATE PRODUCT
        </Button>
        <Button variant="secondary" onClick={onCancel}>RESET</Button>
      </div>
    </div>
  );
}