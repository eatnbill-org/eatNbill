import type { Metadata } from 'next';
import AdminLayout from '@/components/admin-layout';

export const metadata: Metadata = {
  title: 'Tenants',
  description: 'Manage all tenants on the EatnBill platform',
};

export default function TenantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
