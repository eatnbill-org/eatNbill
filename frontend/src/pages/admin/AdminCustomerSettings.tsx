import * as React from "react";
import { useDemoStore } from "@/store/demo-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Smartphone, Layout, ShoppingCart, Eye } from "lucide-react";

export default function AdminCustomerSettings() {
  const { state, dispatch } = useDemoStore();
  const settings = state.customerSettings;

  const update = (key: keyof typeof settings, value: any) => {
    dispatch({ type: "updateCustomerSettings", payload: { [key]: value } }); 
    // Note: You need to implement "updateCustomerSettings" in your store reducer logic mentioned in Step 1
  };

  const themes = [
    { id: 'classic', name: 'Classic List', color: 'bg-emerald-100' },
    { id: 'modern', name: 'Modern Grid', color: 'bg-blue-100' },
    { id: 'minimal', name: 'Minimal White', color: 'bg-gray-100' },
    { id: 'dark', name: 'Night Mode', color: 'bg-slate-800 text-white' },
    { id: 'grid', name: 'Big Tiles', color: 'bg-orange-100' },
    { id: 'slider', name: 'Story Slider', color: 'bg-purple-100' },
  ];

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      
      {/* 1. THEME SELECTION */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Layout className="w-5 h-5"/> Customer App Theme</CardTitle>
          <CardDescription>Choose how your store looks to customers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {themes.map((t) => (
              <div 
                key={t.id}
                onClick={() => update('activeTheme', t.id)}
                className={`
                  cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all
                  ${settings.activeTheme === t.id ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:bg-muted'}
                `}
              >
                <div className={`w-full h-24 rounded-lg shadow-inner ${t.color}`}></div>
                <span className="font-medium text-sm">{t.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. CONTROLS */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Smartphone className="w-5 h-5"/> Ordering Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Customer Login</Label>
                <p className="text-xs text-muted-foreground">Ask for Name & Phone before ordering</p>
              </div>
              <Switch 
                checked={settings.requireCustomerDetails}
                onCheckedChange={(v) => update('requireCustomerDetails', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Pre-Orders</Label>
                <p className="text-xs text-muted-foreground">Allow orders even if shop is closed</p>
              </div>
              <Switch 
                checked={settings.enablePreOrder}
                onCheckedChange={(v) => update('enablePreOrder', v)}
              />
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5"/> Visual Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Product Demand</Label>
                <p className="text-xs text-muted-foreground">Display "Trending" or "Bestseller" badges</p>
              </div>
              <Switch 
                checked={settings.showProductDemand}
                onCheckedChange={(v) => update('showProductDemand', v)}
              />
            </div>

            <div className="space-y-2">
              <Label>Store Display Name</Label>
              <Input 
                value={settings.storeName}
                onChange={(e) => update('storeName', e.target.value)}
              />
            </div>

          </CardContent>
        </Card>
      </div>

    </div>
  );
}