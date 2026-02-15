import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      // Check for errors first
      const errorParam = searchParams.get("error");
      const errorCode = searchParams.get("error_code");
      const errorDescription = searchParams.get("error_description");

      if (errorParam) {
        // Handle OTP expired error specially
        if (errorCode === "otp_expired") {
          setError("Your email verification link has expired. This can happen if the link is more than 60 seconds old or has already been used. Please request a new verification email from the login page.");
        } else {
          setError(errorDescription || errorParam);
        }
        return;
      }

      // Parse tokens from URL hash (Supabase implicit flow)
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const expiresIn = params.get("expires_in");
      const type = params.get("type");

      // Handle email confirmation callback
      if (type === "signup") {
        // Email confirmed successfully, redirect to login
        navigate("/auth/login?confirmed=true", { replace: true });
        return;
      }

      // If we have no tokens and no type, this might be an error case
      if (!accessToken && !type) {
        // Check hash for error params too
        const hashError = params.get("error");
        const hashErrorCode = params.get("error_code");
        const hashErrorDescription = params.get("error_description");
        
        if (hashError) {
          if (hashErrorCode === "otp_expired") {
            setError("Your email verification link has expired. This can happen if the link takes more than 60 seconds to open or has already been used. Please log in and request a new verification email.");
          } else {
            setError(hashErrorDescription || hashError);
          }
          return;
        }
        
        setError("No authentication data received");
        return;
      }

      // Google OAuth handling - COMMENTED OUT
      // Fallback: Check for PKCE flow (code in query params)
      // const code = searchParams.get("code");

      // if (!accessToken && !code) {
      //   setError("No authentication data received");
      //   return;
      // }

      // try {
      //   if (accessToken) {
      //     // Implicit flow: Validate token with backend to get user context
      //     const response = await apiClient.post('/auth/validate/google', {
      //       accessToken,
      //     });

      //     if (response.error) {
      //       setError(response.error.message);
      //       return;
      //     }

      //     if (response.data) {
      //       // Store Supabase tokens
      //       apiClient.setAccessToken(accessToken);
      //       if (refreshToken) {
      //         apiClient.setRefreshToken(refreshToken);
      //       }
      //       // Set restaurant context if available
      //       const allowed = response.data.user?.allowed_restaurant_ids;
      //       if (Array.isArray(allowed) && allowed.length > 0) {
      //         apiClient.setRestaurantId(allowed[0]);
      //       }
            
      //       // Redirect to post-login flow
      //       navigate("/auth/post-login", { replace: true });
      //     }
      //   } else if (code) {
      //     // PKCE flow: Exchange code for tokens via backend
      //     const response = await apiClient.get(`/auth/callback/google?code=${encodeURIComponent(code)}`);

      //     if (response.error) {
      //       setError(response.error.message);
      //       return;
      //     }

      //     if (response.data) {
      //       apiClient.setAccessToken(response.data.accessToken);
      //       apiClient.setRefreshToken(response.data.refreshToken);
      //       const allowed = response.data.user?.allowed_restaurant_ids;
      //       if (Array.isArray(allowed) && allowed.length > 0) {
      //         apiClient.setRestaurantId(allowed[0]);
      //       }
      //       navigate("/auth/post-login", { replace: true });
      //     }
      //   }
      // } catch (err) {
      //   console.error("OAuth callback error:", err);
      //   setError(err instanceof Error ? err.message : "Authentication failed");
      // }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (error) {
    const isExpired = error.toLowerCase().includes('expired');
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-destructive">
              {isExpired ? "Link Expired" : "Authentication Failed"}
            </CardTitle>
            <CardDescription className="text-sm">{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isExpired && (
              <div className="bg-muted p-3 rounded-lg text-xs text-muted-foreground">
                <p className="font-semibold mb-1">💡 What to do next:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to the login page</li>
                  <li>Try logging in with your email and password</li>
                  <li>If you get an "email not confirmed" error, you can request a new verification email</li>
                </ol>
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => navigate("/auth/login")}
              className="w-full"
            >
              {isExpired ? "Go to login" : "Return to login"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Completing sign in...</CardTitle>
          <CardDescription>Please wait while we authenticate you</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    </div>
  );
}
