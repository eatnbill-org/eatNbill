import { Navigate } from "react-router-dom";
import { AuthLayoutSkeleton } from "@/components/ui/skeleton";
import { useStaffAuth } from "@/hooks/use-head-auth";

export default function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { staff, isLoading } = useStaffAuth();

  if (isLoading) {
    return <AuthLayoutSkeleton />;
  }

  if (!staff) {
    return <Navigate to="/auth/login" replace />;
  }

  if (staff.role !== 'MANAGER') {
    return <Navigate to="/head/orders" replace />;
  }

  return <>{children}</>;
}
