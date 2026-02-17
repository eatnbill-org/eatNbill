import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import RestaurantStoryAnimation from "./RestaurantStoryAnimation";
import {
  Loader2,
  ArrowLeft,
  Mail,
  Lock,
  User,
  Phone,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
} from "lucide-react";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 15;

const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: totalSteps }).map((_, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;

        return (
          <>
            {/* <div key={stepNum} className="flex-1 flex flex-col gap-1">
            <div
              className={`h-1 w-full rounded-full transition-all duration-500 ${isCompleted
                ? "bg-emerald-500"
                : isActive
                  ? "bg-emerald-500"
                  : "bg-slate-200"
                }`}
            />
            <span
              className={`text-[9px] font-semibold uppercase tracking-wider text-center transition-colors ${isActive || isCompleted ? "text-emerald-600" : "text-slate-400"
                }`}
            >
              {stepNum === 1 ? "Register" : "Verify"}
            </span>
          </div> */}
          </>
        );
      })}
    </div>
  );
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { registerWithOTP, verifySignupOTP, resendOTP } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState<Date | null>(null);
  const [canResend, setCanResend] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    password: "",
    restaurantName: "",
  });

  // Calculate remaining time for OTP
  const getRemainingTime = () => {
    if (!otpExpiresAt) return null;
    const remaining = Math.floor((otpExpiresAt.getTime() - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.email || !formData.restaurantName || !formData.password) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Password strength validation
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (!/(?=.*[a-z])/.test(formData.password)) {
      toast.error("Password must contain at least one lowercase letter");
      return;
    }

    if (!/(?=.*[A-Z])/.test(formData.password)) {
      toast.error("Password must contain at least one uppercase letter");
      return;
    }

    if (!/(?=.*\d)/.test(formData.password)) {
      toast.error("Password must contain at least one number");
      return;
    }

    setLoading(true);

    try {
      const result = await registerWithOTP(
        formData.email,
        formData.phone || null,
        formData.password,
        formData.restaurantName
      );

      if (result.success) {
        setCurrentStep(2);
        if (result.expiresAt) {
          setOtpExpiresAt(new Date(result.expiresAt));
        }
        toast.success("Verification code sent!", {
          description: "Please check your email for the 6-digit code.",
          duration: 5000,
        });

        // Enable resend after 60 seconds
        setTimeout(() => setCanResend(true), 60000);
      } else {
        if (result.error?.toLowerCase().includes("rate limited")) {
          toast.error("Too many requests", {
            description: result.error,
            duration: 6000,
          });
        } else {
          toast.error(result.error || "Registration failed");
        }
      }
    } catch (error) {
      toast.error("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== OTP_LENGTH) {
      toast.error(`Please enter the ${OTP_LENGTH}-digit code`);
      return;
    }

    setLoading(true);

    try {
      const result = await verifySignupOTP(formData.email, otp);

      if (result.success) {
        toast.success("Email verified successfully!", {
          description: "Welcome to eatNbill! Redirecting to your dashboard...",
          duration: 3000,
        });
        setTimeout(() => navigate("/auth/post-login"), 1500);
      } else {
        if (result.error?.toLowerCase().includes("expired")) {
          toast.error("Code expired", {
            description: "Please request a new verification code.",
            action: {
              label: "Resend",
              onClick: handleResendOTP,
            },
            duration: 6000,
          });
        } else if (result.error?.toLowerCase().includes("attempts")) {
          toast.error("Too many failed attempts", {
            description: result.error,
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

  const handleResendOTP = async () => {
    if (!canResend && getRemainingTime()! > (OTP_EXPIRY_MINUTES * 60 - 120)) {
      toast.info("Please wait a moment before requesting another code");
      return;
    }

    setResendLoading(true);

    try {
      const result = await resendOTP(formData.email, "signup");

      if (result.success) {
        setCanResend(false);
        setOtp("");
        toast.success("Code resent!", {
          description: "Check your email for a new verification code.",
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
    <div className="min-h-screen flex">
      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 bg-white">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {currentStep === 1 ? (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Link
                  to="/auth/login"
                  className="inline-flex items-center text-sm text-slate-600 hover:text-emerald-600 transition-colors mb-2 group"
                >
                  <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                  Back to login
                </Link>

                <StepIndicator currentStep={currentStep} totalSteps={2} />

                <div className="mb-4">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 ">
                    Create your account
                  </h1>
                  {/* <p className="text-slate-600">
                    Join eatNbill and start managing your restaurant
                  </p> */}
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="restaurantName" className="text-slate-700">
                      <User className="w-4 h-4 inline mr-2" />
                      Restaurant Name *
                    </Label>
                    <Input
                      id="restaurantName"
                      placeholder="My Restaurant"
                      required
                      value={formData.restaurantName}
                      onChange={(e) =>
                        setFormData({ ...formData, restaurantName: e.target.value })
                      }
                      disabled={loading}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email Address *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      disabled={loading}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-slate-700">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Phone Number (Optional)
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1234567890"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      disabled={loading}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-700">
                      <Lock className="w-4 h-4 inline mr-2" />
                      Password *
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        disabled={loading}
                        className="h-11 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Must be 8+ characters with uppercase, lowercase, and number
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continue to Verification
                  </Button>
                </form>
                <p className="text-center text-sm text-slate-600 mt-6">
                  Have an account?{" "}
                  <Link
                    to="/auth/login"
                    className="text-emerald-600 font-semibold hover:underline"
                  >
                    Log in
                  </Link>
                </p>

              </motion.div>
            ) : (
              <motion.div
                key="verify"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <button
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center text-sm text-slate-600 hover:text-emerald-600 transition-colors mb-6 group"
                >
                  <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                  Back
                </button>

                <StepIndicator currentStep={currentStep} totalSteps={2} />

                <div className="mb-8 text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                    Check your email
                  </h1>
                  <p className="text-slate-600 mb-1">
                    We've sent a 6-digit code to
                  </p>
                  <p className="font-semibold text-slate-900">{formData.email}</p>
                  {otpExpiresAt && (
                    <p className="text-xs text-slate-500 mt-2 flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" />
                      Code expires in {OTP_EXPIRY_MINUTES} minutes
                    </p>
                  )}
                </div>

                <form onSubmit={handleVerifyOTP} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="text-slate-700">
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
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
                    disabled={loading || otp.length !== OTP_LENGTH}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? "Verifying..." : "Verify Email"}
                  </Button>

                  <div className="text-center">
                    <p className="text-sm text-slate-600 mb-2">
                      Didn't receive the code?
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleResendOTP}
                      disabled={resendLoading || !canResend}
                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    >
                      {resendLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {resendLoading ? "Sending..." : "Resend code"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* right side - Animation */}
      <div className="hidden lg:flex lg:w-1/2  bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 relative overflow-hidden">
        <RestaurantStoryAnimation />
      </div>

    </div>
  );
}
