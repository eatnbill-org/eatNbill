import * as React from "react";
import { useDemoStore } from "@/store/demo-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, Bell, Smartphone, Monitor, Upload, Settings2, EyeOff, Eye, Lock, Smartphone as SmartphoneIcon, ShoppingCart, Info, Volume2, Percent, Moon, Sun, SunMoon, BellRing } from "lucide-react";
import { useDarkMode } from "@/hooks/use-dark-mode";
import { getNotificationPermission, requestNotificationPermission, getNotificationsEnabled, setNotificationsEnabled } from "@/lib/push-notifications";
import { apiClient } from "@/lib/api-client";
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

    // Dark mode
    const { isDark, preference, setDarkMode } = useDarkMode();

    // Browser notifications
    const [notifPermission, setNotifPermission] = React.useState(getNotificationPermission);
    const [notifEnabled, setNotifEnabled] = React.useState(getNotificationsEnabled);
    const handleEnableNotifications = async () => {
        const result = await requestNotificationPermission();
        setNotifPermission(result);
        if (result === 'granted') { setNotifEnabled(true); toast.success('Browser notifications enabled'); }
        else if (result === 'denied') { toast.error('Notifications blocked — allow them in browser settings'); }
    };
    const toggleNotifEnabled = () => {
        const next = !notifEnabled;
        setNotificationsEnabled(next);
        setNotifEnabled(next);
    };

    // Sound settings
    const [soundSettings, setSoundSettings] = React.useState<SoundSettings>(getSoundSettings());

    // Billing settings (server-side)
    const [serviceChargePercent, setServiceChargePercent] = React.useState<string>("");
    const [tipsEnabled, setTipsEnabled] = React.useState(false);
    const [billingSaving, setBillingSaving] = React.useState(false);

    React.useEffect(() => {
        void apiClient.get<{ service_charge_percent?: number | null; tips_enabled?: boolean }>("/restaurant/settings")
            .then(r => {
                const s = r.data as any;
                setServiceChargePercent(s?.service_charge_percent != null ? String(s.service_charge_percent) : "");
                setTipsEnabled(s?.tips_enabled ?? false);
            })
            .catch(() => void 0);
    }, []);

    const handleSaveBillingSettings = async () => {
        setBillingSaving(true);
        try {
            await apiClient.patch("/restaurant/settings", {
                service_charge_percent: serviceChargePercent ? parseFloat(serviceChargePercent) : null,
                tips_enabled: tipsEnabled,
            });
            toast.success("Billing settings saved");
        } catch {
            toast.error("Failed to save billing settings");
        } finally { setBillingSaving(false); }
    };

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
            <RegionalSettingsPanel compact />
             
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

                {/* 0. APPEARANCE */}
                <Card className="shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                    <CardHeader className="py-3 bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-700">
                        <CardTitle className="text-base flex items-center gap-2 text-slate-800 dark:text-slate-200">
                            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />} Appearance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Choose your preferred color scheme for the admin panel.</p>
                        <div className="flex gap-2">
                            {([
                                { value: "light", label: "Light", icon: Sun },
                                { value: "dark", label: "Dark", icon: Moon },
                                { value: "system", label: "System", icon: SunMoon },
                            ] as const).map(({ value, label, icon: Icon }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setDarkMode(value)}
                                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all font-bold text-sm ${preference === value ? "border-primary bg-primary/5 text-primary" : "border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300"}`}
                                >
                                    <Icon className="h-5 w-5" />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* 0b. BROWSER NOTIFICATIONS */}
                <Card className="shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800">
                    <CardHeader className="py-3 bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-700">
                        <CardTitle className="text-base flex items-center gap-2 text-slate-800 dark:text-slate-200">
                            {notifPermission === 'granted' && notifEnabled ? <BellRing className="w-4 h-4 text-amber-500" /> : <Bell className="w-4 h-4" />} Browser Notifications
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            {notifPermission === 'unsupported' ? 'Not supported in this browser.'
                                : notifPermission === 'denied' ? 'Notifications are blocked. Allow them in your browser settings.'
                                : 'Show an alert when a new QR order arrives, even when this tab is in the background.'}
                        </p>
                        {notifPermission === 'default' ? (
                            <Button size="sm" onClick={handleEnableNotifications} className="gap-2 w-full">
                                <Bell className="h-4 w-4" /> Allow Notifications
                            </Button>
                        ) : notifPermission === 'granted' ? (
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                    {notifEnabled ? 'Notifications active' : 'Notifications paused'}
                                </span>
                                <button
                                    type="button"
                                    onClick={toggleNotifEnabled}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifEnabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${notifEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        ) : null}
                    </CardContent>
                </Card>

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
                                    { key: 'reservation', label: 'Reservation Alerts', icon: '⏰' },
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

                    {/* 4. BILLING SETTINGS (Service Charge + Tips) */}
                    <Card className="shadow-sm border border-slate-200">
                        <CardHeader className="py-3 bg-emerald-50/50 border-b">
                            <CardTitle className="text-base flex items-center gap-2 text-emerald-700"><Percent className="w-4 h-4" /> Billing Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Service Charge (%)</Label>
                                    <Input
                                        type="number" min={0} max={30} step={0.5}
                                        value={serviceChargePercent}
                                        onChange={e => setServiceChargePercent(e.target.value)}
                                        placeholder="e.g. 10 (leave blank to disable)"
                                        className="h-9 rounded-xl text-sm"
                                    />
                                    <p className="text-[10px] text-slate-400">Auto-added to bills as a separate line item</p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tips</Label>
                                    <div className="flex items-center gap-3 pt-1">
                                        <Switch checked={tipsEnabled} onCheckedChange={setTipsEnabled} />
                                        <span className="text-sm text-slate-600">{tipsEnabled ? "Enabled" : "Disabled"}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400">Allow cashier to collect tip at payment</p>
                                </div>
                            </div>
                            <Button size="sm" onClick={() => void handleSaveBillingSettings()} disabled={billingSaving} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700">
                                {billingSaving ? "Saving..." : "Save Billing Settings"}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* 5. CUSTOMER ORDERING RULES */}
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
