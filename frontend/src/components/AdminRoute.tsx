import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { AuthLayoutSkeleton } from "@/components/ui/skeleton";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLayoutSkeleton />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  const staffData = localStorage.getItem('staff_data') || localStorage.getItem('waiter_data');
  if (staffData) {
    try {
      const staff = JSON.parse(staffData);
      if (staff?.role === 'MANAGER') {
        return <Navigate to="/manager/dashboard" replace />;
      }
    } catch {
      // ignore
    }
  }

  return <>{children}</>;
}
