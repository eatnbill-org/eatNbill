import { useEffect, useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Layers, Pencil, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string | null;
}

export default function EditCategoryDialog({
  open,
  onOpenChange,
  categoryId,
}: EditCategoryDialogProps) {
  const { categories, updateCategory, updating } = useCategoriesStore();
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const category = categories.find((c) => c.id === categoryId);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size too large (max 5MB)');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  useEffect(() => {
    if (category) {
      setName(category.name);
      setIsActive(category.is_active);
      setImagePreview(category.image_url || null);
      setSelectedImage(null);
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) return;

    let imagePayload = undefined;
    if (selectedImage) {
      const base64 = await toBase64(selectedImage);
      const base64Data = base64.split(',')[1];
      imagePayload = {
        file_base64: base64Data,
        content_type: selectedImage.type,
      };
    }

    await updateCategory(categoryId, {
      name,
      isActive,
      image: imagePayload,
    });

    onOpenChange(false);
  };

  if (!category) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-none rounded-[2.5rem] shadow-2xl bg-white">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-8 pb-4 bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center gap-4 mb-2">
              <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight uppercase">Update Taxonomy</DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-400">
                  Refining the details of <span className="text-slate-600 font-bold underline decoration-indigo-500 decoration-2 underline-offset-4 font-mono">"{category.name}"</span>
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Category Label *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Signature Pizzas"
                className="h-12 rounded-2xl border-slate-100 focus-visible:ring-indigo-500 shadow-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Cover Asset (Optional)</Label>
              <div className="flex flex-col gap-4">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="h-12 pt-2.5 rounded-2xl border-slate-100 focus-visible:ring-indigo-500 shadow-sm cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 transition-all font-mono"
                />
                {imagePreview && (
                  <div className="relative h-32 w-full rounded-2xl overflow-hidden border border-slate-100 shadow-sm animate-in fade-in zoom-in duration-300">
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between h-14 px-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex flex-col">
                <Label htmlFor="is-active" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Active Status</Label>
                <span className="text-[10px] text-slate-400 font-bold">Visibility across all interfaces</span>
              </div>
              <Switch
                id="is-active"
                checked={isActive}
                onCheckedChange={setIsActive}
                className="data-[state=checked]:bg-indigo-500"
              />
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
                Abort Update
              </Button>
              <Button
                type="submit"
                disabled={updating || !name.trim()}
                className="flex-1 h-12 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-slate-200 transition-all font-mono"
              >
                {updating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Synchronizing...
                  </span>
                ) : (
                  'Commit Changes'
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
