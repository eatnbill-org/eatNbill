import * as React from "react";
import { useDemoStore } from "@/store/demo-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, Bell, Smartphone, Monitor, Upload, Settings2, EyeOff, Eye, Lock, Smartphone as SmartphoneIcon, ShoppingCart, Info } from "lucide-react";
import { toast } from "sonner";
import { SecuritySettings } from "./components/SecuritySettings";

export default function AdminSideSettings() {
    const { state, dispatch } = useDemoStore();

    // ✅ SAFE ACCESS (Prevents Crash)
    const prefs = state.adminPreferences || {
        sidebar: { showCampaigns: true, showCustomers: true },
        dashboardFields: { showName: true, showNumber: true, showArriveAt: true, showSource: true, showSpecialInstructions: true },
        alerts: {
            zomato: { enabled: true },
            swiggy: { enabled: true },
            walkin: { enabled: true },
            reorder: { enabled: true },
            stock: { enabled: true }
        }
    };

    // Security
    const [pin, setPin] = React.useState(state.ui?.adminPin || "1234"); // Safe Access
    const [showPin, setShowPin] = React.useState(false);

    const updatePrefs = (section: 'sidebar' | 'dashboardFields', key: string, val: boolean) => {
        dispatch({
            type: "UPDATE_ADMIN_PREFS",
            payload: { [section]: { ...prefs[section], [key]: val } }
        });
    };

    const updateAlert = (key: string, enabled: boolean) => {
        dispatch({
            type: "UPDATE_ADMIN_PREFS",
            payload: { alerts: { ...prefs.alerts, [key]: { ...prefs.alerts[key], enabled } } }
        });
    };

    const handleSavePin = () => {
        if (pin.length < 4) return toast.error("PIN too short");
        dispatch({ type: "SET_ADMIN_PIN", pin });
        toast.success("PIN Updated");
    };

    // Compact Row Helper
    const SettingRow = ({ label, checked, onChange, subLabel }: any) => (
        <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div>
                <p className="text-sm font-medium text-gray-700">{label}</p>
                {subLabel && <p className="text-[10px] text-gray-400">{subLabel}</p>}
            </div>
            <Switch checked={checked} onCheckedChange={onChange} className="scale-75" />
        </div>
    );

    return (
        <div className="container max-w-5xl py-4 space-y-6 pb-20 no-scrollbar">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
                            <Settings2 className="w-5 h-5" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Admin Controls</h1>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Global system preferences & UI configuration</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">

                {/* 1. INTERFACE CUSTOMIZATION */}
                <Card className="shadow-sm border border-slate-200">
                    <CardHeader className="py-3 bg-slate-50 border-b">
                        <CardTitle className="text-base flex items-center gap-2 text-slate-800"><Monitor className="w-4 h-4" /> Interface Visibility</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">

                        {/* Sidebar */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Sidebar Menu</h3>
                            <div className="bg-white rounded-lg border px-3">
                                <SettingRow label="Show Campaigns Page" checked={prefs.sidebar.showCampaigns} onChange={(v: boolean) => updatePrefs('sidebar', 'showCampaigns', v)} />
                                <SettingRow label="Show Customers Page" checked={prefs.sidebar.showCustomers} onChange={(v: boolean) => updatePrefs('sidebar', 'showCustomers', v)} />
                            </div>
                        </div>

                        {/* Dashboard */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">New Order Form (Dashboard)</h3>
                            <div className="bg-white rounded-lg border px-3">
                                <SettingRow label="Ask for Name" checked={prefs.dashboardFields.showName} onChange={(v: boolean) => updatePrefs('dashboardFields', 'showName', v)} />
                                <SettingRow label="Ask for Number" checked={prefs.dashboardFields.showNumber} onChange={(v: boolean) => updatePrefs('dashboardFields', 'showNumber', v)} />
                                <SettingRow label="Show 'Arrive At'" checked={prefs.dashboardFields.showArriveAt} onChange={(v: boolean) => updatePrefs('dashboardFields', 'showArriveAt', v)} />
                                <SettingRow label="Show 'Source'" checked={prefs.dashboardFields.showSource} onChange={(v: boolean) => updatePrefs('dashboardFields', 'showSource', v)} />
                                <SettingRow label="Special Instructions" checked={prefs.dashboardFields.showSpecialInstructions} onChange={(v: boolean) => updatePrefs('dashboardFields', 'showSpecialInstructions', v)} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">

                    {/* 2. ALERT CENTER (COMPACT) */}
                    <Card className="shadow-sm border-t-4 border-t-orange-500">
                        <CardHeader className="py-3 bg-orange-50/50 border-b">
                            <CardTitle className="text-base flex items-center gap-2 text-orange-700"><Bell className="w-4 h-4" /> Alert Center</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-gray-100">
                                {['zomato', 'swiggy', 'walkin', 'reorder', 'stock'].map((key) => (
                                    <div key={key} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${prefs.alerts[key]?.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                                            <span className="text-sm font-medium capitalize text-gray-700">{key} Alert</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button size="icon" variant="ghost" className="h-6 w-6 text-gray-400 hover:text-orange-600" title="Upload Sound">
                                                <Upload className="w-3 h-3" />
                                            </Button>
                                            <Switch
                                                checked={prefs.alerts[key]?.enabled}
                                                onCheckedChange={(v) => updateAlert(key, v)}
                                                className="scale-75 data-[state=checked]:bg-orange-500"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 3. SECURITY (PIN) */}
                    <Card className="shadow-sm border-l-4 border-l-blue-600">
                        <CardContent className="pt-4 flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-blue-700 font-semibold">
                                    <ShieldCheck className="w-4 h-4" /> Security PIN
                                </div>
                                <p className="text-[10px] text-gray-500">Access control for sensitive actions.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Input
                                        type={showPin ? "text" : "password"}
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        className="w-24 h-8 text-center font-mono tracking-widest text-sm"
                                        maxLength={6}
                                    />
                                    <button onClick={() => setShowPin(!showPin)} className="absolute right-1 top-1.5 text-gray-400 hover:text-blue-600">
                                        {showPin ? <EyeOff size={12} /> : <Eye size={12} />}
                                    </button>
                                </div>
                                <Button size="sm" onClick={handleSavePin} className="h-8 bg-blue-600 hover:bg-blue-700 text-xs">Update</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <SecuritySettings />

                    {/* 4. CUSTOMER ORDERING RULES */}
                    <Card className="shadow-sm border border-slate-200">
                        <CardHeader className="py-3 bg-indigo-50/50 border-b">
                            <CardTitle className="text-base flex items-center gap-2 text-indigo-700"><SmartphoneIcon className="w-4 h-4" /> Ordering Rules</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="bg-white rounded-lg border px-3">
                                <SettingRow 
                                    label="Require Customer Details" 
                                    subLabel="Ask for Name & Phone before ordering"
                                    checked={state.customerSettings.requireCustomerDetails} 
                                    onChange={(v: boolean) => dispatch({ type: "UPDATE_CUSTOMER_SETTINGS", payload: { requireCustomerDetails: v } })} 
                                />
                                <SettingRow 
                                    label="Enable Pre-Orders" 
                                    subLabel="Allow orders even if shop is closed"
                                    checked={state.customerSettings.enablePreOrder} 
                                    onChange={(v: boolean) => dispatch({ type: "UPDATE_CUSTOMER_SETTINGS", payload: { enablePreOrder: v } })} 
                                />
                                <SettingRow 
                                    label="Show Product Demand" 
                                    subLabel='Display "Trending" or "Bestseller" badges'
                                    checked={state.customerSettings.showProductDemand} 
                                    onChange={(v: boolean) => dispatch({ type: "UPDATE_CUSTOMER_SETTINGS", payload: { showProductDemand: v } })} 
                                />
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}