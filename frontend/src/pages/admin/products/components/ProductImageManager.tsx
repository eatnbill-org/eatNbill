import { useEffect, useState, useRef } from 'react';
import { useProductsStore } from '@/stores/products';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Trash2, Image as ImageIcon, X, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ProductImageManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
}

export default function ProductImageManager({
  open,
  onOpenChange,
  productId,
}: ProductImageManagerProps) {
  const { products, uploadProductImage, deleteProductImage, loading } = useProductsStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const product = products.find((p) => p.id === productId);

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  }, [open]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !productId) return;

    setUploading(true);
    try {
      await uploadProductImage(productId, {
        file_base64: previewUrl?.split(',')[1] || '',
        content_type: selectedFile.type as any,
        sort_order: (product?.images?.length || 0),
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!productId) return;
    if (!confirm('Are you sure you want to delete this visual asset?')) return;

    await deleteProductImage(productId, imageId);
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border-none rounded-[2.5rem] shadow-2xl bg-white">
        <div className="flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-8 pb-4 bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center gap-4 mb-2">
              <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight uppercase">Visual Assets Manager</DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-400">
                  Managing gallery for <span className="text-slate-600 font-bold underline decoration-indigo-500 decoration-2 underline-offset-4 font-mono">"{product.name}"</span>
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
            {/* Upload Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transmit New Asset</h3>
                {selectedFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClearSelection}
                    className="h-7 px-3 text-[9px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    Clear Selection
                  </Button>
                )}
              </div>

              <div className="relative group">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="image-upload"
                />

                {!previewUrl ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="h-48 rounded-[2rem] border-2 border-dashed border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition-all flex flex-col items-center justify-center cursor-pointer group/upload"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover/upload:text-indigo-500 transition-colors mb-4 border border-slate-50">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover/upload:text-slate-600 transition-colors">Initiate Asset Transfer</p>
                    <p className="text-[9px] font-bold text-slate-300 mt-1">MAX DIMENSION: 5.0 MB</p>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                    <Card className="overflow-hidden rounded-[2rem] border-none shadow-xl shadow-indigo-50 relative group/preview">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-64 object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                        <div className="flex items-center justify-between text-white">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Asset Designation</span>
                            <span className="text-xs font-bold truncate max-w-[200px]">{selectedFile?.name}</span>
                          </div>
                          <span className="text-[10px] font-black bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg">
                            {((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                    </Card>
                    <Button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-slate-200 transition-all"
                    >
                      {uploading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Phasing into Database...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Commit Visual Asset
                        </span>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Existing Images */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Transmitted Portfolio ({product.images?.length || 0})
                </h3>
              </div>

              {!product.images || product.images.length === 0 ? (
                <div className="p-12 text-center rounded-[2.5rem] bg-slate-50 border border-dashed border-slate-200">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No visual data currently indexed</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                  {product.images.map((image, index) => (
                    <motion.div
                      key={image.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="group relative overflow-hidden rounded-[2rem] border-none shadow-lg hover:shadow-2xl transition-all duration-300">
                        <div className="relative aspect-square">
                          <img
                            src={image.public_url || ''}
                            alt={`Gallery asset ${index + 1}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-12 w-12 rounded-2xl bg-white text-rose-500 hover:bg-rose-50 hover:text-rose-600 shadow-xl transition-all"
                              onClick={() => handleDeleteImage(image.id)}
                              disabled={loading}
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </div>
                          <div className="absolute top-4 left-4">
                            <span className="text-[9px] font-black bg-white/90 backdrop-blur text-slate-800 px-2.5 py-1 rounded-full shadow-sm uppercase tracking-tighter">
                              Asset #{index + 1}
                            </span>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-8 pt-4 bg-slate-50/50 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[11px] text-slate-400 border-slate-200 hover:bg-white transition-all shadow-sm"
            >
              Exit Console
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
