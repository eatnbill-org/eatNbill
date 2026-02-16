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
              className="h-24 w-24 md:h-28 md:w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-border shadow-md cursor-pointer bg-muted transition-all group-hover:ring-2 group-hover:ring-primary/10"
              onClick={() => fileInputRef.current?.click()}
            >
              {data.logo_url ? (
                <img src={data.logo_url} alt="Logo" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground gap-1">
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Add Logo</span>
                </div>
              )}

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px] rounded-2xl">
                <Camera className="h-4 w-4 mb-0.5" />
                <span className="text-[7px] font-bold uppercase tracking-widest leading-none">{uploading ? "..." : "UPLOAD"}</span>
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
                  <div className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Store className="h-3 w-3" />
                  </div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Restaurant Name</Label>
                </div>
                <div className="flex items-center gap-2">
                  {isEditingName ? (
                    <Input
                      value={data.name}
                      onChange={(e) => onChange({ ...data, name: e.target.value })}
                      onBlur={() => setIsEditingName(false)}
                      autoFocus
                      className="text-lg font-bold text-foreground h-9 px-3 bg-muted/20 border-border rounded-xl focus-visible:ring-primary"
                    />
                  ) : (
                    <div
                      className="flex-1 text-xl font-bold tracking-tight text-foreground uppercase leading-none cursor-pointer hover:text-primary transition-colors"
                      onClick={() => setIsEditingName(true)}
                    >
                      {data.name || "Restaurant name"}
                    </div>
                  )}
                  <button
                    onClick={() => setIsEditingName(!isEditingName)}
                    className="p-1.5 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Slug Field - NEW */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 px-1">
                  <div className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Hash className="h-3 w-3" />
                  </div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Menu URL</Label>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={data.slug || ""}
                      onChange={(e) => handleSlugChange(e.target.value.toLowerCase())}
                      placeholder="restaurant-name-location"
                      className={cn(
                        "text-sm font-mono text-foreground h-9 px-3 bg-muted/20 border-border rounded-xl focus-visible:ring-primary",
                        slugValidation?.isValid === false && "border-destructive bg-destructive/10",
                        slugValidation?.isValid === true && "border-primary bg-primary/10"
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
                      slugValidation.isValid ? "text-primary" : "text-destructive"
                    )}>
                      {slugValidation.message}
                    </p>
                  )}
                  {data.slug && (
                    <p className="text-[10px] font-medium text-muted-foreground px-1">
                      Menu URL: <span className="font-mono text-primary">{window.location.origin}/{data.slug}/menu</span>
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
                  <div className="h-5 w-4 rounded-md bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Utensils className="h-3 w-3" />
                  </div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tagline</Label>
                </div>
                <Input
                  value={data.tagline || ""}
                  onChange={(e) => onChange({ ...data, tagline: e.target.value })}
                  placeholder="Your brand slogan..."
                  className="text-sm font-semibold text-muted-foreground border-none bg-muted/20 h-9 px-3 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/10"
                />
              </div>
            </div>

            {/* Address field */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 px-1">
                <div className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <MapPin className="h-3 w-3" />
                </div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Address</Label>
              </div>
              <Input
                value={data.address || ""}
                onChange={(e) => onChange({ ...data, address: e.target.value })}
                placeholder="Restaurant full address..."
                className="text-xs font-semibold text-muted-foreground bg-muted/20 border border-border rounded-xl px-3 h-10 transition-all hover:bg-white focus-visible:ring-1 focus-visible:ring-primary/10"
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
                <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                  <Utensils className="h-3 w-3" />
                </div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Restaurant Type</Label>
              </div>
              <Select
                value={data.restaurant_type || ""}
                onValueChange={(val) => onChange({ ...data, restaurant_type: val })}
              >
                <SelectTrigger className="border-border bg-muted/20 rounded-xl h-11 font-bold text-xs text-foreground hover:bg-white hover:border-primary transition-all focus:ring-1 focus:ring-primary shadow-sm">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border shadow-2xl">
                  {RESTAURANT_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="rounded-lg font-bold py-2 text-[10px]">{type.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                  <Hash className="h-3 w-3" />
                </div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GST Number</Label>
              </div>
              <Input
                value={data.gst_number || ""}
                onChange={(e) => onChange({ ...data, gst_number: e.target.value })}
                placeholder="GST NUMBER"
                className="border-border bg-muted/20 rounded-xl h-11 font-bold tracking-tight text-xs text-foreground uppercase placeholder:text-muted-foreground placeholder:opacity-50 focus-visible:ring-primary transition-all hover:bg-white hover:border-primary"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                  <Clock className="h-3 w-3" />
                </div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Opening Hours</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Input
                    type="time"
                    value={getOpenTime()}
                    onChange={(e) => onChange({ ...data, opening_hours: { default: e.target.value } })}
                    className="border-border bg-muted/20 rounded-xl h-11 font-bold text-xs text-foreground focus-visible:ring-primary hover:bg-white transition-all pl-3 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-muted-foreground uppercase">Open</span>
                </div>
                <div className="relative">
                  <Input
                    type="time"
                    value={getCloseTime()}
                    onChange={(e) => onChange({ ...data, closing_hours: { default: e.target.value } })}
                    className="border-border bg-muted/20 rounded-xl h-11 font-bold text-xs text-foreground focus-visible:ring-primary hover:bg-white transition-all pl-3 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-muted-foreground uppercase">Close</span>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                  <Mail className="h-3 w-3" />
                </div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
              </div>
              <Input
                type="email"
                value={data.email || ""}
                onChange={(e) => onChange({ ...data, email: e.target.value })}
                placeholder="contact@restaurant.com"
                className="border-border bg-muted/20 rounded-xl h-11 font-bold text-xs text-foreground focus-visible:ring-primary hover:bg-white transition-all shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                  <Phone className="h-3 w-3" />
                </div>
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
              </div>
              <Input
                type="tel"
                value={data.phone || ""}
                onChange={(e) => onChange({ ...data, phone: e.target.value })}
                placeholder="+91 00000 00000"
                className="border-border bg-muted/20 rounded-xl h-11 font-bold text-xs text-foreground focus-visible:ring-primary hover:bg-white transition-all shadow-sm"
              />
            </div>

            <div className="bg-primary rounded-2xl p-5 text-white relative overflow-hidden shadow-md mt-2">
              <div className="relative z-10 flex flex-col gap-1">
                <span className="text-[8px] font-bold uppercase tracking-widest opacity-60">Profile Status</span>
                <p className="font-bold text-sm leading-tight tracking-tight text-white/90">
                  Keep your restaurant information updated to help customers find and contact you easily.
                </p>
              </div>
              <Store className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 rotate-12" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
