import type { Metadata } from 'next';
import AdminLayout from '@/components/admin-layout';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage Super Admin settings',
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
