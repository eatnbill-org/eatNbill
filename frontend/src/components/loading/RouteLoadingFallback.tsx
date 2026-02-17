import { useEffect } from "react";
import { AdminLayout, AuthLayout, CustomerLayout, ManagerLayout, WaiterLayout } from "@/layouts";
import { useLoadingStore, type LoadingScope } from "@/stores/ui/loading.store";

export type RouteRole = "auth" | "admin" | "manager" | "waiter" | "customer";

interface RouteLoadingFallbackProps {
  role: RouteRole;
}

const ROUTE_SCOPE: LoadingScope = "route";

function renderRoleSkeleton(role: RouteRole) {
  if (role === "auth") return <AuthLayout loading />;
  if (role === "admin") return <AdminLayout loading />;
  if (role === "manager") return <ManagerLayout loading />;
  if (role === "waiter") return <WaiterLayout loading />;
  return <CustomerLayout loading />;
}

export function RouteLoadingFallback({ role }: RouteLoadingFallbackProps) {
  const startLoading = useLoadingStore((state) => state.startLoading);
  const stopLoading = useLoadingStore((state) => state.stopLoading);

  useEffect(() => {
    const key = `route:${role}`;
    startLoading(key, ROUTE_SCOPE);

    return () => {
      stopLoading(key, ROUTE_SCOPE);
    };
  }, [role, startLoading, stopLoading]);

  return renderRoleSkeleton(role);
}
