import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
