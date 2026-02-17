 import { Navigate } from "react-router-dom";
 import { useAuth } from "@/hooks/use-auth";
 import { AuthLayoutSkeleton } from "@/components/ui/skeleton";
 
 export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
 
   if (loading) {
     return <AuthLayoutSkeleton />;
   }
 
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }
 
  return <>{children}</>;
}
