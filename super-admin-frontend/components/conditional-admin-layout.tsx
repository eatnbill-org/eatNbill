'use client';

import { usePathname } from 'next/navigation';
import AdminLayout from './admin-layout';

const PUBLIC_PATHS = ['/login'];

/**
 * Render AdminLayout (sidebar + header shell) only for authenticated routes.
 * Lives at the root layout so it NEVER unmounts between page navigations —
 * eliminating the sidebar re-mount that previously triggered on every route change.
 */
export default function ConditionalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  return <AdminLayout>{children}</AdminLayout>;
}
