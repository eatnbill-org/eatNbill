import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock, Mail } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function SecuritySettings() {
    const { user } = useAuth();
    const [loading, setLoading] = React.useState(false);

    const handlePasswordReset = async () => {
        if (!user?.email) {
            toast.error("User email not found.");
            return;
        }

        setLoading(true);
        try {
            const { error } = await apiClient.post('/auth/forgot-password', { email: user.email });

            if (error) {
                toast.error(error.message || "Failed to send reset email.");
            } else {
                toast.success(`Password reset link sent to ${user.email}`);
            }
        } catch (err) {
            toast.error("An error occurred while sending the reset link.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="shadow-sm border-t-4 border-t-red-600 rounded-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-red-600" /> Security & Access
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                    <div className="space-y-1">
                        <h3 className="font-medium flex items-center gap-2">
                            <Lock className="w-4 h-4 text-slate-500" /> Change Password
                        </h3>
                        <p className="text-sm text-slate-500">
                            Secure your account by updating your password regularly.
                        </p>
                    </div>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800">
                                Change Password
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Reset Password</AlertDialogTitle>
                                <AlertDialogDescription>
                                    We will send a password reset link to your registered email address <strong>{user?.email}</strong>.
                                    <br /><br />
                                    Are you sure you want to continue?
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handlePasswordReset} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
                                    {loading ? "Sending..." : "Send Reset Link"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>
    );
}
