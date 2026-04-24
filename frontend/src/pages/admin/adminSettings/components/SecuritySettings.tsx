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

type FieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

const PASSWORD_RULE =
  "Use at least 8 characters, including 1 uppercase letter, 1 lowercase letter, and 1 number.";

function validateNewPassword(newPassword: string, confirmPassword: string, currentPassword: string) {
  const errors: FieldErrors = {};

  if (!newPassword) {
    errors.newPassword = "New password is required.";
  } else if (newPassword.length < 8) {
    errors.newPassword = "Password must be at least 8 characters.";
  } else if (!/[a-z]/.test(newPassword)) {
    errors.newPassword = "Password must contain at least one lowercase letter.";
  } else if (!/[A-Z]/.test(newPassword)) {
    errors.newPassword = "Password must contain at least one uppercase letter.";
  } else if (!/\d/.test(newPassword)) {
    errors.newPassword = "Password must contain at least one number.";
  } else if (newPassword === currentPassword) {
    errors.newPassword = "New password must be different from current password.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Please confirm your new password.";
  } else if (confirmPassword !== newPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export function SecuritySettings() {
  const [open, setOpen] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isVerified, setIsVerified] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<FieldErrors>({});

  const resetForm = React.useCallback(() => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsVerifying(false);
    setIsVerified(false);
    setIsSubmitting(false);
    setErrors({});
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  const handleVerifyCurrentPassword = async () => {
    if (!currentPassword.trim()) {
      setErrors({ currentPassword: "Current password is required." });
      return;
    }

    setIsVerifying(true);
    setErrors((prev) => ({ ...prev, currentPassword: undefined }));

    try {
      const response = await apiClient.post("/auth/verify-password", {
        currentPassword,
      });

      if (response.error) {
        setErrors({ currentPassword: response.error.message || "Current password is incorrect." });
        return;
      }

      setIsVerified(true);
      toast.success("Current password verified.");
    } catch {
      setErrors({ currentPassword: "Failed to verify current password." });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleChangePassword = async () => {
    const validationErrors = validateNewPassword(newPassword, confirmPassword, currentPassword);
    if (Object.keys(validationErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...validationErrors }));
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await apiClient.patch("/auth/change-password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (response.error) {
        const message = response.error.message || "Failed to change password.";
        if (message.toLowerCase().includes("current password")) {
          setIsVerified(false);
          setErrors({ currentPassword: message });
        } else if (message.toLowerCase().includes("confirm")) {
          setErrors({ confirmPassword: message });
        } else {
          setErrors({ newPassword: message });
        }
        return;
      }

      toast.success("Password changed successfully.");
      handleOpenChange(false);
    } catch {
      toast.error("An error occurred while changing the password.");
    } finally {
      setIsSubmitting(false);
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

          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800">
                Change Password
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>
                  Verify your current password first, then set a new one.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => {
                      setCurrentPassword(event.target.value);
                      setErrors((prev) => ({ ...prev, currentPassword: undefined }));
                    }}
                    placeholder="Enter current password"
                    disabled={isVerifying || isSubmitting}
                  />
                  {errors.currentPassword ? (
                    <p className="text-sm text-red-600">{errors.currentPassword}</p>
                  ) : null}
                </div>

                {!isVerified ? (
                  <Button
                    type="button"
                    onClick={handleVerifyCurrentPassword}
                    disabled={isVerifying || isSubmitting}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isVerifying ? "Verifying..." : "Verify Current Password"}
                  </Button>
                ) : (
                  <>
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      Current password verified. You can now set a new password.
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(event) => {
                          setNewPassword(event.target.value);
                          setErrors((prev) => ({ ...prev, newPassword: undefined }));
                        }}
                        placeholder="Enter new password"
                        disabled={isSubmitting}
                      />
                      <p className="text-xs text-slate-500">{PASSWORD_RULE}</p>
                      {errors.newPassword ? (
                        <p className="text-sm text-red-600">{errors.newPassword}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => {
                          setConfirmPassword(event.target.value);
                          setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                        }}
                        placeholder="Confirm new password"
                        disabled={isSubmitting}
                      />
                      {errors.confirmPassword ? (
                        <p className="text-sm text-red-600">{errors.confirmPassword}</p>
                      ) : null}
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isVerifying || isSubmitting}>
                  Cancel
                </Button>
                {isVerified ? (
                  <Button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={isSubmitting}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isSubmitting ? "Updating..." : "Update Password"}
                  </Button>
                ) : null}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
