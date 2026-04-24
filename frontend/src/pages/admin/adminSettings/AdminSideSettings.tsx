import * as React from "react";
import { useDemoStore } from "@/store/demo-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Eye, EyeOff, Globe2, Monitor, Settings2, ShieldCheck, Smartphone as SmartphoneIcon, Store, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { SecuritySettings } from "./components/SecuritySettings";
import { getSoundSettings, updateSoundSetting, setAllSoundsEnabled, areAllSoundsEnabled, testSound, type SoundSettings } from "@/lib/sound-notification";
import RegionalSettingsPanel from "@/components/settings/RegionalSettingsPanel";

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

    const handleSavePin = () => {
        if (pin.length < 4) return toast.error("PIN too short");
        dispatch({ type: "SET_ADMIN_PIN", pin });
        toast.success("PIN Updated");
    };

    const SettingRow = ({ label, checked, onChange, subLabel }: any) => (
        <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
            <div>
                <p className="text-sm font-medium text-gray-700">{label}</p>
                {subLabel && <p className="text-[10px] text-gray-400">{subLabel}</p>}
            </div>
            <Switch checked={checked} onCheckedChange={onChange} className="scale-75" />
        </div>
    );

    const restaurantSettings = (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader className="py-3 bg-slate-50 border-b">
                        <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                            <Monitor className="w-4 h-4" />
                            Show or Hide Pages
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Sidebar Menu</h3>
                            <div className="bg-white rounded-lg border px-3">
                                <SettingRow label="Show Offers Page" checked={prefs.sidebar.showCampaigns} onChange={(v: boolean) => updatePrefs('sidebar', 'showCampaigns', v)} />
                                <SettingRow label="Show Customers Page" checked={prefs.sidebar.showCustomers} onChange={(v: boolean) => updatePrefs('sidebar', 'showCustomers', v)} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billing Form (Dashboard)</h3>
                            <div className="bg-white rounded-lg border px-3">
                                <SettingRow label="Customer Name" checked={prefs.dashboardFields.showName} onChange={(v: boolean) => updatePrefs('dashboardFields', 'showName', v)} />
                                <SettingRow label="Customer Phone" checked={prefs.dashboardFields.showNumber} onChange={(v: boolean) => updatePrefs('dashboardFields', 'showNumber', v)} />
                                <SettingRow label="Show 'Time'" checked={prefs.dashboardFields.showArriveAt} onChange={(v: boolean) => updatePrefs('dashboardFields', 'showArriveAt', v)} />
                                <SettingRow label="Show 'Source'" checked={prefs.dashboardFields.showSource} onChange={(v: boolean) => updatePrefs('dashboardFields', 'showSource', v)} />
                                <SettingRow label="Special Instructions" checked={prefs.dashboardFields.showSpecialInstructions} onChange={(v: boolean) => updatePrefs('dashboardFields', 'showSpecialInstructions', v)} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border border-slate-200">
                    <CardHeader className="py-3 bg-indigo-50/50 border-b">
                        <CardTitle className="text-base flex items-center gap-2 text-indigo-700">
                            <SmartphoneIcon className="w-4 h-4" />
                            Rules for Customers
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        <div className="bg-white rounded-lg border px-3">
                            <SettingRow
                                label="Ask for Customer Info"
                                subLabel="Customers must give name and phone"
                                checked={state.customerSettings.requireCustomerDetails}
                                onChange={(v: boolean) => dispatch({ type: "UPDATE_CUSTOMER_SETTINGS", payload: { requireCustomerDetails: v } })}
                            />
                            <SettingRow
                                label="Allow Orders when Closed"
                                subLabel="Customers can order even if shop is not open"
                                checked={state.customerSettings.enablePreOrder}
                                onChange={(v: boolean) => dispatch({ type: "UPDATE_CUSTOMER_SETTINGS", payload: { enablePreOrder: v } })}
                            />
                            <SettingRow
                                label="Show Popular Items"
                                subLabel='Show "Best" or "Popular" tags'
                                checked={state.customerSettings.showProductDemand}
                                onChange={(v: boolean) => dispatch({ type: "UPDATE_CUSTOMER_SETTINGS", payload: { showProductDemand: v } })}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card className="shadow-sm border-t-4 border-t-orange-500">
                    <CardHeader className="py-3 bg-orange-50/50 border-b flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-base flex items-center gap-2 text-orange-700">
                            <Bell className="w-4 h-4" />
                            Sound Alerts
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
                                { key: 'qr', label: 'Table Orders', icon: '📱' },
                                { key: 'takeaway', label: 'Counter Orders', icon: '🛍️' },
                                { key: 'zomato', label: 'Zomato Orders', icon: '🍔' },
                                { key: 'swiggy', label: 'Swiggy Orders', icon: '🍕' },
                                { key: 'reservation', label: 'Booking Alerts', icon: '⏰' },
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

                <Card className="shadow-sm border-l-4 border-l-blue-600">
                    <CardContent className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-blue-700 font-semibold">
                                <ShieldCheck className="w-4 h-4" />
                                Security PIN
                            </div>
                            <p className="text-[10px] text-gray-500">Password for important changes.</p>
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
            </div>
        </div>
    );

    return (
        <div className="container max-w-6xl py-4 sm:py-6 space-y-6 pb-20 no-scrollbar px-3 sm:px-4 lg:px-6">
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-amber-50 shadow-sm">
                <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-12 w-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-lg shadow-slate-200">
                                <Settings2 className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-700">Admin Control Center</p>
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Settings</h1>
                            </div>
                        </div>
                        <p className="max-w-2xl text-sm text-slate-600">
                            Reworked into focused tabs so restaurant operations, regional defaults, and sensitive account controls are separated cleanly.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                            <div className="flex items-center gap-2 text-slate-700">
                                <Store className="h-4 w-4" />
                                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Restaurant</span>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">Layout, ordering rules, sound alerts, and dashboard visibility.</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                            <div className="flex items-center gap-2 text-slate-700">
                                <Globe2 className="h-4 w-4" />
                                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Regional</span>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">Language, outlet defaults, receipt formats, GST, and timezone.</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                            <div className="flex items-center gap-2 text-slate-700">
                                <ShieldCheck className="h-4 w-4" />
                                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Security</span>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">Password and email changes with verification flow.</p>
                        </div>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="restaurant" className="space-y-5">
                <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-2xl bg-slate-100 p-2">
                    <TabsTrigger value="restaurant" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:text-slate-950">
                        Restaurant Setting
                    </TabsTrigger>
                    <TabsTrigger value="regional" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:text-slate-950">
                        Regional Setting
                    </TabsTrigger>
                    <TabsTrigger value="security" className="rounded-xl px-4 py-2.5 data-[state=active]:bg-white data-[state=active]:text-slate-950">
                        Security Setting
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="restaurant" className="mt-0">
                    {restaurantSettings}
                </TabsContent>

                <TabsContent value="regional" className="mt-0">
                    <RegionalSettingsPanel />
                </TabsContent>

                <TabsContent value="security" className="mt-0">
                    <SecuritySettings />
                </TabsContent>
            </Tabs>
        </div>
    );
}
