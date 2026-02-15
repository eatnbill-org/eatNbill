import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Shield, Loader2, Plus, Edit2, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as staffApi from "@/api/staff";
import { useRestaurantStore } from "@/stores/restaurant/restaurant.store";

export function SharedLoginSettings() {
    const queryClient = useQueryClient();
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [isEditing, setIsEditing] = React.useState(false);

    // Get restaurant ID from store to ensure it's available before fetching
    const { restaurant } = useRestaurantStore();
    const restaurantId = restaurant?.id;

    // Fetch current shared login details with optimized settings
    const { data, isLoading } = useQuery({
        queryKey: ['staff', 'shared-login'],
        queryFn: staffApi.getSharedLogin,
        staleTime: 5 * 60 * 1000, // 5 minutes - prevent frequent re-fetches
        gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
        enabled: !!restaurantId, // Only fetch when restaurant ID is available
    });

    // Update state when data is fetched (only when data actually changes)
    React.useEffect(() => {
        if (data?.email || data?.loginId) {
            const newEmail = data.email || data.loginId;
            setEmail(prev => prev === newEmail ? prev : newEmail);
        }
    }, [data?.email, data?.loginId]);

    const setupMutation = useMutation({
        mutationFn: ({ email, password }: { email: string, password?: string }) =>
            staffApi.setupSharedLogin(email, password),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff', 'shared-login'] });
            toast.success("Shared login access updated!");
            setIsEditing(false);
            setPassword(""); // Clear password field
        },
        onError: (err: Error) => {
            toast.error(err.message || "Failed to update access");
        }
    });

    const handleSave = () => {
        if (!email) return toast.error("Email or phone is required");
        if (!hasSharedLogin && !password) return toast.error("Password is required for new shared login");
        setupMutation.mutate({ email, password: password || undefined });
    };

    const hasSharedLogin = !!(data?.email || data?.loginId);

    return (
        <div className="rounded-[2rem] border border-slate-100 bg-white shadow-xl shadow-slate-200/30 overflow-hidden">
            <div className="p-6 pb-5 border-b border-slate-100 bg-gradient-to-br from-purple-50 to-white">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-200 shrink-0">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase mb-1">
                                Waiter Shared Access
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                                Create one shared login that all waiters can use to access the waiter portal. This simplifies access management for floor staff.
                            </p>
                        </div>
                    </div>

                    {!isEditing && !isLoading && (
                        <Button
                            onClick={() => setIsEditing(true)}
                            variant="outline"
                            className="h-9 px-4 rounded-xl font-bold uppercase tracking-widest text-[10px] border-purple-200 text-purple-600 hover:bg-purple-50 shrink-0"
                        >
                            {hasSharedLogin ? (
                                <>
                                    <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                                    Edit
                                </>
                            ) : (
                                <>
                                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                                    Add Credentials
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>

            <div className="p-6">
                {isLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center space-y-3 opacity-40">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                        <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Loading...</p>
                    </div>
                ) : isEditing ? (
                    <div className="space-y-4">
                        {/* Shared Login Warning */}
                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-black text-amber-900 uppercase tracking-widest mb-1">Shared Login Identifier</p>
                                <p className="text-xs text-amber-700 leading-relaxed">
                                    Use a shared email or phone number that all waiters will use to log in.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                                    Shared Email or Phone <span className="text-rose-500">*</span>
                                </Label>
                                <Input
                                    placeholder="e.g. waiters@yourrestaurant.com or +91 9876543210"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-11 rounded-xl border-slate-200 focus-visible:ring-purple-500"
                                />
                                <p className="text-[10px] text-slate-400 italic">All waiters will use this to log in</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                                    Password {hasSharedLogin && <span className="text-slate-400 font-normal">(Optional)</span>}
                                </Label>
                                <Input
                                    type="password"
                                    placeholder={hasSharedLogin ? "Leave blank to keep current" : "Minimum 8 characters"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-11 rounded-xl border-slate-200 focus-visible:ring-purple-500"
                                />
                                {!hasSharedLogin && <p className="text-[10px] text-slate-400 italic">Required for new credentials</p>}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                onClick={handleSave}
                                disabled={setupMutation.isPending}
                                className="flex-1 h-11 rounded-xl font-bold uppercase tracking-widest text-[11px] bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-100"
                            >
                                {setupMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Key className="w-4 h-4 mr-2" />
                                        Save Credentials
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setIsEditing(false);
                                    setEmail(data?.email || data?.loginId || "");
                                    setPassword("");
                                }}
                                className="h-11 px-6 rounded-xl font-bold uppercase tracking-widest text-[11px] text-slate-400 hover:bg-slate-50"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div>
                        {hasSharedLogin ? (
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                    <Key className="w-6 h-6 text-purple-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Shared Login</p>
                                    <p className="text-sm font-bold text-slate-800">{email}</p>
                                </div>
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="inline-flex h-16 w-16 rounded-2xl bg-slate-100 items-center justify-center mb-4">
                                    <Key className="w-8 h-8 text-slate-300" />
                                </div>
                                <p className="text-sm font-bold text-slate-600 mb-1">No Shared Credentials Set</p>
                                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                                    Click "Add Credentials" above to create a shared login for all waiters.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
