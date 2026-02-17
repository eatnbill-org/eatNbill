import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Key, Shield, Loader2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as staffApi from "@/api/staff";
import { useRestaurantStore } from "@/stores/restaurant/restaurant.store";
import { FormSkeleton } from "@/components/ui/skeleton";

interface WaiterCredentialsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function WaiterCredentialsModal({ open, onOpenChange }: WaiterCredentialsModalProps) {
    const queryClient = useQueryClient();
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");

    const { restaurant } = useRestaurantStore();
    const restaurantId = restaurant?.id;

    // Fetch current shared login details
    const { data, isLoading } = useQuery({
        queryKey: ['staff', 'shared-login'],
        queryFn: staffApi.getSharedLogin,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        enabled: !!restaurantId && open,
    });

    // Update state when data is fetched
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
            toast.success("Waiter credentials updated!");
            setPassword("");
        },
        onError: (err: Error) => {
            toast.error(err.message || "Failed to update credentials");
        }
    });

    const handleSave = () => {
        if (!email) return toast.error("Email or phone is required");
        if (!hasSharedLogin && !password) return toast.error("Password is required for new shared login");
        setupMutation.mutate({ email, password: password || undefined });
    };

    const hasSharedLogin = !!(data?.email || data?.loginId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 gap-0 overflow-hidden outline-none border-none shadow-2xl">
                {/* Header */}
                <div className="p-6 pb-5 border-b border-slate-100 bg-gradient-to-br from-primary/5 to-white relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 h-8 w-8 hover:bg-white/50 rounded-xl"
                        onClick={() => onOpenChange(false)}
                    >
                        <X className="h-4 w-4 text-slate-400" />
                    </Button>

                    <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase mb-1">
                                Waiter Shared Credentials
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                                Manage the shared login that all waiters use to access the waiter portal
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    {isLoading ? (
                        <div className="py-2">
                            <FormSkeleton rows={2} />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Form Fields */}
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                                        Shared Email or Phone <span className="text-rose-500">*</span>
                                    </Label>
                                    <Input
                                        placeholder="e.g. waiters@yourrestaurant.com or +91 9876543210"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="h-11 rounded-xl border-slate-200 focus-visible:ring-primary"
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
                                        className="h-11 rounded-xl border-slate-200 focus-visible:ring-primary"
                                    />
                                    {!hasSharedLogin && <p className="text-[10px] text-slate-400 italic">Required for new credentials</p>}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    className="flex-1 h-11 rounded-xl font-bold uppercase tracking-widest text-slate-400 border-slate-100 hover:bg-slate-50"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={setupMutation.isPending}
                                    className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest shadow-lg shadow-primary/10"
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
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
