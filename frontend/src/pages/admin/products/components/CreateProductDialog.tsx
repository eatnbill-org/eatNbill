import { useState } from 'react';
import { useProductsStore } from '@/stores/products';
import { useCategoriesStore } from '@/stores/categories';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Loader2, Tag, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateProductDialog({ open, onOpenChange }: CreateProductDialogProps) {
  const { createProduct, uploadProductImage, loading, uploadingImage } = useProductsStore();
  const { categories } = useCategoriesStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isVeg, setIsVeg] = useState<boolean | null>(null);
  const [preparationTime, setPreparationTime] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newProduct = await createProduct({
      name,
      description: description || undefined,
      price: parseFloat(price),
      costPrice: costPrice ? parseFloat(costPrice) : undefined,
      categoryId: categoryId || undefined,

      isAvailable: isAvailable,
      isVeg: isVeg,
      preparationTimeMinutes: preparationTime ? parseInt(preparationTime) : undefined,
      discount_percent: discountPercent ? parseFloat(discountPercent) : 0,
    });

    if (newProduct && imageFile) {
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64String = reader.result as string;
          // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64Content = base64String.split(',')[1];

          await uploadProductImage(newProduct.id, {
            file_base64: base64Content,
            content_type: imageFile.type as 'image/jpeg' | 'image/png' | 'image/webp',
            sort_order: 0,
          });

          resetForm();
          onOpenChange(false);
        };
        reader.readAsDataURL(imageFile);
      } catch (error) {
        console.error('Failed to upload image:', error);
        // Still close dialog as product was created
        resetForm();
        onOpenChange(false);
      }
    } else if (newProduct) {
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setCostPrice('');
    setCategoryId('');
    setIsAvailable(true);
    setIsVeg(null);
    setPreparationTime('');
    setDiscountPercent('0');
    setImageFile(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setImageFile(file);
      } else {
        alert('Please select a valid image (JPEG, PNG, WEBP)');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-none rounded-[2.5rem] shadow-2xl bg-white">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
          <div className="p-8 pb-4 bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center gap-4 mb-2">
              <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight uppercase">New Catalog Entry</DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-400">
                  Introduce a new culinary masterpiece to your active menu.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-6 no-scrollbar">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Product Designation *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Royal Truffle Burger"
                  className="h-12 rounded-2xl border-slate-100 focus-visible:ring-indigo-500 shadow-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Taxonomy Segment</Label>
                <div className="relative group">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
                  <select
                    id="category"
                    className="w-full h-12 pl-11 pr-10 border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest bg-white focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm appearance-none cursor-pointer hover:border-indigo-100 transition-all text-slate-600"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">UNCATEGORIZED</option>
                    {categories
                      .filter((c) => c.is_active)
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name.toUpperCase()}
                        </option>
                      ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="h-5 w-5 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                      <Sparkles className="h-3 w-3 text-slate-400 group-hover:text-indigo-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Market Valuation (₹) *</Label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 group-focus-within:text-indigo-500">₹</span>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="299.00"
                    className="h-12 pl-9 rounded-2xl border-slate-100 focus-visible:ring-indigo-500 shadow-sm font-black italic"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="costPrice" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Operational Cost (₹)</Label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 group-focus-within:text-indigo-500">₹</span>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="150.00"
                    className="h-12 pl-9 rounded-2xl border-slate-100 focus-visible:ring-indigo-500 shadow-sm font-black italic text-slate-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Culinary Narrative</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Compose a compelling description of the flavors and ingredients..."
                className="rounded-2xl border-slate-100 focus-visible:ring-indigo-500 shadow-sm min-h-[100px] resize-none"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="image" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Visual Asset</Label>
                <div className="relative">
                  <Input
                    id="image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="h-12 pt-2.5 rounded-2xl border-slate-100 focus-visible:ring-indigo-500 shadow-sm cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 transition-all"
                  />
                </div>
                {imageFile && (
                  <p className="text-[10px] font-bold text-emerald-500 mt-1 uppercase tracking-widest">
                    Ready to transmit: {imageFile.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="prep-time" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Processing Period (Min)</Label>
                <Input
                  id="prep-time"
                  type="number"
                  value={preparationTime}
                  onChange={(e) => setPreparationTime(e.target.value)}
                  placeholder="15"
                  className="h-12 rounded-2xl border-slate-100 focus-visible:ring-indigo-500 shadow-sm"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="discount" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Promotional Yield (%)</Label>
                <div className="relative group">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400 group-focus-within:text-indigo-500">%</span>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    placeholder="0"
                    className="h-12 pr-9 rounded-2xl border-slate-100 focus-visible:ring-indigo-500 shadow-sm font-black italic"
                  />
                </div>
              </div>

              <div className="flex flex-col justify-end">
                <div className="flex items-center justify-between h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Label htmlFor="is-available" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Status</Label>
                  <Switch
                    id="is-available"
                    checked={isAvailable}
                    onCheckedChange={setIsAvailable}
                    className="data-[state=checked]:bg-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Dietary Classification</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsVeg(true)}
                  className={cn(
                    "flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all",
                    isVeg === true
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm shadow-emerald-50"
                      : "border-slate-100 text-slate-400 hover:bg-slate-50"
                  )}
                >
                  <div className={cn("w-2 h-2 rounded-full mr-2", isVeg === true ? "bg-emerald-500" : "bg-slate-300")} />
                  Veg Output
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsVeg(false)}
                  className={cn(
                    "flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all",
                    isVeg === false
                      ? "bg-rose-50 border-rose-200 text-rose-600 shadow-sm shadow-rose-50"
                      : "border-slate-100 text-slate-400 hover:bg-slate-50"
                  )}
                >
                  <div className={cn("w-2 h-2 rounded-full mr-2", isVeg === false ? "bg-rose-500" : "bg-slate-300")} />
                  Non-Veg Output
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsVeg(null)}
                  className={cn(
                    "flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all",
                    isVeg === null
                      ? "bg-slate-100 border-slate-200 text-slate-600"
                      : "border-slate-100 text-slate-400 hover:bg-slate-50"
                  )}
                >
                  Universal
                </Button>
              </div>
            </div>
          </div>

          <div className="p-8 pt-4 bg-slate-50/50 border-t border-slate-100">
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest text-[11px] text-slate-400 border-slate-200 hover:bg-white transition-all shadow-sm"
              >
                Cancel Protocol
              </Button>
              <Button
                type="submit"
                disabled={loading || uploadingImage || !name.trim() || !price}
                className="flex-1 h-12 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-slate-200 transition-all"
              >
                {loading || uploadingImage ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing...
                  </span>
                ) : (
                  'Confirm Final Entry'
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
