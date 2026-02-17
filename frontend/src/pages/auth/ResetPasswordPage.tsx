import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Lock, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { apiClient } from "@/lib/api-client";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    // Check for token in query params first
    let token = searchParams.get("access_token") || searchParams.get("token");

    // If not in query params, check URL hash (Supabase sends it in hash)
    if (!token) {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      token = params.get("access_token");
    }

    if (token) {
      setAccessToken(token);
    } else {
      toast.error("Invalid or missing reset token");
      setTimeout(() => navigate("/auth/forgot-password"), 2000);
    }
  }, [searchParams, navigate]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/(?=.*\d)/.test(password)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const passwordError = validatePassword(formData.newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!accessToken) {
      toast.error("Reset token is missing");
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post("/auth/reset-password", {
        accessToken,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      if (response.data?.success) {
        setSuccess(true);
        toast.success("Password reset successfully!");
        setTimeout(() => navigate("/auth/login"), 3000);
      } else if (response.error) {
        const errorMsg = response.error.message || "Failed to reset password";
        if (errorMsg.toLowerCase().includes('token')) {
          toast.error("Reset link expired or invalid", {
            description: "Please request a new password reset link.",
            duration: 5000,
          });
          setTimeout(() => navigate("/auth/forgot-password"), 3000);
        } else {
          toast.error(errorMsg);
        }
      }
    } catch (error: unknown) {
      const err = error as { error?: { message?: string } };
      const errorMsg = err?.error?.message || "Failed to reset password";
      if (errorMsg.toLowerCase().includes('token')) {
        toast.error("Reset link expired or invalid", {
          description: "Please request a new password reset link.",
          duration: 5000,
        });
        setTimeout(() => navigate("/auth/forgot-password"), 3000);
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!accessToken) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4">
      <Card className="w-full max-w-md shadow-sm">
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
          <CardTitle className="text-xl sm:text-2xl font-bold">
            {success ? "Password updated" : "Create new password"}
          </CardTitle>
          <CardDescription>
            {success
              ? "Your password has been reset successfully"
              : "Enter your new password below"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-9 pr-9"
                    required
                    value={formData.newPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, newPassword: e.target.value })
                    }
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters with uppercase, lowercase, and numbers
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-9 pr-9"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset password
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center space-y-4 py-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Password reset successful!</p>
                  <p className="text-sm text-muted-foreground">
                    You can now sign in with your new password
                  </p>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => navigate("/auth/login")}
              >
                Continue to login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
