import { toast } from 'sonner';

interface ToastOptions {
  description?: string;
  duration?: number;
}

export const notify = {
  // Success notifications
  success: (message: string, options?: ToastOptions) => {
    toast.success(message, {
      description: options?.description,
      duration: options?.duration || 4000,
    });
  },

  // Error notifications
  error: (message: string, options?: ToastOptions) => {
    toast.error(message, {
      description: options?.description,
      duration: options?.duration || 5000,
    });
  },

  // Warning notifications
  warning: (message: string, options?: ToastOptions) => {
    toast.warning(message, {
      description: options?.description,
      duration: options?.duration || 4000,
    });
  },

  // Info notifications
  info: (message: string, options?: ToastOptions) => {
    toast.info(message, {
      description: options?.description,
      duration: options?.duration || 4000,
    });
  },

  // Loading notifications
  loading: (message: string) => {
    return toast.loading(message);
  },

  // Dismiss toast
  dismiss: (toastId: string | number) => {
    toast.dismiss(toastId);
  },

  // Update toast
  update: (toastId: string | number, type: 'success' | 'error', message: string, options?: ToastOptions) => {
    toast[type](message, {
      id: toastId,
      description: options?.description,
      duration: options?.duration || 4000,
    });
  },

  // Promise-based toast
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    });
  },
};

// Predefined messages for common operations
export const messages = {
  auth: {
    loginSuccess: 'Welcome back!',
    loginError: 'Failed to sign in',
    logoutSuccess: 'Signed out successfully',
    sessionExpired: 'Your session has expired',
  },
  tenants: {
    createSuccess: 'Tenant created successfully',
    createError: 'Failed to create tenant',
    updateSuccess: 'Tenant updated successfully',
    updateError: 'Failed to update tenant',
    suspendSuccess: 'Tenant suspended successfully',
    suspendError: 'Failed to suspend tenant',
    activateSuccess: 'Tenant activated successfully',
    activateError: 'Failed to activate tenant',
    deleteSuccess: 'Tenant deleted successfully',
    deleteError: 'Failed to delete tenant',
    loadError: 'Failed to load tenants',
  },
  restaurants: {
    loadError: 'Failed to load restaurants',
    createSuccess: 'Restaurant created successfully',
    updateSuccess: 'Restaurant updated successfully',
    deleteSuccess: 'Restaurant deleted successfully',
  },
  users: {
    loadError: 'Failed to load users',
    updateSuccess: 'User updated successfully',
    updateError: 'Failed to update user',
  },
  audit: {
    loadError: 'Failed to load audit logs',
  },
  general: {
    loadError: 'Failed to load data',
    saveSuccess: 'Changes saved successfully',
    saveError: 'Failed to save changes',
    deleteConfirm: 'Are you sure? This action cannot be undone.',
    networkError: 'Network error. Please check your connection.',
    serverError: 'Server error. Please try again later.',
  },
};
