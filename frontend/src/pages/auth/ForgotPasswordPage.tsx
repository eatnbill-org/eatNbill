import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Mail, CheckCircle2, KeyRound, Lock, Eye, EyeOff, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 15;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { forgotPasswordOTP, verifyResetOTP, resetPasswordWithToken, resendOTP } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'email' | 'otp' | 'password'>('email');
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [canResend, setCanResend] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const result = await forgotPasswordOTP(email);

      if (result.success) {
        setCurrentStep('otp');
        toast.success("Reset code sent!", {
          description: "Check your email for the 6-digit code.",
          duration: 5000,
        });

        // Enable resend after 60 seconds
        setTimeout(() => setCanResend(true), 60000);
      } else {
        toast.error(result.error || "Failed to send reset code");
      }
    } catch (error) {
      toast.error("Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== OTP_LENGTH) {
      toast.error(`Please enter the ${OTP_LENGTH}-digit code`);
      return;
    }

    setLoading(true);

    try {
      const result = await verifyResetOTP(email, otp);

      if (result.success && result.resetToken) {
        setResetToken(result.resetToken);
        setCurrentStep('password');
        toast.success("Code verified!", {
          description: "Now create a new password.",
        });
      } else {
        if (result.error?.toLowerCase().includes("expired")) {
          toast.error("Code expired", {
            description: "Please request a new reset code.",
            action: {
              label: "Resend",
              onClick: handleResendOTP,
            },
            duration: 6000,
          });
        } else {
          toast.error(result.error || "Invalid verification code");
        }
      }
    } catch (error) {
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Password validation
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (!/(?=.*[a-z])/.test(newPassword)) {
      toast.error("Password must contain at least one lowercase letter");
      return;
    }

    if (!/(?=.*[A-Z])/.test(newPassword)) {
      toast.error("Password must contain at least one uppercase letter");
      return;
    }

    if (!/(?=.*\d)/.test(newPassword)) {
      toast.error("Password must contain at least one number");
      return;
    }

    setLoading(true);

    try {
      const result = await resetPasswordWithToken(resetToken, newPassword);

      if (result.success) {
        toast.success("Password reset successfully!", {
          description: "You can now login with your new password.",
          duration: 5000,
        });
        setTimeout(() => navigate("/auth/login"), 2000);
      } else {
        toast.error(result.error || "Failed to reset password");
      }
    } catch (error) {
      toast.error("Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) {
      toast.info("Please wait a moment before requesting another code");
      return;
    }

    setResendLoading(true);

    try {
      const result = await resendOTP(email, 'reset');

      if (result.success) {
        setCanResend(false);
        setOtp("");
        toast.success("Code resent!", {
          description: "Check your email for a new reset code.",
          duration: 4000,
        });

        // Enable resend again after 60 seconds
        setTimeout(() => setCanResend(true), 60000);
      } else {
        toast.error(result.error || "Failed to resend code");
      }
    } catch (error) {
      toast.error("Failed to resend code");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <Link
              to="/auth/login"
              className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
              Back to login
            </Link>
          </div>
          <CardTitle className="text-2xl font-bold">
            {currentStep === 'email' && "Reset password"}
            {currentStep === 'otp' && "Verify code"}
            {currentStep === 'password' && "Create new password"}
          </CardTitle>
          <CardDescription>
            {currentStep === 'email' && "Enter your email to receive a reset code"}
            {currentStep === 'otp' && "Enter the 6-digit code sent to your email"}
            {currentStep === 'password' && "Choose a strong password for your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {currentStep === 'email' && (
              <motion.form
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleEmailSubmit}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="h-11"
                    autoFocus
                  />
                </div>

                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send reset code
                </Button>

                <div className="text-center text-sm text-muted-foreground">
                  Remember your password?{" "}
                  <Link to="/auth/login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </div>
              </motion.form>
            )}

            {currentStep === 'otp' && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    We've sent a code to
                  </p>
                  <p className="font-semibold">{email}</p>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    Code expires in {OTP_EXPIRY_MINUTES} minutes
                  </p>
                </div>

                <form onSubmit={handleOTPSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">
                      <KeyRound className="w-4 h-4 inline mr-2" />
                      Verification Code
                    </Label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={OTP_LENGTH}
                      placeholder="000000"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      disabled={loading}
                      className="h-12 text-center text-2xl font-semibold tracking-widest"
                      autoFocus
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11"
                    disabled={loading || otp.length !== OTP_LENGTH}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify code
                  </Button>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Didn't receive the code?
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleResendOTP}
                      disabled={resendLoading || !canResend}
                      className="text-primary hover:text-primary/90"
                    >
                      {resendLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Resend code
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {currentStep === 'password' && (
              <motion.form
                key="password"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handlePasswordSubmit}
                className="space-y-4"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Code verified successfully!
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">
                    <Lock className="w-4 h-4 inline mr-2" />
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                      className="h-11 pr-10"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Must be 8+ characters with uppercase, lowercase, and number
                  </p>
                </div>

                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reset password
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
