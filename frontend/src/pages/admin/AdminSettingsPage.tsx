/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { useDemoStore, CustomerTheme } from "@/store/demo-store";
import { useRestaurantStore } from "@/stores/restaurant/restaurant.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Layout, Smartphone, Eye, Store } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CUSTOMER_THEME_PRESETS, normalizeCustomerTheme } from "@/lib/customer-theme-presets";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSettingsPage() {
  const { state, dispatch } = useDemoStore();
  const settings = state.customerSettings;
  const { restaurant, updateTheme, updating } = useRestaurantStore();
  const [savingTheme, setSavingTheme] = React.useState(false);

  // Get active theme from restaurant or fallback to classic
  const activeTheme = normalizeCustomerTheme(restaurant?.theme_settings?.theme_id);

  const update = (key: keyof typeof settings, value: any) => {
    dispatch({ type: "UPDATE_CUSTOMER_SETTINGS", payload: { [key]: value } });
  };

  const handleThemeChange = async (themeId: CustomerTheme) => {
    setSavingTheme(true);
    try {
      const success = await updateTheme({
        theme_id: themeId,
      });

      if (success) {
        toast({
          title: "Theme updated",
          description: `Successfully switched to ${themeId} theme.`,
        });
      } else {
        toast({
          title: "Update failed",
          description: "Could not update theme. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while updating the theme.",
        variant: "destructive",
      });
    } finally {
      setSavingTheme(false);
    }
  };

  const themes = Object.values(CUSTOMER_THEME_PRESETS);

  const handlePreview = () => {
    if (restaurant?.slug) {
      window.open(`/${restaurant.slug}/menu`, '_blank', 'noopener,noreferrer');
      return;
    }

    toast({
      title: "Preview unavailable",
      description: "Restaurant slug not found yet. Complete profile/setup first.",
      variant: "destructive",
    });
  };

  return (
    <div className="container max-w-5xl py-4 sm:py-6 space-y-6 pb-20 no-scrollbar px-3 sm:px-4 lg:px-6">

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-lg bg-primary text-white flex items-center justify-center shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Menu Settings</h1>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Customize the appearance of your digital menu for customers.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handlePreview}
            className="h-11 px-6 rounded-xl border-border font-bold uppercase tracking-widest text-[11px] text-muted-foreground hover:bg-muted transition-all"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Menu
          </Button>
        </div>
      </div>

      {/* 1. THEME SELECTION */}
      <Card className="shadow-sm border-border">
        <CardHeader className="bg-muted/30 border-b py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Layout className="w-5 h-5 text-primary" />
                Menu Theme
              </CardTitle>
              <CardDescription className="text-xs font-semibold text-muted-foreground mt-1">Select a theme to change the visual style of your customer menu.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {themes.map((t) => (
              <div
                key={t.id}
                onClick={() => !savingTheme && !updating && handleThemeChange(t.id as CustomerTheme)}
                className={`
                  cursor-pointer rounded-xl border-2 p-3 flex flex-col items-center gap-2 transition-all group
                  ${activeTheme === t.id ? 'border-primary ring-4 ring-primary/10 bg-primary/5' : 'border-border hover:border-muted-foreground hover:bg-muted'}
                  ${savingTheme || updating ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div
                  className={`w-full h-16 rounded-lg shadow-sm ${t.fontClass} flex items-center justify-center transition-transform group-hover:scale-105`}
                  style={{
                    background: `linear-gradient(135deg, ${t.primaryColor}, ${t.accentColor})`,
                    color: t.secondaryColor,
                  }}
                >
                  {activeTheme === t.id && (
                    <div className="bg-white/90 p-1 rounded-full shadow-sm text-primary">
                      <Layout className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <span className={`font-bold uppercase tracking-wider text-[10px] ${activeTheme === t.id ? 'text-primary' : 'text-foreground'}`}>{t.name}</span>
                <span className="text-[9px] text-muted-foreground text-center font-bold tracking-tight line-clamp-1">{t.description}</span>
                {savingTheme && activeTheme === t.id && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Skeleton className="w-2.5 h-2.5" rounded="full" />
                    <span className="text-[9px] font-bold uppercase text-muted-foreground">Saving...</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
