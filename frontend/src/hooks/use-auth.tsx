import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api-client";

interface User {
  id: string;
  email: string;
  phone?: string | null;
  role: 'OWNER' | 'MANAGER' | 'WAITER';
  tenantId: string;
  tenant_id?: string;
  allowed_restaurant_ids?: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, phone: string, password: string, confirmPassword: string, restaurantName: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  resendConfirmation: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  // signInWithGoogle: () => Promise<void>; // Commented out
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // V2 OTP-based auth methods
  registerWithOTP: (email: string, phone: string | null, password: string, restaurantName: string) => Promise<{ success: boolean; error?: string; message?: string; userId?: string; expiresAt?: string }>;
  verifySignupOTP: (email: string, otp: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  resendOTP: (email: string, type?: 'signup' | 'reset') => Promise<{ success: boolean; error?: string; message?: string }>;
  loginWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  forgotPasswordOTP: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  verifyResetOTP: (email: string, otp: string) => Promise<{ success: boolean; error?: string; resetToken?: string }>;
  resetPasswordWithToken: (resetToken: string, newPassword: string) => Promise<{ success: boolean; error?: string; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /**
   * Initialize session using cookies
   * Only check auth if not on login/register pages
   */
  useEffect(() => {
    const init = async () => {
      // Don't check auth if we're on public pages
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/auth/login') || 
          currentPath.startsWith('/auth/register') ||
          currentPath.startsWith('/auth/forgot-password')) {
        setLoading(false);
        return;
      }

      try {
        const res = await apiClient.get('/auth/me');
        
        // Check for error response
        if (res.error) {
          // Auth failed - clear user state and stop
          setUser(null);
          setLoading(false);
          return;
        }
        
        if (res.data?.user) {
          setUser(res.data.user);

          if (res.data.user.allowed_restaurant_ids?.length > 0) {
            apiClient.setRestaurantId(res.data.user.allowed_restaurant_ids[0]);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        // Network or other error - clear user state
        console.error('[Auth] Failed to initialize session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  /**
   * Sign in with email/phone and password
   */
  const signIn = useCallback(async (identifier: string, password: string) => {
    try {
      // Reset auth state before attempting login
      apiClient.resetAuthState();
      
      const response = await apiClient.post('/auth/login', {
        email: identifier,
        password,
      });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      if (response.data) {
        // Tokens are now set as httpOnly cookies by backend
        setUser(response.data.user);

        // Update local restaurant and tenant context
        if (response.data.user.allowed_restaurant_ids && response.data.user.allowed_restaurant_ids.length > 0) {
          const restaurantId = response.data.user.allowed_restaurant_ids[0];
          const tenantId = response.data.user.tenantId || response.data.user.tenant_id;
          console.log('[Auth] Setting restaurant ID on login:', restaurantId);
          apiClient.setRestaurantId(restaurantId);
          apiClient.setTenantId(tenantId);
        } else {
          console.warn('[Auth] User has no allowed_restaurant_ids');
        }

        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred during sign in'
      };
    }
  }, []);

  /**
   * Sign up with email, phone, and password
   */
  const signUp = useCallback(async (
    email: string,
    phone: string,
    password: string,
    confirmPassword: string,
    restaurantName: string
  ) => {
    try {
      const response = await apiClient.post('/auth/register', {
        email,
        phone: phone || null,
        password,
        restaurantName,
      });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      if (response.data?.success) {
        return { 
          success: true, 
          message: response.data.message 
        };
      }

      return { success: false, error: 'Registration failed' };
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred during registration'
      };
    }
  }, []);

  /**
   * Sign out and clear authentication state
   */
  const signOut = useCallback(async () => {
    try {
      // Call logout endpoint to revoke refresh token
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local auth state regardless of API call result
      apiClient.clearAuth();
      setUser(null);
      navigate("/auth/login");
    }
  }, [navigate]);

  /**
   * Refresh user data from the server
   * Token refresh is handled automatically by apiClient
   */
  const refreshUser = useCallback(async () => {
    try {
      // Just fetch latest user data - token refresh happens automatically
      const response = await apiClient.get('/auth/me');
      
      if (response.data?.user) {
        setUser(response.data.user);
        
        // Update restaurant ID if present
        if (response.data.user.allowed_restaurant_ids?.length > 0) {
          apiClient.setRestaurantId(response.data.user.allowed_restaurant_ids[0]);
        }
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // Don't clear user on refresh failure - let other mechanisms handle auth expiry
    }
  }, []);

  /**
   * Sign in with Google OAuth - COMMENTED OUT
   * Redirects to Google consent screen via backend
   */
  // const signInWithGoogle = useCallback(async () => {
  //   const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  //   // Redirect to backend OAuth endpoint which will redirect to Google
  //   window.location.href = `${apiUrl}/auth/login/google`;
  // }, []);

  /**
   * Resend confirmation email
   */
  const resendConfirmation = useCallback(async (email: string) => {
    try {
      const response = await apiClient.post('/auth/resend-register-otp', { email, type: 'signup' });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      if (response.data?.success) {
        return { success: true, message: response.data.message };
      }

      return { success: false, error: 'Failed to resend confirmation email' };
    } catch (error) {
      console.error('Resend confirmation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      };
    }
  }, []);

  // ==========================================
  // V2 OTP-BASED AUTH METHODS
  // ==========================================

  /**
   * Register with OTP verification (V2)
   */
  const registerWithOTP = useCallback(async (
    email: string,
    phone: string | null,
    password: string,
    restaurantName: string
  ) => {
    try {
      const response = await apiClient.post('/auth/register', {
        email,
        phone,
        password,
        restaurantName,
      });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      if (response.data?.success) {
        return {
          success: true,
          message: response.data.message,
          userId: response.data.userId,
          expiresAt: response.data.expiresAt,
        };
      }

      return { success: false, error: 'Registration failed' };
    } catch (error) {
      console.error('Register with OTP error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred during registration'
      };
    }
  }, []);

  /**
   * Verify signup OTP (V2)
   */
  const verifySignupOTP = useCallback(async (email: string, otp: string) => {
    try {
      const response = await apiClient.post('/auth/verify-register-otp', {
        email,
        otp,
      });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      if (response.data?.success && response.data?.user) {
        // Set user after successful verification
        setUser(response.data.user);

        // Update restaurant and tenant context
        if (response.data.user.allowed_restaurant_ids?.length > 0) {
          apiClient.setRestaurantId(response.data.user.allowed_restaurant_ids[0]);
          apiClient.setTenantId(response.data.user.tenantId || response.data.user.tenant_id);
        }

        return { success: true, user: response.data.user };
      }

      return { success: false, error: 'Verification failed' };
    } catch (error) {
      console.error('Verify OTP error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred during verification'
      };
    }
  }, []);

  /**
   * Resend OTP (V2) - Reuses same OTP if still valid
   */
  const resendOTP = useCallback(async (email: string, type: 'signup' | 'reset' = 'signup') => {
    try {
      const response = await apiClient.post('/auth/resend-otp', {
        email,
        type,
      });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      if (response.data?.success) {
        return {
          success: true,
          message: response.data.message,
        };
      }

      return { success: false, error: 'Failed to resend OTP' };
    } catch (error) {
      console.error('Resend OTP error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      };
    }
  }, []);

  /**
   * Login with email and password (V2)
   */
  const loginWithPassword = useCallback(async (email: string, password: string) => {
    try {
      apiClient.resetAuthState();

      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      if (response.data?.success && response.data?.user) {
        setUser(response.data.user);

        if (response.data.user.allowed_restaurant_ids?.length > 0) {
          apiClient.setRestaurantId(response.data.user.allowed_restaurant_ids[0]);
          apiClient.setTenantId(response.data.user.tenantId || response.data.user.tenant_id);
        }

        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('Login with password error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred during login'
      };
    }
  }, []);

  /**
   * Forgot password - Request OTP (V2)
   */
  const forgotPasswordOTP = useCallback(async (email: string) => {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      if (response.data?.success) {
        return {
          success: true,
          message: response.data.message,
        };
      }

      return { success: false, error: 'Failed to send reset code' };
    } catch (error) {
      console.error('Forgot password OTP error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      };
    }
  }, []);

  /**
   * Verify reset OTP (V2)
   */
  const verifyResetOTP = useCallback(async (email: string, otp: string) => {
    try {
      const response = await apiClient.post('/auth/verify-forgot-password-otp', {
        email,
        otp,
      });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      if (response.data?.success && response.data?.resetToken) {
        return {
          success: true,
          resetToken: response.data.resetToken,
        };
      }

      return { success: false, error: 'Verification failed' };
    } catch (error) {
      console.error('Verify reset OTP error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      };
    }
  }, []);

  /**
   * Reset password with verified token (V2)
   */
  const resetPasswordWithToken = useCallback(async (resetToken: string, newPassword: string) => {
    try {
      const response = await apiClient.post('/auth/reset-password', {
        resetToken,
        newPassword,
      });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      if (response.data?.success) {
        return {
          success: true,
          message: response.data.message,
        };
      }

      return { success: false, error: 'Password reset failed' };
    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      };
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signOut,
      refreshUser,
      resendConfirmation,
      // V2 methods
      registerWithOTP,
      verifySignupOTP,
      resendOTP,
      loginWithPassword,
      forgotPasswordOTP,
      verifyResetOTP,
      resetPasswordWithToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
