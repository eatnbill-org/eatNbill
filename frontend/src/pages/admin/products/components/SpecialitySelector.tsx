import * as React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Star, Gift, Percent, Upload, CheckCircle2, Lock } from "lucide-react";
import type { SpecialTemplateId } from "../productMeta";
import { cn } from "@/lib/utils";

interface SpecialitySelectorProps {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  selectedTemplate: SpecialTemplateId;
  setTemplate: (t: SpecialTemplateId) => void;
  customImage?: string;
  setCustomImage: (img: string) => void;
  productImage?: string;
  usageCounts: Record<SpecialTemplateId, number>; // Real Counts passed from parent
}

export function SpecialitySelector({
  enabled,
  setEnabled,
  selectedTemplate,
  setTemplate,
  customImage,
  setCustomImage,
  productImage,
  usageCounts
}: SpecialitySelectorProps) {
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomImage(reader.result as string);
        setTemplate('custom');
      };
      reader.readAsDataURL(file);
    }
  };

  // Big Template Designs
  const templates: { id: SpecialTemplateId; label: string; subLabel: string; icon: React.ReactNode; style: string }[] = [
    { 
        id: 'todays_special', 
        label: "Today's Special", 
        subLabel: "Chef's Recommendation",
        icon: <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />, 
        style: "bg-gradient-to-br from-yellow-50 to-orange-100 border-yellow-200" 
    },
    { 
        id: 'bogo', 
        label: "Buy 1 Get 1", 
        subLabel: "Limited Time Offer",
        icon: <Gift className="h-8 w-8 text-blue-500 fill-blue-200" />, 
        style: "bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200" 
    },
    { 
        id: 'discount_50', 
        label: "Flat 50% OFF", 
        subLabel: "Mega Sale",
        icon: <Percent className="h-8 w-8 text-red-500 fill-red-200" />, 
        style: "bg-gradient-to-br from-red-50 to-pink-100 border-red-200" 
    },
    { 
        id: 'custom', 
        label: "Upload Design", 
        subLabel: "Your Custom Banner",
        icon: <Upload className="h-8 w-8 text-gray-500" />, 
        style: "bg-gray-50 border-dashed border-gray-300" 
    },
  ];

  return (
    <div className="space-y-4 rounded-xl border p-4 bg-slate-50/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
            <Star className="h-4 w-4 fill-purple-600" />
          </div>
          <div>
            <Label className="text-base font-semibold">Speciality Offer</Label>
            <p className="text-[11px] text-muted-foreground">Highlight this item on the customer menu.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={setEnabled} className="data-[state=checked]:bg-purple-600" />
        </div>
      </div>

      {enabled && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
            Select Template
          </Label>
          
          <div className="grid grid-cols-2 gap-4">
            {templates.map((t) => {
              const count = usageCounts[t.id] || 0;
              const isSelected = selectedTemplate === t.id;
              // Limit Logic: Disabled if count >= 4 AND not currently selected for this product
              const isFull = count >= 4 && !isSelected; 

              return (
                <div 
                  key={t.id}
                  onClick={() => {
                    if (isFull) return; // Prevent click
                    if (t.id === 'custom' && !customImage) fileInputRef.current?.click();
                    else setTemplate(t.id);
                  }}
                  className={cn(
                    "relative aspect-square cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-3 transition-all hover:scale-[1.02]",
                    t.style,
                    isSelected ? "ring-2 ring-purple-500 border-purple-500 shadow-md scale-[1.02]" : "hover:border-purple-300",
                    isFull && "opacity-50 grayscale cursor-not-allowed hover:scale-100 hover:border-gray-200"
                  )}
                >
                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-purple-600 text-white rounded-full p-1 shadow-sm">
                        <CheckCircle2 className="h-4 w-4" />
                    </div>
                  )}

                  {/* Limit Badge */}
                  <div className={cn("absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold border", 
                      isFull ? "bg-red-100 text-red-700 border-red-200" : "bg-white/80 text-gray-600 border-gray-200"
                  )}>
                    {isFull ? <span className="flex items-center gap-1"><Lock className="h-3 w-3"/> FULL (4/4)</span> : `${count}/4 Active`}
                  </div>

                  {/* Preview Content */}
                  <div className="flex flex-col items-center text-center z-10">
                    {t.id === 'custom' && customImage ? (
                        <div className="w-24 h-24 mb-2 rounded-lg overflow-hidden border shadow-sm">
                            <img src={customImage} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="mb-2 transform transition-transform group-hover:scale-110">
                            {t.icon}
                        </div>
                    )}
                    
                    <span className="text-base font-bold text-gray-900 leading-tight">{t.label}</span>
                    <span className="text-[10px] text-gray-500 font-medium">{t.subLabel}</span>
                  </div>

                  {/* Background Product Image Preview (Subtle Overlay) */}
                  {productImage && t.id !== 'custom' && (
                    <img 
                        src={productImage} 
                        className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-multiply pointer-events-none rounded-[10px]" 
                    />
                  )}

                  {/* Custom Upload Input */}
                  {t.id === 'custom' && (
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
}