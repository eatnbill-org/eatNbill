/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { useRestaurantStore } from "@/stores/restaurant";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Store, LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";
import { FormSkeleton } from "@/components/ui/skeleton";

// Import Modular Components
import { BrandIdentity } from "./components/BrandIdentity";
import { TableManagement } from "./components/TableManagement";

export default function CompanyProfilePage() {
  const { restaurant, loading, fetchRestaurant, updateProfile } = useRestaurantStore();
  const [isSaving, setIsSaving] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    slug: "",
    phone: "",
    email: "",
    address: "",
    gst_number: "",
    tagline: "",
    restaurant_type: "",
    logo_url: "",
    opening_hours: null as any,
    closing_hours: null as any,
  });

  // Fetch restaurant data on mount
  React.useEffect(() => {
    if (!restaurant) {
      fetchRestaurant();
    }
  }, [restaurant, fetchRestaurant]);

  // Sync form data with store
  React.useEffect(() => {
    if (restaurant) {
      setFormData({
        name: restaurant.name || "",
        slug: restaurant.slug || "",
        phone: restaurant.phone || "",
        email: restaurant.email || "",
        address: restaurant.address || "",
        gst_number: restaurant.gst_number || "",
        tagline: restaurant.tagline || "",
        restaurant_type: restaurant.restaurant_type || "",
        logo_url: restaurant.logo_url || "",
        opening_hours: restaurant.opening_hours || null,
        closing_hours: restaurant.closing_hours || null,
      });
    }
  }, [restaurant]);

  const handleSave = async () => {
    if (!restaurant) return;

    setIsSaving(true);
    try {
      // Create a clean payload without the slug to avoid 400 validation error
      // Slug is handled independently by its own save button in BrandIdentity
      const { slug: _, ...updatePayload } = formData;
      const success = await updateProfile(updatePayload);

      if (success) {
        toast.success("Restaurant profile updated successfully!");
      } else {
        // If success is false, the store has already set the error state
        toast.error("Failed to update profile. Please check the fields.");
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || "Failed to update profile");
      } else {
        toast.error("Failed to update profile");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && !restaurant) {
    return (
      <div className="container max-w-5xl py-8">
        <FormSkeleton rows={8} />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="container max-w-5xl py-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-slate-500 text-sm">No restaurant found.</p>
          <Button onClick={() => fetchRestaurant()} variant="outline" size="sm" className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="container py-8 space-y-8 no-scrollbar max-w-7xl mx-auto px-4 md:px-8">

        {/* Main Title Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2.5 mb-1.5 px-0.5">
              <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-md">
                <Store className="w-4 h-4" />
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Restaurant Profile</h1>
            </div>
            <p className="text-sm font-medium text-muted-foreground max-w-lg leading-snug px-0.5">
              Manage your restaurant's profile and contact information.
            </p>
          </div>

          <motion.div
            whileHover={{ scale: 1.01 }}
            className="flex items-center gap-4 py-1"
          >
            <Button
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90 text-white shadow-md font-bold rounded-xl h-10 px-6 uppercase tracking-widest text-[11px] transition-all"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </motion.div>
        </motion.div>

        <div className="grid gap-8">
          {/* 1. Identity Section */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <BrandIdentity data={formData} onChange={setFormData} />
          </motion.section>

          {/* 2. Table Management Section */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <TableManagement slug={restaurant.slug} />
            </div>
          </motion.section>


        </div>

        <div className="pb-12" />
      </div>
    </div>
  );
}
