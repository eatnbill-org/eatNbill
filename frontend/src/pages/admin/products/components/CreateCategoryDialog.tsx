import { useState } from 'react';
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
import { Layers, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateCategoryDialog({ open, onOpenChange }: CreateCategoryDialogProps) {
  const { createCategory, creating } = useCategoriesStore();
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let imagePayload = undefined;
    if (selectedImage) {
      const base64 = await toBase64(selectedImage);
      // Remove data:image/type;base64, prefix
      const base64Data = base64.split(',')[1];
      imagePayload = {
        file_base64: base64Data,
        content_type: selectedImage.type,
      };
    }

    await createCategory({
      name,
      isActive,
      image: imagePayload,
    });

    // Reset and close
    setName('');
    setIsActive(true);
    setSelectedImage(null);
    setImagePreview(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-none rounded-[2.5rem] shadow-2xl bg-white">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-8 pb-4 bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center gap-4 mb-2">
              <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight uppercase">New Taxonomy</DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-400">
                  Create a new group to organize your catalog.
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
                Abort
              </Button>
              <Button
                type="submit"
                disabled={creating || !name.trim()}
                className="flex-1 h-12 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-slate-200 transition-all font-mono"
              >
                {creating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deploying...
                  </span>
                ) : (
                  'Deploy Group'
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
