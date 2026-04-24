import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ShieldCheck, Lock } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

type Step = 1 | 2;

const PASSWORD_RULES = [
  "At least 8 characters",
  "At least 1 uppercase letter",
  "At least 1 lowercase letter",
  "At least 1 number",
];

export function SecuritySettings() {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>(1);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");

  const resetModal = React.useCallback(() => {
    setStep(1);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSubmitting(false);
    setError("");
  }, []);

  const validateNewPassword = React.useCallback(() => {
    if (newPassword.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (!/[A-Z]/.test(newPassword)) {
      return "Password must contain at least one uppercase letter.";
    }
    if (!/[a-z]/.test(newPassword)) {
      return "Password must contain at least one lowercase letter.";
    }
    if (!/\d/.test(newPassword)) {
      return "Password must contain at least one number.";
    }
    if (newPassword !== confirmPassword) {
      return "New password and confirmation do not match.";
    }
    if (newPassword === currentPassword) {
      return "New password must be different from current password.";
    }
    return "";
  }, [confirmPassword, currentPassword, newPassword]);

  const handleVerifyCurrentPassword = async () => {
    if (!currentPassword.trim()) {
      setError("Enter your current password.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await apiClient.post("/auth/verify-password", {
        currentPassword,
      });

      if (response.error) {
        setError(response.error.message || "Current password is incorrect.");
        return;
      }

      setStep(2);
      toast.success("Current password verified.");
    } catch {
      setError("Unable to verify current password.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    const validationError = validateNewPassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await apiClient.patch("/auth/change-password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (response.error) {
        setError(response.error.message || "Failed to change password.");
        return;
      }

      toast.success("Password changed successfully.");
      setOpen(false);
      resetModal();
    } catch {
      setError("Unable to change password right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="shadow-sm border-t-4 border-t-red-600 rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-red-600" /> Login Security
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-lg border">
          <div className="space-y-1">
            <h3 className="font-medium flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-500" /> Change Password
            </h3>
            <p className="text-sm text-slate-500">
              Verify your current password, then set a new one.
            </p>
          </div>

          <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen);
              if (!nextOpen) {
                resetModal();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800">
                Change Password
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>
                  {step === 1
                    ? "Step 1 of 2: confirm your current password before continuing."
                    : "Step 2 of 2: set and confirm your new password."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <span className={`h-2.5 w-2.5 rounded-full ${step === 1 ? "bg-red-600" : "bg-emerald-500"}`} />
                  <span>Verify current password</span>
                  <span className={`ml-2 h-2.5 w-2.5 rounded-full ${step === 2 ? "bg-red-600" : "bg-slate-300"}`} />
                  <span>Set new password</span>
                </div>

                {step === 1 ? (
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                      disabled={submitting}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        autoComplete="new-password"
                        disabled={submitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        autoComplete="new-password"
                        disabled={submitting}
                      />
                    </div>

                    <div className="rounded-md border bg-slate-50 p-3 text-xs text-slate-600">
                      {PASSWORD_RULES.map((rule) => (
                        <div key={rule}>{rule}</div>
                      ))}
                    </div>
                  </div>
                )}

                {error ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}
              </div>

              <DialogFooter>
                {step === 2 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStep(1);
                      setNewPassword("");
                      setConfirmPassword("");
                      setError("");
                    }}
                    disabled={submitting}
                  >
                    Back
                  </Button>
                ) : null}
                <Button
                  type="button"
                  onClick={step === 1 ? handleVerifyCurrentPassword : handleChangePassword}
                  disabled={submitting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {submitting
                    ? step === 1
                      ? "Verifying..."
                      : "Updating..."
                    : step === 1
                      ? "Verify Password"
                      : "Update Password"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
