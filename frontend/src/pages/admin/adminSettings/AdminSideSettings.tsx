import * as React from "react";
import { useDemoStore } from "@/store/demo-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, Bell, Smartphone, Monitor, Upload, Settings2, EyeOff, Eye, Lock, Smartphone as SmartphoneIcon, ShoppingCart, Info, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { SecuritySettings } from "./components/SecuritySettings";
import { getSoundSettings, updateSoundSetting, setAllSoundsEnabled, areAllSoundsEnabled, testSound, type SoundSettings } from "@/lib/sound-notification";

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

    // Sound settings
    const [soundSettings, setSoundSettings] = React.useState<SoundSettings>(getSoundSettings());

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
        <div className="container max-w-5xl py-4 sm:py-6 space-y-6 pb-20 no-scrollbar px-3 sm:px-4 lg:px-6">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
                            <Settings2 className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tighter uppercase">Admin Controls</h1>
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

                    {/* 2. NOTIFICATION SOUNDS */}
                    <Card className="shadow-sm border-t-4 border-t-orange-500">
                        <CardHeader className="py-3 bg-orange-50/50 border-b flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-base flex items-center gap-2 text-orange-700">
                                <Bell className="w-4 h-4" /> Notification Sounds
                            </CardTitle>
                            <Button
                                size="sm"
                                variant={areAllSoundsEnabled() ? "destructive" : "default"}
                                onClick={() => {
                                    const newState = !areAllSoundsEnabled();
                                    setAllSoundsEnabled(newState);
                                    setSoundSettings(getSoundSettings());
                                    toast.success(newState ? "All sounds enabled" : "All sounds disabled");
                                }}
                                className="h-7 text-xs"
                            >
                                {areAllSoundsEnabled() ? "Disable All" : "Enable All"}
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-gray-100">
                                {[
                                    { key: 'qr', label: 'QR / Table Orders', icon: '📱' },
                                    { key: 'takeaway', label: 'Takeaway / Walk-in', icon: '🛍️' },
                                    { key: 'zomato', label: 'Zomato Orders', icon: '🍔' },
                                    { key: 'swiggy', label: 'Swiggy Orders', icon: '🍕' },
                                ].map(({ key, label, icon }) => (
                                    <div key={key} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg">{icon}</span>
                                            <div>
                                                <span className="text-sm font-medium text-gray-700">{label}</span>
                                                <p className="text-[10px] text-gray-400">Notification sound</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-gray-400 hover:text-orange-600"
                                                title="Test Sound"
                                                onClick={() => testSound(key as keyof SoundSettings)}
                                            >
                                                <Volume2 className="w-3.5 h-3.5" />
                                            </Button>
                                            <Switch
                                                checked={soundSettings[key as keyof SoundSettings]?.enabled}
                                                onCheckedChange={(v) => {
                                                    updateSoundSetting(key as keyof SoundSettings, v);
                                                    setSoundSettings(getSoundSettings());
                                                    toast.success(`${label} sound ${v ? 'enabled' : 'disabled'}`);
                                                }}
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
                        <CardContent className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
