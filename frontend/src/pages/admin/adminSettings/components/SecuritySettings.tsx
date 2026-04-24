import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, KeyRound, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type PasswordErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

type EmailErrors = {
  currentPassword?: string;
  newEmail?: string;
  otp?: string;
};

const PASSWORD_RULE =
  "Use at least 8 characters, including 1 uppercase letter, 1 lowercase letter, and 1 number.";

function validateNewPassword(newPassword: string, confirmPassword: string, currentPassword: string) {
  const errors: PasswordErrors = {};

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

function ChangePasswordDialog() {
  const [open, setOpen] = React.useState(false);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isVerified, setIsVerified] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<PasswordErrors>({});

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
      const response = await apiClient.post("/auth/verify-password", { currentPassword });

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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100">
          Change Password
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (isVerified) {
              void handleChangePassword();
            } else {
              void handleVerifyCurrentPassword();
            }
          }}
          className="space-y-4"
        >
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
              {errors.currentPassword ? <p className="text-sm text-red-600">{errors.currentPassword}</p> : null}
            </div>

            {!isVerified ? (
              <Button
                type="submit"
                disabled={isVerifying || isSubmitting}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white"
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
                  {errors.newPassword ? <p className="text-sm text-red-600">{errors.newPassword}</p> : null}
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
                  {errors.confirmPassword ? <p className="text-sm text-red-600">{errors.confirmPassword}</p> : null}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isVerifying || isSubmitting}>
              Cancel
            </Button>
            {isVerified ? (
              <Button type="submit" disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800">
                {isSubmitting ? "Updating..." : "Update Password"}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangeEmailDialog() {
  const { user, refreshUser } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<"confirm" | "password" | "email" | "otp">("confirm");
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [pendingEmail, setPendingEmail] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<EmailErrors>({});

  const resetFlow = React.useCallback(() => {
    setStep("confirm");
    setCurrentPassword("");
    setNewEmail("");
    setOtp("");
    setPendingEmail("");
    setIsSubmitting(false);
    setErrors({});
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetFlow();
    }
  };

  const submitPasswordVerification = async () => {
    if (!currentPassword.trim()) {
      setErrors({ currentPassword: "Current password is required." });
      return;
    }

    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, currentPassword: undefined }));

    try {
      const response = await apiClient.post("/auth/verify-password", { currentPassword });
      if (response.error) {
        setErrors({ currentPassword: response.error.message || "Current password is incorrect." });
        return;
      }

      setStep("email");
      toast.success("Password verified. Enter your new email.");
    } catch {
      toast.error("Failed to verify current password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitNewEmail = async () => {
    const trimmedEmail = newEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrors({ newEmail: "New email is required." });
      return;
    }

    if (trimmedEmail === user?.email?.toLowerCase()) {
      setErrors({ newEmail: "New email must be different from current email." });
      return;
    }

    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, newEmail: undefined }));

    try {
      const response = await apiClient.post("/auth/change-email/request", {
        currentPassword,
        newEmail: trimmedEmail,
      });

      if (response.error) {
        const message = response.error.message || "Failed to start email change.";
        if (message.toLowerCase().includes("password")) {
          setStep("password");
          setErrors({ currentPassword: message });
        } else {
          setErrors({ newEmail: message });
        }
        return;
      }

      const nextPendingEmail = response.data?.pendingEmail || trimmedEmail;
      setPendingEmail(nextPendingEmail);
      setStep("otp");
      toast.success("OTP sent to your new email address.");
    } catch {
      toast.error("Failed to send OTP to the new email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitOtp = async () => {
    if (otp.length !== 6) {
      setErrors({ otp: "Enter the 6-digit OTP." });
      return;
    }

    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, otp: undefined }));

    try {
      const response = await apiClient.post("/auth/change-email/verify", { otp });
      if (response.error) {
        setErrors({ otp: response.error.message || "Invalid OTP." });
        return;
      }

      await refreshUser();
      toast.success("Email changed successfully.");
      handleOpenChange(false);
    } catch {
      toast.error("Failed to verify OTP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-rose-600 text-white hover:bg-rose-700">
          Change Email
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (step === "password") {
              void submitPasswordVerification();
            } else if (step === "email") {
              void submitNewEmail();
            } else if (step === "otp") {
              void submitOtp();
            }
          }}
          className="space-y-4"
        >
          <DialogHeader>
            <DialogTitle>Change Email Address</DialogTitle>
            <DialogDescription>
              This is a sensitive action. You will verify your password first, then confirm the new email with OTP.
            </DialogDescription>
          </DialogHeader>

          {step === "confirm" ? (
            <div className="space-y-4">
              <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800 [&>svg]:text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Danger zone</AlertTitle>
                <AlertDescription>
                  Changing your email affects future sign-ins, recovery flows, and account communication. Proceed only if you control the new inbox.
                </AlertDescription>
              </Alert>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">Current email</p>
                <p className="mt-1 text-base font-semibold text-slate-950">{user?.email || "No email found"}</p>
              </div>
            </div>
          ) : null}

          {step === "password" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Verify your current password before we allow an email change request.
              </div>
              <div className="space-y-2">
                <Label htmlFor="verify-email-password">Current Password</Label>
                <Input
                  id="verify-email-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => {
                    setCurrentPassword(event.target.value);
                    setErrors((prev) => ({ ...prev, currentPassword: undefined }));
                  }}
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                />
                {errors.currentPassword ? <p className="text-sm text-red-600">{errors.currentPassword}</p> : null}
              </div>
            </div>
          ) : null}

          {step === "email" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                Enter the new email address. We will send a 6-digit OTP there.
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">New Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(event) => {
                    setNewEmail(event.target.value);
                    setErrors((prev) => ({ ...prev, newEmail: undefined }));
                  }}
                  placeholder="name@example.com"
                  disabled={isSubmitting}
                />
                {errors.newEmail ? <p className="text-sm text-red-600">{errors.newEmail}</p> : null}
              </div>
            </div>
          ) : null}

          {step === "otp" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                OTP sent to <span className="font-semibold">{pendingEmail}</span>. Enter it below to finish the email change.
              </div>
              <div className="space-y-2">
                <Label>Verification Code</Label>
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => {
                    setOtp(value);
                    setErrors((prev) => ({ ...prev, otp: undefined }));
                  }}
                  disabled={isSubmitting}
                  containerClassName="justify-center"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                {errors.otp ? <p className="text-sm text-red-600 text-center">{errors.otp}</p> : null}
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>

            {step === "confirm" ? (
              <Button type="button" className="bg-rose-600 hover:bg-rose-700" onClick={() => setStep("password")}>
                I Understand, Continue
              </Button>
            ) : null}

            {step === "password" ? (
              <Button type="submit" disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800">
                {isSubmitting ? "Verifying..." : "Verify Password"}
              </Button>
            ) : null}

            {step === "email" ? (
              <Button type="submit" disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800">
                {isSubmitting ? "Sending OTP..." : "Send OTP"}
              </Button>
            ) : null}

            {step === "otp" ? (
              <Button type="submit" disabled={isSubmitting} className="bg-slate-900 hover:bg-slate-800">
                {isSubmitting ? "Verifying..." : "Verify OTP & Change Email"}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SecurityActionCard({
  icon,
  title,
  description,
  content,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  content?: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              {icon}
            </div>
            <div>
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="text-sm text-slate-500">{description}</p>
            </div>
          </div>
          {content}
        </div>
        <div className="flex shrink-0">{action}</div>
      </div>
    </div>
  );
}

export function SecuritySettings() {
  const { user } = useAuth();

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-950 to-slate-800 text-white">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5" />
          Security Settings
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Current email</p>
            <p className="mt-2 break-all text-sm font-semibold text-slate-900">{user?.email || "Not available"}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Access level</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{user?.role || "Unknown"}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Verification</p>
            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Authenticated session active
            </div>
          </div>
        </div>

        <SecurityActionCard
          icon={<Lock className="h-5 w-5" />}
          title="Change Password"
          description="Update your password after verifying your current one."
          content={
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Use a strong password and rotate it when access changes inside the restaurant team.
            </div>
          }
          action={<ChangePasswordDialog />}
        />

        <SecurityActionCard
          icon={<Mail className="h-5 w-5" />}
          title="Change Email"
          description="Protect sign-in and recovery access with a password-gated email update."
          content={
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              This is a sensitive action. You must confirm the danger prompt, verify your password, then verify OTP on the new email.
            </div>
          }
          action={<ChangeEmailDialog />}
        />

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-4 w-4 text-slate-500" />
            <p>
              Password changes and email changes are validated on the backend before account state is updated, so the session stays consistent after sensitive updates.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
