import { PropsWithChildren } from "react";
import {
  AdminLayoutSkeleton,
  AuthLayoutSkeleton,
  CustomerLayoutSkeleton,
  ManagerLayoutSkeleton,
  WaiterLayoutSkeleton,
} from "@/components/ui/skeleton";
import { useScopeLoading } from "@/stores/ui";

type LayoutProps = PropsWithChildren<{ loading?: boolean }>;

function ContentFrame({ children }: PropsWithChildren) {
  return <div className="content-fade-in min-h-screen">{children}</div>;
}

export function AuthLayout({ loading, children }: LayoutProps) {
  const routeLoading = useScopeLoading("route");
  if (loading ?? routeLoading) return <AuthLayoutSkeleton />;
  return <ContentFrame>{children}</ContentFrame>;
}

export function AdminLayout({ loading, children }: LayoutProps) {
  const routeLoading = useScopeLoading("route");
  if (loading ?? routeLoading) return <AdminLayoutSkeleton />;
  return <ContentFrame>{children}</ContentFrame>;
}

export function ManagerLayout({ loading, children }: LayoutProps) {
  const routeLoading = useScopeLoading("route");
  if (loading ?? routeLoading) return <ManagerLayoutSkeleton />;
  return <ContentFrame>{children}</ContentFrame>;
}

export function WaiterLayout({ loading, children }: LayoutProps) {
  const routeLoading = useScopeLoading("route");
  if (loading ?? routeLoading) return <WaiterLayoutSkeleton />;
  return <ContentFrame>{children}</ContentFrame>;
}

export function CustomerLayout({ loading, children }: LayoutProps) {
  const routeLoading = useScopeLoading("route");
  if (loading ?? routeLoading) return <CustomerLayoutSkeleton />;
  return <ContentFrame>{children}</ContentFrame>;
}
