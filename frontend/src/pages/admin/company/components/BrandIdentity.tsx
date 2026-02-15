/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Store, Upload, Image as ImageIcon, Pencil, MapPin, Phone, Mail, Utensils, Hash, Clock, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BrandIdentityProps {
  data: {
    name: string;
    slug?: string;
    phone: string;
    email: string;
    address: string;
    gst_number: string;
    tagline?: string;
    restaurant_type?: string;
    logo_url?: string;
    opening_hours?: any;
    closing_hours?: any;
  };
  onChange: (data: any) => void;
}

const RESTAURANT_TYPES = [
  "Fine Dining",
  "Casual Dining",
  "Fast Food / QSR",
  "Cafe / Coffee Shop",
  "Bakery",
  "Bar / Pub",
  "Cloud Kitchen",
  "Food Court",
  "Other"
];

export function BrandIdentity({ data, onChange }: BrandIdentityProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [slugValidation, setSlugValidation] = React.useState<{ isValid: boolean; message: string } | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = React.useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max file size is 5MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const { data: resData, error } = await apiClient.post<{ data: { logo_url: string } }>('/restaurant/profile/logo', formData);

      if (error) {
        toast.error(error.message);
        return;
      }

      if (resData?.data?.logo_url) {
        onChange({ ...data, logo_url: resData.data.logo_url });
        toast.success("Restaurant logo has been updated successfully.");
      }
    } catch (err) {
      toast.error("Failed to upload logo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSlugChange = (newSlug: string) => {
    onChange({ ...data, slug: newSlug });
    setSlugValidation(null);
  };

  const validateSlug = async (slug: string) => {
    if (!slug || slug.trim().length === 0) {
      setSlugValidation({ isValid: false, message: "Slug cannot be empty" });
      return;
    }

    if (slug.length < 3) {
      setSlugValidation({ isValid: false, message: "Slug must be at least 3 characters" });
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      setSlugValidation({ isValid: false, message: "Only lowercase, numbers, and hyphens allowed" });
      return;
    }

    setIsCheckingSlug(true);
    try {
      // Check availability by trying to update
      const { error } = await apiClient.patch('/restaurant/slug', { slug });

      if (error) {
        setSlugValidation({ isValid: false, message: error.message });
      } else {
        setSlugValidation({ isValid: true, message: "Slug is available and updated!" });
        toast.success("Restaurant slug updated successfully!");
      }
    } catch (err) {
      setSlugValidation({ isValid: false, message: "Failed to validate slug" });
    } finally {
      setIsCheckingSlug(false);
    }
  };

  const getOpenTime = () => {
    if (typeof data.opening_hours === 'string') return data.opening_hours;
    return data.opening_hours?.default || "";
  };

  const getCloseTime = () => {
    if (typeof data.closing_hours === 'string') return data.closing_hours;
    return data.closing_hours?.default || "";
  };

  return (
    <Card className="shadow-lg shadow-slate-100/50 border-slate-100 rounded-3xl overflow-hidden bg-white">
      <CardContent className="p-4 md:p-5 space-y-4">
        {/* Header Section: Logo | Name, Tagline, Address */}
        <div className="flex flex-col md:flex-row items-start gap-4">
          {/* Logo Section */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="relative group shrink-0"
          >
            <div
              className="h-24 w-24 md:h-28 md:w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-slate-50 shadow-md cursor-pointer bg-slate-50 transition-all group-hover:ring-2 group-hover:ring-indigo-500/10"
              onClick={() => fileInputRef.current?.click()}
            >
              {data.logo_url ? (
                <img src={data.logo_url} alt="Logo" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-slate-300 gap-1">
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Add Logo</span>
                </div>
              )}

              {/* Hover Overlay - Perfectly circular */}
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px] rounded-2xl">
                <Camera className="h-4 w-4 mb-0.5" />
                <span className="text-[7px] font-black uppercase tracking-widest leading-none">{uploading ? "..." : "UPLOAD"}</span>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleLogoUpload}
            />
          </motion.div>

          {/* Brand Info */}
          <div className="flex-1 space-y-3 w-full">
            <div className="grid md:grid-cols-2 gap-3">
              {/* Name Field */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 px-1">
                  <div className="h-5 w-5 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-500 border border-indigo-100">
                    <Store className="h-3 w-3" />
                  </div>
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Brand Name</Label>
                </div>
                <div className="flex items-center gap-2">
                  {isEditingName ? (
                    <Input
                      value={data.name}
                      onChange={(e) => onChange({ ...data, name: e.target.value })}
                      onBlur={() => setIsEditingName(false)}
                      autoFocus
                      className="text-lg font-black text-slate-800 h-9 px-3 bg-slate-50 border-indigo-50 rounded-xl focus-visible:ring-indigo-500"
                    />
                  ) : (
                    <div
                      className="flex-1 text-xl font-black tracking-tight text-slate-800 uppercase leading-none cursor-pointer hover:text-indigo-600 transition-colors"
                      onClick={() => setIsEditingName(true)}
                    >
                      {data.name || "Enterprise name"}
                    </div>
                  )}
                  <button
                    onClick={() => setIsEditingName(!isEditingName)}
                    className="p-1.5 hover:bg-slate-50 rounded-lg transition-all text-slate-300 hover:text-indigo-500"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Slug Field - NEW */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 px-1">
                  <div className="h-5 w-5 rounded-md bg-purple-50 flex items-center justify-center text-purple-500 border border-purple-100">
                    <Hash className="h-3 w-3" />
                  </div>
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Menu URL Slug</Label>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={data.slug || ""}
                      onChange={(e) => handleSlugChange(e.target.value.toLowerCase())}
                      placeholder="restaurant-name-location"
                      className={cn(
                        "text-sm font-mono text-slate-700 h-9 px-3 bg-slate-50 rounded-xl focus-visible:ring-indigo-500",
                        slugValidation?.isValid === false && "border-red-300 bg-red-50",
                        slugValidation?.isValid === true && "border-green-300 bg-green-50"
                      )}
                    />
                    <Button
                      onClick={() => data.slug && validateSlug(data.slug)}
                      disabled={!data.slug || isCheckingSlug}
                      size="sm"
                      variant="outline"
                      className="h-9 px-3 font-bold text-[10px] uppercase tracking-widest"
                    >
                      {isCheckingSlug ? "..." : "Save"}
                    </Button>
                  </div>
                  {slugValidation && (
                    <p className={cn(
                      "text-[10px] font-semibold px-1",
                      slugValidation.isValid ? "text-green-600" : "text-red-600"
                    )}>
                      {slugValidation.message}
                    </p>
                  )}
                  {data.slug && (
                    <p className="text-[10px] font-medium text-slate-400 px-1">
                      Menu URL: <span className="font-mono text-indigo-600">{window.location.origin}/{data.slug}/menu</span>
                    </p>
                  )}
                  <p className="text-[9px] text-slate-400 px-1 italic">
                    ⚠️ Changing slug will break existing QR codes and shared links
                  </p>
                </div>
              </div>

              {/* Tagline Field */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 px-1">
                  <div className="h-5 w-4 rounded-md bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100">
                    <Utensils className="h-3 w-3" />
                  </div>
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Brand Slogan</Label>
                </div>
                <Input
                  value={data.tagline || ""}
                  onChange={(e) => onChange({ ...data, tagline: e.target.value })}
                  placeholder="Define your mantra..."
                  className="text-sm font-bold text-slate-500 border-none bg-slate-50/50 h-9 px-3 rounded-xl focus-visible:ring-1 focus-visible:ring-indigo-100 placeholder:text-slate-300"
                />
              </div>
            </div>

            {/* Address field */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-1">
                <div className="h-5 w-5 rounded-md bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100">
                  <MapPin className="h-3 w-3" />
                </div>
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Street Address</Label>
              </div>
              <Input
                value={data.address || ""}
                onChange={(e) => onChange({ ...data, address: e.target.value })}
                placeholder="City, Area, Building..."
                className="text-xs font-semibold text-slate-500 bg-slate-50/30 border border-slate-100 rounded-xl px-3 h-10 transition-all hover:bg-white focus-visible:ring-1 focus-visible:ring-indigo-100"
              />
            </div>
          </div>
        </div>

        {/* Separator - Subtle Line */}
        <div className="h-px w-full bg-slate-50" />

        {/* Details Section: Two Column Grid */}
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
          {/* Column 1 */}
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="h-6 w-6 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 border border-orange-100 shadow-sm">
                  <Utensils className="h-3 w-3" />
                </div>
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Classification</Label>
              </div>
              <Select
                value={data.restaurant_type || ""}
                onValueChange={(val) => onChange({ ...data, restaurant_type: val })}
              >
                <SelectTrigger className="border-slate-100 bg-slate-50/30 rounded-xl h-11 font-bold text-xs text-slate-600 hover:bg-white hover:border-indigo-100 transition-all focus:ring-1 focus:ring-indigo-100 shadow-sm">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                  {RESTAURANT_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="rounded-lg font-bold py-2 text-[10px]">{type.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="h-6 w-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100 shadow-sm">
                  <Hash className="h-3 w-3" />
                </div>
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">GST Registration</Label>
              </div>
              <Input
                value={data.gst_number || ""}
                onChange={(e) => onChange({ ...data, gst_number: e.target.value })}
                placeholder="GSTIN IDENTIFIER"
                className="border-slate-100 bg-slate-50/30 rounded-xl h-11 font-black tracking-widest text-xs text-slate-600 uppercase placeholder:text-slate-200 focus-visible:ring-indigo-50 transition-all hover:bg-white hover:border-indigo-100"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="h-6 w-6 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100 shadow-sm">
                  <Clock className="h-3 w-3" />
                </div>
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Operation Window</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Input
                    type="time"
                    value={getOpenTime()}
                    onChange={(e) => onChange({ ...data, opening_hours: { default: e.target.value } })}
                    className="border-slate-100 bg-slate-50/30 rounded-xl h-11 font-bold text-xs text-slate-600 focus-visible:ring-indigo-50 hover:bg-white transition-all pl-3 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-300 uppercase">Open</span>
                </div>
                <div className="relative">
                  <Input
                    type="time"
                    value={getCloseTime()}
                    onChange={(e) => onChange({ ...data, closing_hours: { default: e.target.value } })}
                    className="border-slate-100 bg-slate-50/30 rounded-xl h-11 font-bold text-xs text-slate-600 focus-visible:ring-indigo-100 hover:bg-white transition-all pl-3 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-300 uppercase">Close</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="h-6 w-6 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500 border border-purple-100 shadow-sm">
                  <Mail className="h-3 w-3" />
                </div>
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Digital Contact</Label>
              </div>
              <Input
                type="email"
                value={data.email || ""}
                onChange={(e) => onChange({ ...data, email: e.target.value })}
                placeholder="corporate@domain.com"
                className="border-slate-100 bg-slate-50/30 rounded-xl h-11 font-bold text-xs text-slate-600 focus-visible:ring-indigo-50 hover:bg-white transition-all shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 border border-indigo-100 shadow-sm">
                  <Phone className="h-3 w-3" />
                </div>
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Primary Phone</Label>
              </div>
              <Input
                type="tel"
                value={data.phone || ""}
                onChange={(e) => onChange({ ...data, phone: e.target.value })}
                placeholder="+0 (000) 000-0000"
                className="border-slate-100 bg-slate-50/30 rounded-xl h-11 font-bold text-xs text-slate-600 focus-visible:ring-indigo-50 hover:bg-white transition-all shadow-sm"
              />
            </div>

            <div className="bg-slate-900 rounded-[1.5rem] p-5 text-white relative overflow-hidden shadow-xl shadow-slate-100 mt-2">
              <div className="relative z-10 flex flex-col gap-1">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Identity Verification</span>
                <p className="font-bold text-sm leading-tight tracking-tight text-slate-200">
                  Update your contact protocols to ensure seamless communication with stakeholders.
                </p>
              </div>
              <Store className="absolute -right-4 -bottom-4 h-24 w-24 opacity-5 rotate-12" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
